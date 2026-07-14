import { describe, expect, it } from "vitest";

import {
  calculateQuote,
  compareQuotes,
  FALLBACK_CAPITAL_RULES,
  validateQuoteConditions,
  validateQuoteInput,
} from "@/lib/quote-engine";
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
      "shinhan",
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
    const standard = calculateQuote(vehicle, DEFAULT_CONDITIONS, "shinhan");
    const adjusted = calculateQuote(
      vehicle,
      { ...DEFAULT_CONDITIONS, discountAmount: 2_000_000, residualMode: "maximum" },
      "shinhan",
    );

    expect(adjusted.effectiveVehiclePrice).toBe(50_000_000);
    expect(adjusted.monthlyPayment).toBeLessThan(standard.monthlyPayment);
    expect(adjusted.residualValue / adjusted.effectiveVehiclePrice).toBeGreaterThan(
      standard.residualValue / standard.effectiveVehiclePrice,
    );
  });

  it("reflects product-specific upfront cost", () => {
    const rental = calculateQuote(vehicle, { ...DEFAULT_CONDITIONS, productType: "rental" }, "shinhan");
    const financeLease = calculateQuote(
      vehicle,
      { ...DEFAULT_CONDITIONS, productType: "financeLease" },
      "shinhan",
    );

    expect(rental.upfrontCost).toBe(0);
    expect(financeLease.upfrontCost).toBe(Math.round(vehicle.vehiclePrice * 0.08));
  });

  it("rejects incomplete vehicle data", () => {
    const invalid = { ...vehicle, brand: "", vehiclePrice: 0, contractMonths: 6 };
    const errors = validateQuoteInput(invalid);

    expect(errors).toContain("브랜드를 입력해 주세요.");
    expect(errors).toContain("차량 가격을 확인해 주세요.");
    expect(errors).toContain("계약 기간은 12~84개월로 입력해 주세요.");
    expect(() => calculateQuote(invalid, DEFAULT_CONDITIONS, "shinhan")).toThrow("브랜드를 입력해 주세요.");
  });

  it("blocks discounts above the margin-protection threshold", () => {
    const overDiscounted = { ...DEFAULT_CONDITIONS, discountAmount: 20_000_000 };
    const errors = validateQuoteConditions(vehicle, overDiscounted);

    expect(errors[0]).toContain("20%를 초과합니다");
    expect(() => calculateQuote(vehicle, overDiscounted, "shinhan")).toThrow("20%를 초과합니다");
  });

  it("allows a discount right at the threshold and blocks a negative discount", () => {
    const atThreshold = { ...DEFAULT_CONDITIONS, discountAmount: vehicle.vehiclePrice * 0.2 };
    expect(validateQuoteConditions(vehicle, atThreshold)).toHaveLength(0);

    const negativeDiscount = { ...DEFAULT_CONDITIONS, discountAmount: -1 };
    expect(validateQuoteConditions(vehicle, negativeDiscount)[0]).toContain("0 이상");
  });

  it("rejects a negative additional fee rate", () => {
    const errors = validateQuoteConditions(vehicle, { ...DEFAULT_CONDITIONS, additionalFeeRate: -1 });
    expect(errors[0]).toContain("수수료");
  });

  it("blocks the whole comparison batch when the shared discount is over the limit", () => {
    const overDiscounted: typeof DEFAULT_CONDITIONS = {
      ...DEFAULT_CONDITIONS,
      capitalCompanies: ["orix", "shinhan", "hana"],
      discountAmount: 20_000_000,
    };
    expect(() => compareQuotes(vehicle, overDiscounted)).toThrow("20%를 초과합니다");
  });
});
