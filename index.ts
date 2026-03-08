import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // রুটগুলো রেজিস্টার করা হচ্ছে
    await registerRoutes(httpServer, app);

    // এরর হ্যান্ডলিং মিডলওয়্যার
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Internal Server Error:", err);
      res.status(status).json({ message });
    });

    // পোর্ট সেটআপ (Render-এর জন্য খুবই জরুরি)
    const PORT = Number(process.env.PORT) || 10000;
    
    // সার্ভার চালু করা
    httpServer.listen(PORT, '0.0.0.0', () => {
      log(`সার্ভার সচল হয়েছে পোর্ট: ${PORT}`);
    });

  } catch (error) {
    console.error("সার্ভার চালু করতে সমস্যা হয়েছে:", error);
    process.exit(1);
  }
})();
