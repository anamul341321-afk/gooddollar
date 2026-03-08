
import { db } from "./db";
import { users, transactions, settings, verificationPool, submittedNumbers, resetHistory, type User, type InsertUser, type Transaction, type InsertTransaction } from "../shared/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByGuestId(guestId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, amount: number): Promise<User>;
  updateUserKeyCount(userId: number, delta: number): Promise<User>;
  resetUserKeyCount(userId: number): Promise<User>;
  updateUserPaymentStatus(userId: number, status: string): Promise<User>;
  getUsersByPaymentStatus(status: string): Promise<User[]>;
  setUserBlockedStatus(userId: number, isBlocked: boolean): Promise<User>;
  updateUserBalanceDirectly(userId: number, balance: number): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
  
  addVerificationKey(privateKey: string, verifyUrl: string, addedBy?: string): Promise<void>;
  getAvailableVerificationKey(): Promise<{ id: number; privateKey: string; verifyUrl: string } | undefined>;
  markVerificationKeyUsed(id: number): Promise<void>;
  getVerificationPool(): Promise<any[]>;
  deleteVerificationKey(id: number): Promise<void>;
  deleteUsedVerificationKeys(): Promise<number>;

  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: number, status: string): Promise<Transaction | undefined>;
  getAllTransactions(): Promise<Transaction[]>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  isKeyUsed(key: string): Promise<boolean>;

  addSubmittedNumbers(numbers: string[], submittedBy: string, paymentNumber?: string, paymentMethod?: string): Promise<void>;
  getSubmittedNumbers(): Promise<any[]>;
  getExistingSubmittedPhoneNumbers(): Promise<string[]>;
  deleteSubmittedNumber(id: number): Promise<void>;
  clearAllSubmittedNumbers(): Promise<void>;
  addResetHistory(phoneNumber: string, verifiedCount: number, submittedBy: string, paymentNumber?: string | null, paymentMethod?: string | null): Promise<void>;
  getResetHistory(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByGuestId(guestId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.guestId, guestId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      balance: 0,
      keyCount: 0,
      isBlocked: false,
    }).returning();
    return user;
  }

  async updateUserBalance(userId: number, amount: number): Promise<User> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const newBalance = user.balance + amount;
    const [updatedUser] = await db.update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async updateUserKeyCount(userId: number, delta: number): Promise<User> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    const [updated] = await db.update(users).set({ keyCount: user.keyCount + delta }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async resetUserKeyCount(userId: number): Promise<User> {
    const [updated] = await db.update(users).set({ 
      keyCount: 0,
      paymentStatus: "scheduled",
      paymentScheduledAt: new Date()
    }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async updateUserPaymentStatus(userId: number, status: string): Promise<User> {
    const [updated] = await db.update(users).set({ paymentStatus: status }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async getUsersByPaymentStatus(status: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.paymentStatus, status));
  }

  async setUserBlockedStatus(userId: number, isBlocked: boolean): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({ isBlocked })
      .where(eq(users.id, userId))
      .returning();
    if (!updatedUser) throw new Error("User not found");
    return updatedUser;
  }

  async updateUserBalanceDirectly(userId: number, balance: number): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({ balance })
      .where(eq(users.id, userId))
      .returning();
    if (!updatedUser) throw new Error("User not found");
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const [existing] = await db.select().from(settings).where(eq(settings.key, key));
    if (existing) {
      await db.update(settings).set({ value }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  }

  async addVerificationKey(privateKey: string, verifyUrl: string, addedBy?: string): Promise<void> {
    await db.insert(verificationPool).values({ privateKey, verifyUrl, addedBy: addedBy || "Unknown" });
  }

  async getAvailableVerificationKey(): Promise<{ id: number; privateKey: string; verifyUrl: string } | undefined> {
    const [key] = await db.select().from(verificationPool).where(eq(verificationPool.isUsed, false)).limit(1);
    return key;
  }

  async markVerificationKeyUsed(id: number): Promise<void> {
    await db.update(verificationPool).set({ isUsed: true }).where(eq(verificationPool.id, id));
  }

  async getVerificationPool(): Promise<any[]> {
    return await db.select().from(verificationPool).orderBy(desc(verificationPool.createdAt));
  }

  async deleteVerificationKey(id: number): Promise<void> {
    await db.delete(verificationPool).where(eq(verificationPool.id, id));
  }

  async deleteUsedVerificationKeys(): Promise<number> {
    const used = await db.select().from(verificationPool).where(eq(verificationPool.isUsed, true));
    await db.delete(verificationPool).where(eq(verificationPool.isUsed, true));
    return used.length;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async updateTransactionStatus(id: number, status: string): Promise<Transaction | undefined> {
    const [updated] = await db.update(transactions)
      .set({ status })
      .where(eq(transactions.id, id))
      .returning();
    return updated;
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return await db.select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt));
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return await db.select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async isKeyUsed(key: string): Promise<boolean> {
    const searchPattern = `%Key: %${key}%`;
    const existing = await db.select()
      .from(transactions)
      .where(and(
        eq(transactions.type, "earning"),
        sql`${transactions.details} LIKE ${searchPattern}`
      ));
    return existing.length > 0;
  }

  async addSubmittedNumbers(numbers: string[], submittedBy: string, paymentNumber?: string, paymentMethod?: string): Promise<void> {
    for (const num of numbers) {
      const user = await this.getUserByGuestId(num);
      await db.insert(submittedNumbers).values({
        phoneNumber: num,
        verifiedCount: user?.keyCount || 0,
        submittedBy,
        paymentNumber: paymentNumber || null,
        paymentMethod: paymentMethod || null,
      });
    }
  }

  async getSubmittedNumbers(): Promise<any[]> {
    return await db.select().from(submittedNumbers).orderBy(desc(submittedNumbers.submittedAt));
  }

  async deleteSubmittedNumber(id: number): Promise<void> {
    await db.delete(submittedNumbers).where(eq(submittedNumbers.id, id));
  }

  async getExistingSubmittedPhoneNumbers(): Promise<string[]> {
    const rows = await db.select({ phoneNumber: submittedNumbers.phoneNumber }).from(submittedNumbers);
    return rows.map(r => r.phoneNumber);
  }

  async clearAllSubmittedNumbers(): Promise<void> {
    await db.delete(submittedNumbers);
  }

  async addResetHistory(phoneNumber: string, verifiedCount: number, submittedBy: string, paymentNumber?: string | null, paymentMethod?: string | null): Promise<void> {
    await db.insert(resetHistory).values({
      phoneNumber,
      verifiedCount,
      submittedBy,
      paymentNumber: paymentNumber || null,
      paymentMethod: paymentMethod || null,
    });
  }

  async getResetHistory(): Promise<any[]> {
    return await db.select().from(resetHistory).orderBy(desc(resetHistory.resetAt));
  }
}

import { sql } from "drizzle-orm";

export const storage = new DatabaseStorage();
