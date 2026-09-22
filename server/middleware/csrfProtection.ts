import { Request, Response, NextFunction } from "express";
import { logSecurityAudit } from "../utils/securityLogger.js";

const configuredOrigins = (process.env.ORIGINS || "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((o: string) => o.trim())
  .filter(Boolean);

/**
 * Validates whether an origin URL is authorized
 */
function isAllowedOrigin(originStr: string): boolean {
  try {
    const origin = new URL(originStr).origin;
    if (configuredOrigins.includes(origin)) return true;
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
    if (/^https:\/\/.*\.onrender\.com$/.test(origin)) return true;
    if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Strict Cross-Site Request Forgery (CSRF) & Origin Defense Middleware
 * Protects state-changing operations (POST, PUT, PATCH, DELETE) when authenticated via cookies.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (!stateChangingMethods.includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const hasCookieToken = Boolean(req.cookies?.token);
  const authHeader = req.headers.authorization;
  const hasBearerToken = typeof authHeader === "string" && authHeader.trim().toLowerCase().startsWith("bearer ");

  // 1. If Origin header is present, verify against allowed origin whitelist
  if (origin) {
    if (!isAllowedOrigin(origin)) {
      logSecurityAudit({
        action: "SUSPICIOUS_PATH_BLOCKED",
        req,
        status: "BLOCKED",
        reason: `CSRF blocked: unauthorized origin '${origin}'`,
      });
      res.status(403).json({ error: "Cross-Site Request Forgery (CSRF) protection: unauthorized origin." });
      return;
    }
    return next();
  }

  // 2. If Referer is present, verify host
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!isAllowedOrigin(refererOrigin)) {
        logSecurityAudit({
          action: "SUSPICIOUS_PATH_BLOCKED",
          req,
          status: "BLOCKED",
          reason: `CSRF blocked: unauthorized referer '${refererOrigin}'`,
        });
        res.status(403).json({ error: "Cross-Site Request Forgery (CSRF) protection: unauthorized referer." });
        return;
      }
      return next();
    } catch {
      // Malformed referer
    }
  }

  // 3. For requests with no Origin/Referer (e.g. server-to-server or programmatic tools),
  // require an explicit Bearer Authorization header if a cookie is not verified.
  if (hasCookieToken && !hasBearerToken) {
    logSecurityAudit({
      action: "SUSPICIOUS_PATH_BLOCKED",
      req,
      status: "BLOCKED",
      reason: "CSRF blocked: state-changing cookie request missing Origin/Referer header",
    });
    res.status(403).json({
      error: "State-changing cookie requests require valid Origin headers or Authorization Bearer tokens.",
    });
    return;
  }

  next();
}

export default csrfProtection;
