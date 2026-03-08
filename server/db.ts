
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from '../shared/schema.js';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
});

export const db = drizzle(pool, { schema });

export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isConnectionError = err.message?.includes('endpoint') || 
        err.message?.includes('disabled') || 
        err.message?.includes('connection') ||
        err.message?.includes('ECONNREFUSED') ||
        err.message?.includes('timeout') ||
        err.code === 'ECONNRESET' ||
        err.code === '57P01';
      
      if (isConnectionError && attempt < retries) {
        console.log(`DB retry attempt ${attempt}/${retries}, waiting ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
  throw new Error("Database operation failed after retries");
}
