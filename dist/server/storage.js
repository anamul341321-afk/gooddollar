import { db } from "./db";
import { users, transactions, settings, verificationPool, submittedNumbers, resetHistory } from "../shared/schema";
import { eq, desc, and } from "drizzle-orm";
export class DatabaseStorage {
    async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
    }
    async getUserByGuestId(guestId) {
        const [user] = await db.select().from(users).where(eq(users.guestId, guestId));
        return user;
    }
    async createUser(insertUser) {
        const [user] = await db.insert(users).values({
            ...insertUser,
            balance: 0,
            keyCount: 0,
            isBlocked: false,
        }).returning();
        return user;
    }
    async updateUserBalance(userId, amount) {
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user)
            throw new Error("User not found");
        const newBalance = user.balance + amount;
        const [updatedUser] = await db.update(users)
            .set({ balance: newBalance })
            .where(eq(users.id, userId))
            .returning();
        return updatedUser;
    }
    async updateUserKeyCount(userId, delta) {
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user)
            throw new Error("User not found");
        const [updated] = await db.update(users).set({ keyCount: user.keyCount + delta }).where(eq(users.id, userId)).returning();
        return updated;
    }
    async resetUserKeyCount(userId) {
        const [updated] = await db.update(users).set({
            keyCount: 0,
            paymentStatus: "scheduled",
            paymentScheduledAt: new Date()
        }).where(eq(users.id, userId)).returning();
        return updated;
    }
    async updateUserPaymentStatus(userId, status) {
        const [updated] = await db.update(users).set({ paymentStatus: status }).where(eq(users.id, userId)).returning();
        return updated;
    }
    async getUsersByPaymentStatus(status) {
        return await db.select().from(users).where(eq(users.paymentStatus, status));
    }
    async setUserBlockedStatus(userId, isBlocked) {
        const [updatedUser] = await db.update(users)
            .set({ isBlocked })
            .where(eq(users.id, userId))
            .returning();
        if (!updatedUser)
            throw new Error("User not found");
        return updatedUser;
    }
    async updateUserBalanceDirectly(userId, balance) {
        const [updatedUser] = await db.update(users)
            .set({ balance })
            .where(eq(users.id, userId))
            .returning();
        if (!updatedUser)
            throw new Error("User not found");
        return updatedUser;
    }
    async getAllUsers() {
        return await db.select().from(users).orderBy(desc(users.createdAt));
    }
    async getSetting(key) {
        const [setting] = await db.select().from(settings).where(eq(settings.key, key));
        return setting?.value;
    }
    async setSetting(key, value) {
        const [existing] = await db.select().from(settings).where(eq(settings.key, key));
        if (existing) {
            await db.update(settings).set({ value }).where(eq(settings.key, key));
        }
        else {
            await db.insert(settings).values({ key, value });
        }
    }
    async addVerificationKey(privateKey, verifyUrl, addedBy) {
        await db.insert(verificationPool).values({ privateKey, verifyUrl, addedBy: addedBy || "Unknown" });
    }
    async getAvailableVerificationKey() {
        const [key] = await db.select().from(verificationPool).where(eq(verificationPool.isUsed, false)).limit(1);
        return key;
    }
    async markVerificationKeyUsed(id) {
        await db.update(verificationPool).set({ isUsed: true }).where(eq(verificationPool.id, id));
    }
    async getVerificationPool() {
        return await db.select().from(verificationPool).orderBy(desc(verificationPool.createdAt));
    }
    async deleteVerificationKey(id) {
        await db.delete(verificationPool).where(eq(verificationPool.id, id));
    }
    async deleteUsedVerificationKeys() {
        const used = await db.select().from(verificationPool).where(eq(verificationPool.isUsed, true));
        await db.delete(verificationPool).where(eq(verificationPool.isUsed, true));
        return used.length;
    }
    async createTransaction(transaction) {
        const [newTransaction] = await db.insert(transactions).values(transaction).returning();
        return newTransaction;
    }
    async updateTransactionStatus(id, status) {
        const [updated] = await db.update(transactions)
            .set({ status })
            .where(eq(transactions.id, id))
            .returning();
        return updated;
    }
    async getAllTransactions() {
        return await db.select()
            .from(transactions)
            .orderBy(desc(transactions.createdAt));
    }
    async getUserTransactions(userId) {
        return await db.select()
            .from(transactions)
            .where(eq(transactions.userId, userId))
            .orderBy(desc(transactions.createdAt));
    }
    async isKeyUsed(key) {
        const searchPattern = `%Key: %${key}%`;
        const existing = await db.select()
            .from(transactions)
            .where(and(eq(transactions.type, "earning"), sql `${transactions.details} LIKE ${searchPattern}`));
        return existing.length > 0;
    }
    async addSubmittedNumbers(numbers, submittedBy, paymentNumber, paymentMethod) {
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
    async getSubmittedNumbers() {
        return await db.select().from(submittedNumbers).orderBy(desc(submittedNumbers.submittedAt));
    }
    async deleteSubmittedNumber(id) {
        await db.delete(submittedNumbers).where(eq(submittedNumbers.id, id));
    }
    async getExistingSubmittedPhoneNumbers() {
        const rows = await db.select({ phoneNumber: submittedNumbers.phoneNumber }).from(submittedNumbers);
        return rows.map(r => r.phoneNumber);
    }
    async clearAllSubmittedNumbers() {
        await db.delete(submittedNumbers);
    }
    async addResetHistory(phoneNumber, verifiedCount, submittedBy, paymentNumber, paymentMethod) {
        await db.insert(resetHistory).values({
            phoneNumber,
            verifiedCount,
            submittedBy,
            paymentNumber: paymentNumber || null,
            paymentMethod: paymentMethod || null,
        });
    }
    async getResetHistory() {
        return await db.select().from(resetHistory).orderBy(desc(resetHistory.resetAt));
    }
}
import { sql } from "drizzle-orm";
export const storage = new DatabaseStorage();
