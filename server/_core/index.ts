import "dotenv/config";
import express from "express";
import fs from "fs";
import { createServer } from "http";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes } from "./auth";
import { appRouter } from "../routers";
import { createContext } from "./context";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// server/_core/index.ts is bundled to dist/index.js, so the project root is one level up from dist.
const WEB_BUILD_DIR = path.resolve(__dirname, "../web-build");

const SITE_TITLE = "유니디아 견적 플로우";
const SITE_DESCRIPTION = "캡처 한 장으로 캐피탈사별 견적을 비교하는 승인 계정 전용 상담 도구입니다.";

/**
 * The web export is built with output "single" (plain SPA) — Expo Router's
 * +html.tsx head customization only applies to per-route static rendering,
 * which isn't used here, so head tags (title, Open Graph previews) are
 * injected into the built index.html directly instead.
 */
function buildIndexHtml(siteUrl: string): string {
  const raw = fs.readFileSync(path.join(WEB_BUILD_DIR, "index.html"), "utf-8");
  const ogImage = `${siteUrl}/og-image.png`;
  const headExtra = `
    <meta name="description" content="${SITE_DESCRIPTION}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${SITE_TITLE}" />
    <meta property="og:description" content="${SITE_DESCRIPTION}" />
    <meta property="og:url" content="${siteUrl}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:locale" content="ko_KR" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${SITE_TITLE}" />
    <meta name="twitter:description" content="${SITE_DESCRIPTION}" />
    <meta name="twitter:image" content="${ogImage}" />
  </head>`;
  return raw.replace('<html lang="en">', '<html lang="ko">').replace("</head>", headExtra);
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  // In production, serve the exported web build (see `pnpm build:web`) from
  // this same service so counselors just visit one URL on their phones.
  if (process.env.NODE_ENV === "production") {
    // index: false so index.html always goes through buildIndexHtml() below
    // (for the OG tag injection) instead of being served as a static file.
    app.use(express.static(WEB_BUILD_DIR, { extensions: ["html"], index: false }));
    // This is a single-page app (output: "single"): every non-API route
    // serves the same index.html and the client-side router takes over.
    app.get(/^(?!\/api).*/, (req, res) => {
      const siteUrl = `${req.protocol}://${req.get("host")}`;
      res.set("Content-Type", "text/html");
      res.send(buildIndexHtml(siteUrl));
    });
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
