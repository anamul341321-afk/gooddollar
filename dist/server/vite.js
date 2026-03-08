import express from "express";
import { createServer as createViteServer, createLogger } from "vite";
let viteConfig;
try {
    viteConfig = (await import("../vite.config")).default;
}
catch {
    viteConfig = {};
}
;
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
export function log(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
}
export function serveStatic(app) {
    const distPath = path.resolve(process.cwd(), "dist", "public");
    if (!fs.existsSync(distPath)) {
        throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
    }
    app.use(express.static(distPath));
    app.get(/.*/, (_req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
    });
}
const viteLogger = createLogger();
export async function setupVite(app, server) {
    const serverOptions = {
        middlewareMode: true,
        hmr: { server, path: "/vite-hmr" },
        allowedHosts: true,
    };
    const vite = await createViteServer({
        ...viteConfig,
        configFile: false,
        customLogger: {
            ...viteLogger,
            error: (msg, options) => {
                viteLogger.error(msg, options);
                process.exit(1);
            },
        },
        server: serverOptions,
        appType: "custom",
    });
    app.use(vite.middlewares);
    app.use("/{*path}", async (req, res, next) => {
        const url = req.originalUrl;
        try {
            const clientTemplate = path.resolve(import.meta.dirname, "..", "client", "index.html");
            let template = await fs.promises.readFile(clientTemplate, "utf-8");
            template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
            const page = await vite.transformIndexHtml(url, template);
            res.status(200).set({ "Content-Type": "text/html" }).end(page);
        }
        catch (e) {
            vite.ssrFixStacktrace(e);
            next(e);
        }
    });
}
