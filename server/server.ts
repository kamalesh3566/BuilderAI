import express, { Request, Response, NextFunction } from "express";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { connectToDatabase } from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import projectRouter from "./routes/projectRoutes.js";

import helmet from "helmet";
import { globalLimiter } from "./middleware/rateLimiters.js";
import { mongoSanitize } from "./middleware/mongoSanitize.js";
import { sanitizeErrorMessage } from "./utils/sanitizeError.js";
import { csrfProtection } from "./middleware/csrfProtection.js";

const app = express();

// Disable fingerprinting header
app.disable("x-powered-by");

await connectToDatabase();

// 1. Request Correlation ID Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const incomingId = req.headers["x-request-id"];
  const requestId = typeof incomingId === "string" && incomingId.length > 0 ? incomingId : crypto.randomUUID();
  (req as any).id = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});

// 2. Production Security Headers Hardening
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: false, // Sandpack / iframe live previews require framing
    contentSecurityPolicy: false, // Sandpack in-browser compilation sandbox
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
  })
);

const configuredOrigins = (process.env.ORIGINS || "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((o: string) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (
        configuredOrigins.includes(origin) ||
        /^https:\/\/.*\.vercel\.app$/.test(origin) ||
        /^https:\/\/.*\.onrender\.com$/.test(origin) ||
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 3. Strict CSRF & Origin Verification on State-Changing Methods
app.use(csrfProtection);

// 4. NoSQL query and operator injection protection
app.use(mongoSanitize);

// 5. Rate Limiting for all API endpoints
app.use("/api", globalLimiter);

app.get("/", (_req: Request, res: Response) => res.send("Server is Live!"));
app.use("/api/auth", authRouter);
app.use("/api/projects", projectRouter);

// 5. Centralized secure error handler with secret redaction and correlation ID
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const reqId = (req as any)?.id || "N/A";
  const rawMessage = err?.message || "Internal server error";
  const sanitizedLog = sanitizeErrorMessage(rawMessage);
  console.error(`[Error] [ReqId: ${reqId}] ${sanitizedLog}`);

  const isProduction = process.env.NODE_ENV === "production";
  const clientMessage = isProduction ? "Internal server error" : sanitizeErrorMessage(rawMessage);

  res.status(err?.status || 500).json({ error: clientMessage, requestId: reqId });
});

const port = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

export default app;
