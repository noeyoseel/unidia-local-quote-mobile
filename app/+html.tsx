import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const SITE_URL = "https://unidia-local-quote-mobile-production.up.railway.app";
const SITE_TITLE = "유니디아 견적 플로우";
const SITE_DESCRIPTION = "캡처 한 장으로 캐피탈사별 견적을 비교하는 승인 계정 전용 상담 도구입니다.";

/**
 * Root HTML wrapper for the web export (see https://docs.expo.dev/router/reference/static-rendering/#root-html).
 * This is the one place to add head tags like Open Graph previews, since
 * screen components only render into <body>.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <title>{SITE_TITLE}</title>
        <meta name="description" content={SITE_DESCRIPTION} />

        {/* Open Graph (KakaoTalk, Slack, iMessage, Facebook, ...) */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="ko_KR" />

        {/* Twitter/X card (falls back to Open Graph tags above if omitted, but explicit is safer) */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={SITE_TITLE} />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />

        {/*
          Disable body scrolling on web. This makes ScrollView components
          take up the entire screen. Set style={{ overflow: 'scroll' }} on
          root View components to enable native scrolling on web.
        */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
