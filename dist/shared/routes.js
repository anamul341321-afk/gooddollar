import { z } from 'zod';
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
            method: 'POST',
            path: '/api/login',
            input: z.object({ guestId: z.string().min(3) }),
            responses: {
                200: z.custom(),
                201: z.custom(), // Created
                400: errorSchemas.validation,
            },
        },
        logout: {
            method: 'POST',
            path: '/api/logout',
            responses: {
                200: z.object({ message: z.string() }),
            },
        },
        me: {
            method: 'GET',
            path: '/api/user',
            responses: {
                200: z.custom(),
                401: errorSchemas.unauthorized,
            },
        },
    },
    earn: {
        submitKey: {
            method: 'POST',
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
            method: 'POST',
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
            method: 'GET',
            path: '/api/transactions',
            responses: {
                200: z.array(z.custom()),
                401: errorSchemas.unauthorized,
            },
        },
    },
    admin: {
        login: {
            method: 'POST',
            path: '/api/admin/login',
            input: z.object({ password: z.string() }),
            responses: {
                200: z.object({ success: z.boolean() }),
                401: z.object({ message: z.string() }),
            },
        },
        users: {
            method: 'GET',
            path: '/api/admin/users',
            responses: {
                200: z.array(z.custom()),
                401: errorSchemas.unauthorized,
            },
        },
        toggleBlock: {
            method: 'POST',
            path: '/api/admin/users/:id/toggle-block',
            input: z.object({ isBlocked: z.boolean() }),
            responses: {
                200: z.custom(),
                401: errorSchemas.unauthorized,
            },
        },
        withdrawals: {
            method: 'GET',
            path: '/api/admin/withdrawals',
            responses: {
                200: z.array(z.custom()),
                401: errorSchemas.unauthorized,
            },
        },
        updateWithdrawal: {
            method: 'POST',
            path: '/api/admin/withdrawals/:id/status',
            input: z.object({ status: z.enum(['completed', 'rejected', 'pending']) }),
            responses: {
                200: z.custom(),
                401: errorSchemas.unauthorized,
            },
        },
        updateBalance: {
            method: 'POST',
            path: '/api/admin/users/:id/balance',
            input: z.object({ balance: z.number() }),
            responses: {
                200: z.custom(),
                401: errorSchemas.unauthorized,
            },
        },
        getSettings: {
            method: 'GET',
            path: '/api/admin/settings',
            responses: {
                200: z.object({ rewardRate: z.number() }),
                401: errorSchemas.unauthorized,
            },
        },
        updateSettings: {
            method: 'POST',
            path: '/api/admin/settings',
            input: z.object({ rewardRate: z.number() }),
            responses: {
                200: z.object({ success: z.boolean() }),
                401: errorSchemas.unauthorized,
            },
        },
    }
};
export function buildUrl(path, params) {
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
