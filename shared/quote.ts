export type QuoteStatus = "consulting" | "completed";
export type ProductType = "rental" | "operatingLease" | "financeLease";
export type CapitalCompany = "orix" | "shinhan" | "hana";
export type ResidualMode = "standard" | "maximum";

export interface VehicleInfo {
  brand: string;
  model: string;
  trim: string;
  vehiclePrice: number;
  contractMonths: number;
  annualMileage: number;
  customerMemo: string;
  confidence: number;
}

export interface QuoteConditions {
  productType: ProductType;
  capitalCompany: CapitalCompany;
  discountAmount: number;
  additionalFeeRate: number;
  residualMode: ResidualMode;
}

export interface QuoteResult {
  monthlyPayment: number;
  upfrontCost: number;
  residualValue: number;
  totalPayment: number;
  effectiveVehiclePrice: number;
  generatedAt: string;
  message: string;
}

export interface QuoteRecord {
  id: string;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  imageUri?: string;
  vehicle: VehicleInfo;
  conditions: QuoteConditions;
  result?: QuoteResult;
}

export const EMPTY_VEHICLE: VehicleInfo = {
  brand: "",
  model: "",
  trim: "",
  vehiclePrice: 0,
  contractMonths: 48,
  annualMileage: 20_000,
  customerMemo: "",
  confidence: 0,
};

export const DEFAULT_CONDITIONS: QuoteConditions = {
  productType: "rental",
  capitalCompany: "shinhan",
  discountAmount: 0,
  additionalFeeRate: 0,
  residualMode: "standard",
};

export const PRODUCT_LABELS: Record<ProductType, string> = {
  rental: "장기렌트",
  operatingLease: "운용리스",
  financeLease: "금융리스",
};

export const CAPITAL_LABELS: Record<CapitalCompany, string> = {
  orix: "오릭스",
  shinhan: "신한카드",
  hana: "하나캐피탈",
};

export const RESIDUAL_LABELS: Record<ResidualMode, string> = {
  standard: "기본잔가",
  maximum: "최대잔가",
};
