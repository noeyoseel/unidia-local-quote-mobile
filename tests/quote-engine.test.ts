import { describe, expect, it } from "vitest";

import { calculateQuote, FALLBACK_CAPITAL_RULES, validateQuoteInput } from "@/lib/quote-engine";
import { DEFAULT_CONDITIONS, EMPTY_VEHICLE, type VehicleInfo } from "@shared/quote";

const vehicle: VehicleInfo = {
  ...EMPTY_VEHICLE,
  brand: "현대",
  model: "그랜저",
  trim: "캘리그래피",
  vehiclePrice: 52_000_000,
  contractMonths: 48,
  annualMileage: 20_000,
};

describe("quote engine", () => {
  it("produces a deterministic rental estimate and customer message", () => {
    const result = calculateQuote(
      vehicle,
      DEFAULT_CONDITIONS,
      FALLBACK_CAPITAL_RULES,
      "2026-07-13T00:00:00.000Z",
    );

    expect(result.monthlyPayment).toBeGreaterThan(0);
    expect(result.residualValue).toBeGreaterThan(0);
    expect(result.effectiveVehiclePrice).toBe(52_000_000);
    expect(result.generatedAt).toBe("2026-07-13T00:00:00.000Z");
    expect(result.message).toContain("현대 그랜저 캘리그래피");
    expect(result.message).toContain("금융상품 계약 전");
  });

  it("applies discount and raises residual value in maximum mode", () => {
    const standard = calculateQuote(vehicle, DEFAULT_CONDITIONS);
    const adjusted = calculateQuote(vehicle, {
      ...DEFAULT_CONDITIONS,
      discountAmount: 2_000_000,
      residualMode: "maximum",
    });

    expect(adjusted.effectiveVehiclePrice).toBe(50_000_000);
    expect(adjusted.monthlyPayment).toBeLessThan(standard.monthlyPayment);
    expect(adjusted.residualValue / adjusted.effectiveVehiclePrice).toBeGreaterThan(
      standard.residualValue / standard.effectiveVehiclePrice,
    );
  });

  it("reflects product-specific upfront cost", () => {
    const rental = calculateQuote(vehicle, { ...DEFAULT_CONDITIONS, productType: "rental" });
    const financeLease = calculateQuote(vehicle, {
      ...DEFAULT_CONDITIONS,
      productType: "financeLease",
    });

    expect(rental.upfrontCost).toBe(0);
    expect(financeLease.upfrontCost).toBe(Math.round(vehicle.vehiclePrice * 0.08));
  });

  it("rejects incomplete vehicle data", () => {
    const invalid = { ...vehicle, brand: "", vehiclePrice: 0, contractMonths: 6 };
    const errors = validateQuoteInput(invalid);

    expect(errors).toContain("브랜드를 입력해 주세요.");
    expect(errors).toContain("차량 가격을 확인해 주세요.");
    expect(errors).toContain("계약 기간은 12~84개월로 입력해 주세요.");
    expect(() => calculateQuote(invalid, DEFAULT_CONDITIONS)).toThrow("브랜드를 입력해 주세요.");
  });
});
