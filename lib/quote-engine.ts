import {
  CAPITAL_LABELS,
  PRODUCT_LABELS,
  RESIDUAL_LABELS,
  type CapitalCompany,
  type ProductType,
  type QuoteConditions,
  type QuoteResult,
  type VehicleInfo,
} from "@shared/quote";

export interface CapitalRule {
  annualRate: number;
  residualAdjustment: number;
}

export type CapitalRules = Record<CapitalCompany, CapitalRule>;

/** Used only as a fallback while rates haven't loaded from the server yet. */
export const FALLBACK_CAPITAL_RULES: CapitalRules = {
  orix: { annualRate: 0.058, residualAdjustment: 0.01 },
  shinhan: { annualRate: 0.056, residualAdjustment: 0 },
  hana: { annualRate: 0.06, residualAdjustment: 0.005 },
};

const PRODUCT_RESIDUAL_ADJUSTMENT: Record<ProductType, number> = {
  rental: 0.02,
  operatingLease: 0.04,
  financeLease: -0.08,
};

const PRODUCT_UPFRONT_RATE: Record<ProductType, number> = {
  rental: 0,
  operatingLease: 0.02,
  financeLease: 0.08,
};

export const formatKrw = (value: number) =>
  `${Math.round(value).toLocaleString("ko-KR")}원`;

export function validateQuoteInput(vehicle: VehicleInfo) {
  const errors: string[] = [];
  if (!vehicle.brand.trim()) errors.push("브랜드를 입력해 주세요.");
  if (!vehicle.model.trim()) errors.push("모델명을 입력해 주세요.");
  if (vehicle.vehiclePrice <= 0) errors.push("차량 가격을 확인해 주세요.");
  if (vehicle.contractMonths < 12 || vehicle.contractMonths > 84) {
    errors.push("계약 기간은 12~84개월로 입력해 주세요.");
  }
  if (vehicle.annualMileage <= 0) errors.push("약정 주행거리를 확인해 주세요.");
  return errors;
}

export function calculateQuote(
  vehicle: VehicleInfo,
  conditions: QuoteConditions,
  rates: CapitalRules = FALLBACK_CAPITAL_RULES,
  generatedAt = new Date().toISOString(),
): QuoteResult {
  const errors = validateQuoteInput(vehicle);
  if (errors.length) throw new Error(errors[0]);

  const effectiveVehiclePrice = Math.max(
    vehicle.vehiclePrice - Math.max(conditions.discountAmount, 0),
    0,
  );
  const capitalRule = rates[conditions.capitalCompany];
  const baseResidual = conditions.residualMode === "maximum" ? 0.5 : 0.42;
  const mileageAdjustment = vehicle.annualMileage >= 30_000 ? -0.04 : vehicle.annualMileage >= 20_000 ? -0.02 : 0;
  const residualRate = Math.min(
    0.65,
    Math.max(
      0.15,
      baseResidual +
        capitalRule.residualAdjustment +
        PRODUCT_RESIDUAL_ADJUSTMENT[conditions.productType] +
        mileageAdjustment,
    ),
  );
  const residualValue = Math.round(effectiveVehiclePrice * residualRate);
  const monthlyRate =
    (capitalRule.annualRate + Math.max(conditions.additionalFeeRate, 0) / 100) / 12;
  const months = vehicle.contractMonths;
  const discountFactor = Math.pow(1 + monthlyRate, months);
  const financedPresentValue = Math.max(
    effectiveVehiclePrice - residualValue / discountFactor,
    0,
  );
  const monthlyPayment = Math.round(
    monthlyRate === 0
      ? (effectiveVehiclePrice - residualValue) / months
      : (financedPresentValue * monthlyRate) /
          (1 - Math.pow(1 + monthlyRate, -months)),
  );
  const upfrontCost = Math.round(
    effectiveVehiclePrice * PRODUCT_UPFRONT_RATE[conditions.productType],
  );
  const totalPayment = monthlyPayment * months + upfrontCost + residualValue;

  const vehicleName = [vehicle.brand, vehicle.model, vehicle.trim]
    .filter(Boolean)
    .join(" ");
  const message = [
    "안녕하세요, 유니디아입니다.",
    "요청하신 차량 견적을 안내드립니다.",
    "",
    `• 차량: ${vehicleName}`,
    `• 상품: ${PRODUCT_LABELS[conditions.productType]} / ${CAPITAL_LABELS[conditions.capitalCompany]}`,
    `• 계약: ${months}개월 / 연 ${vehicle.annualMileage.toLocaleString("ko-KR")}km`,
    `• 초기비용: ${formatKrw(upfrontCost)}`,
    `• 예상 월 납입금: ${formatKrw(monthlyPayment)}`,
    `• 잔가 방식: ${RESIDUAL_LABELS[conditions.residualMode]}`,
    "",
    "본 내용은 상담용 예상 견적으로 실제 심사 결과, 금리, 세금, 보험 및 차량 출고 조건에 따라 달라질 수 있습니다. 금융상품 계약 전 상품설명서와 약관을 확인하시고, 충분한 설명을 받으시기 바랍니다. 본 견적은 고객 본인 확인용이며 무단 재배포를 삼가 주세요.",
  ].join("\n");

  return {
    monthlyPayment,
    upfrontCost,
    residualValue,
    totalPayment,
    effectiveVehiclePrice,
    generatedAt,
    message,
  };
}
