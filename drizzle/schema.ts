import { double, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import type { QuoteConditions, QuoteResult, VehicleInfo } from "../shared/quote";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Login identifier for this user. Currently the account's email address. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Monthly-updatable capital company rate table. Replaces the hardcoded
 * CAPITAL_RULES constants so both users can update rates from the app
 * instead of editing code.
 */
export const capitalRates = mysqlTable("capitalRates", {
  id: int("id").autoincrement().primaryKey(),
  company: mysqlEnum("company", ["orix", "shinhan", "hana"]).notNull().unique(),
  annualRate: double("annualRate").notNull(),
  residualAdjustment: double("residualAdjustment").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedByEmail: varchar("updatedByEmail", { length: 320 }),
});

export type CapitalRate = typeof capitalRates.$inferSelect;
export type InsertCapitalRate = typeof capitalRates.$inferInsert;

/**
 * Quote/consultation history. Stored server-side (not device-local) so
 * both counselors can see each other's records.
 */
export const quoteRecords = mysqlTable("quoteRecords", {
  id: varchar("id", { length: 64 }).primaryKey(),
  status: mysqlEnum("status", ["consulting", "completed"]).default("consulting").notNull(),
  creatorEmail: varchar("creatorEmail", { length: 320 }),
  imageUri: text("imageUri"),
  vehicle: json("vehicle").$type<VehicleInfo>().notNull(),
  conditions: json("conditions").$type<QuoteConditions>().notNull(),
  result: json("result").$type<QuoteResult>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuoteRecordRow = typeof quoteRecords.$inferSelect;
export type InsertQuoteRecordRow = typeof quoteRecords.$inferInsert;
