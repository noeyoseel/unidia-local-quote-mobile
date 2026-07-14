import { z } from "zod";

export type QuoteStatus = "consulting" | "completed";
export type ProductType = "rental" | "operatingLease" | "financeLease";
export type CapitalCompany = "orix" | "shinhan" | "hana";
export type ResidualMode = "standard" | "maximum";

export const QUOTE_STATUS_VALUES = ["consulting", "completed"] as const;
export const PRODUCT_TYPE_VALUES = ["rental", "operatingLease", "financeLease"] as const;
export const CAPITAL_COMPANY_VALUES = ["orix", "shinhan", "hana"] as const;
export const RESIDUAL_MODE_VALUES = ["standard", "maximum"] as const;

export interface VehicleInfo {
  brand: string;
  model: string;
  trim: string;
  vehiclePrice: number;
  contractMonths: number;
  annualMileage: number;
  /** Free-text consultation note. Never auto-filled by AI extraction. */
  customerMemo: string;
  /**
   * Personal data — kept as its own field (not folded into customerMemo) and
   * only ever entered by hand. AI extraction is never asked to read this
   * from the capture image.
   */
  customerPhone: string;
  confidence: number;
}

export interface QuoteConditions {
  productType: ProductType;
  /** Companies selected for side-by-side comparison. */
  capitalCompanies: CapitalCompany[];
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

export interface CompareResult {
  company: CapitalCompany;
  result: QuoteResult;
}

export interface QuoteRecord {
  id: string;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  imageUri?: string;
  vehicle: VehicleInfo;
  conditions: QuoteConditions;
  /** All companies' results from the comparison step. */
  compareResults?: CompareResult[];
  /** Which company the counselor picked to finalize for the customer. */
  selectedCompany?: CapitalCompany;
  /** The finalized result for selectedCompany (kept top-level for backward-compatible display). */
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
  customerPhone: "",
  confidence: 0,
};

export const DEFAULT_CONDITIONS: QuoteConditions = {
  productType: "rental",
  capitalCompanies: ["shinhan"],
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

export const vehicleInfoSchema = z.object({
  brand: z.string(),
  model: z.string(),
  trim: z.string(),
  vehiclePrice: z.number().nonnegative(),
  contractMonths: z.number().int().nonnegative(),
  annualMileage: z.number().int().nonnegative(),
  customerMemo: z.string(),
  customerPhone: z.string(),
  confidence: z.number().min(0).max(1),
});

export const quoteConditionsSchema = z.object({
  productType: z.enum(PRODUCT_TYPE_VALUES),
  capitalCompanies: z.array(z.enum(CAPITAL_COMPANY_VALUES)).min(1),
  discountAmount: z.number(),
  additionalFeeRate: z.number(),
  residualMode: z.enum(RESIDUAL_MODE_VALUES),
});

export const quoteResultSchema = z.object({
  monthlyPayment: z.number(),
  upfrontCost: z.number(),
  residualValue: z.number(),
  totalPayment: z.number(),
  effectiveVehiclePrice: z.number(),
  generatedAt: z.string(),
  message: z.string(),
});

export const compareResultSchema = z.object({
  company: z.enum(CAPITAL_COMPANY_VALUES),
  result: quoteResultSchema,
});

export const quoteRecordInputSchema = z.object({
  id: z.string(),
  status: z.enum(QUOTE_STATUS_VALUES),
  createdAt: z.string(),
  updatedAt: z.string(),
  imageUri: z.string().optional(),
  vehicle: vehicleInfoSchema,
  conditions: quoteConditionsSchema,
  compareResults: z.array(compareResultSchema).optional(),
  selectedCompany: z.enum(CAPITAL_COMPANY_VALUES).optional(),
  result: quoteResultSchema.optional(),
});
