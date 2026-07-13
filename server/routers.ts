import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";

import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const inquiryExtractionSchema = z.object({
  brand: z.string(),
  model: z.string(),
  trim: z.string(),
  vehiclePrice: z.number().nonnegative(),
  contractMonths: z.number().int().nonnegative(),
  annualMileage: z.number().int().nonnegative(),
  customerMemo: z.string(),
  confidence: z.number().min(0).max(1),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  quote: router({
    extractInquiry: publicProcedure
      .input(
        z.object({
          imageDataUrl: z.string().min(100).max(12_000_000),
        }),
      )
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          model: "gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "당신은 한국 자동차 장기렌트·리스 상담 문의 캡처에서 정보를 정확히 구조화하는 분석기입니다. 화면에 없는 값은 추측하지 말고 빈 문자열 또는 0으로 반환하세요. 차량 가격은 원 단위 숫자, 계약기간은 개월, 약정 주행거리는 연간 km로 정규화하세요.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "이 문의 캡처에서 브랜드, 모델, 세부 트림, 총 차량 금액, 계약 기간, 연간 약정 주행거리, 고객 관련 짧은 메모를 추출하세요. confidence는 전체 추출 신뢰도를 0~1로 반환하세요.",
                },
                {
                  type: "image_url",
                  image_url: { url: input.imageDataUrl, detail: "high" },
                },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "vehicle_inquiry",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  brand: { type: "string" },
                  model: { type: "string" },
                  trim: { type: "string" },
                  vehiclePrice: { type: "number" },
                  contractMonths: { type: "number" },
                  annualMileage: { type: "number" },
                  customerMemo: { type: "string" },
                  confidence: { type: "number" },
                },
                required: [
                  "brand",
                  "model",
                  "trim",
                  "vehiclePrice",
                  "contractMonths",
                  "annualMileage",
                  "customerMemo",
                  "confidence",
                ],
                additionalProperties: false,
              },
            },
          },
          maxTokens: 1200,
        });

        const content = response.choices[0]?.message?.content;
        if (typeof content !== "string") {
          throw new Error("이미지 분석 결과를 읽지 못했습니다.");
        }

        return inquiryExtractionSchema.parse(JSON.parse(content));
      }),
  }),
});

export type AppRouter = typeof appRouter;
