
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  guestId: text("guest_id").notNull().unique(), // This will be the phone number (UID)
  displayName: text("display_name"), // User's name
  balance: integer("balance").default(0).notNull(),
  keyCount: integer("key_count").default(0).notNull(),
  isBlocked: boolean("is_blocked").default(false).notNull(),
  paymentStatus: text("payment_status").default("none").notNull(), // 'none', 'scheduled', 'pending', 'received', 'not_received'
  paymentScheduledAt: timestamp("payment_scheduled_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const verificationPool = pgTable("verification_pool", {
  id: serial("id").primaryKey(),
  privateKey: text("private_key").notNull(),
  verifyUrl: text("verify_url").notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  addedBy: text("added_by").default("Unknown").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const submittedNumbers = pgTable("submitted_numbers", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  verifiedCount: integer("verified_count").default(0).notNull(),
  submittedBy: text("submitted_by").default("Unknown").notNull(),
  paymentNumber: text("payment_number"),
  paymentMethod: text("payment_method"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const resetHistory = pgTable("reset_history", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  verifiedCount: integer("verified_count").default(0).notNull(),
  submittedBy: text("submitted_by").default("Unknown").notNull(),
  paymentNumber: text("payment_number"),
  paymentMethod: text("payment_method"),
  resetAt: timestamp("reset_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'earning' or 'withdrawal'
  amount: integer("amount").notNull(),
  details: text("details"), // private key or withdrawal number/method
  status: text("status").default("completed"), // completed, pending
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).pick({
  guestId: true,
  displayName: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

// === TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// === API CONTRACT TYPES ===
export type LoginRequest = { guestId: string; displayName?: string };
export type SubmitKeyRequest = { privateKey: string };
export type WithdrawRequest = { method: "bkash" | "nagad"; number: string; amount: number };

export type UserResponse = User;
export type TransactionResponse = Transaction;
