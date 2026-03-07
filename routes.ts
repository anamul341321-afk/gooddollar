
import { z } from 'zod';
import { insertUserSchema, insertTransactionSchema, users, transactions } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({ guestId: z.string().min(3) }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        201: z.custom<typeof users.$inferSelect>(), // Created
        400: errorSchemas.validation,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  earn: {
    submitKey: {
      method: 'POST' as const,
      path: '/api/submit-key',
      input: z.object({ privateKey: z.string().min(1) }),
      responses: {
        200: z.object({ 
          success: z.boolean(), 
          newBalance: z.number(),
          message: z.string() 
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  withdraw: {
    request: {
      method: 'POST' as const,
      path: '/api/withdraw',
      input: z.object({
        method: z.enum(['bkash', 'nagad']),
        number: z.string().min(10),
        amount: z.number().min(50), // Minimum withdrawal amount
      }),
      responses: {
        200: z.object({ 
          success: z.boolean(), 
          newBalance: z.number(),
          message: z.string() 
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions',
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
  },
  admin: {
    login: {
      method: 'POST' as const,
      path: '/api/admin/login',
      input: z.object({ password: z.string() }),
      responses: {
        200: z.object({ success: z.boolean() }),
        401: z.object({ message: z.string() }),
      },
    },
    users: {
      method: 'GET' as const,
      path: '/api/admin/users',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    toggleBlock: {
      method: 'POST' as const,
      path: '/api/admin/users/:id/toggle-block',
      input: z.object({ isBlocked: z.boolean() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    withdrawals: {
      method: 'GET' as const,
      path: '/api/admin/withdrawals',
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    updateWithdrawal: {
      method: 'POST' as const,
      path: '/api/admin/withdrawals/:id/status',
      input: z.object({ status: z.enum(['completed', 'rejected', 'pending']) }),
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    updateBalance: {
      method: 'POST' as const,
      path: '/api/admin/users/:id/balance',
      input: z.object({ balance: z.number() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    getSettings: {
      method: 'GET' as const,
      path: '/api/admin/settings',
      responses: {
        200: z.object({ rewardRate: z.number() }),
        401: errorSchemas.unauthorized,
      },
    },
    updateSettings: {
      method: 'POST' as const,
      path: '/api/admin/settings',
      input: z.object({ rewardRate: z.number() }),
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
      },
    },
  }
};

// ============================================
// REQUIRED: buildUrl helper
// ============================================
export type LoginRequest = { guestId: string; displayName?: string };
export type UserResponse = z.infer<typeof api.auth.login.responses[200]>;

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
