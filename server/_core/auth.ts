import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";
import { getUserByOpenId, upsertUser } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

function buildUserResponse(user: NonNullable<Awaited<ReturnType<typeof getUserByOpenId>>>) {
  return {
    id: user.id,
    openId: user.openId,
    name: user.name,
    email: user.email,
    loginMethod: user.loginMethod,
    lastSignedIn: (user.lastSignedIn ?? new Date()).toISOString(),
  };
}

function findMatchingAccount(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return ENV.authUsers.find(
    (account) => account.email.toLowerCase() === normalizedEmail && account.password === password,
  );
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      res.status(400).json({ error: "이메일과 비밀번호를 입력해 주세요." });
      return;
    }

    const account = findMatchingAccount(email, password);
    if (!account) {
      res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
      return;
    }

    try {
      await upsertUser({
        openId: account.email,
        name: account.email,
        email: account.email,
        loginMethod: "password",
        lastSignedIn: new Date(),
      });
      const user = await getUserByOpenId(account.email);
      if (!user) {
        res.status(500).json({ error: "계정 정보를 저장하지 못했습니다." });
        return;
      }

      const sessionToken = await sdk.createSessionToken(account.email, {
        name: account.email,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ sessionToken, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      res.status(500).json({ error: "로그인 처리 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  // Get current authenticated user - works with both cookie (web) and Bearer token (native)
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch (error) {
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });
}
