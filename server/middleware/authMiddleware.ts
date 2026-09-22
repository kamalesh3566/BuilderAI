import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthUserPayload } from "../types/index.js";
import { User } from "../models/User.js";
import { logSecurityAudit } from "../utils/securityLogger.js";

const JWT_SECRET = process.env.JWT_SECRET || "builder_ai_dev_jwt_secret";

/**
 * Enhanced Authentication Middleware
 * Enforces dual Bearer/cookie extraction and server-side tokenVersion revocation verification.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization.trim();
    if (authHeader.startsWith("Bearer ") || authHeader.startsWith("bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token || typeof token !== "string") {
    res.status(401).json({ error: "Access denied. No session token provided." });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as AuthUserPayload;
    if (!decoded || !decoded.userId || typeof decoded.userId !== "string") {
      res.status(401).json({ error: "Invalid session payload. Please sign in again." });
      return;
    }

    // Server-side instant token revocation check via tokenVersion
    const user = await User.findById(decoded.userId).select("name email tokenVersion selectedModel");
    if (!user) {
      logSecurityAudit({
        action: "AUTH_TOKEN_REVOKED",
        req,
        userId: decoded.userId,
        status: "BLOCKED",
        reason: "User account not found or deleted",
      });
      res.status(401).json({ error: "User account no longer exists. Please register again." });
      return;
    }

    const currentTokenVersion = user.tokenVersion || 0;
    const tokenVersionInPayload = decoded.tokenVersion ?? 0;

    if (tokenVersionInPayload !== currentTokenVersion) {
      logSecurityAudit({
        action: "AUTH_TOKEN_REVOKED",
        req,
        userId: user._id.toString(),
        email: user.email,
        status: "BLOCKED",
        reason: `Token version mismatch (Token: ${tokenVersionInPayload}, Current: ${currentTokenVersion})`,
      });
      res.status(401).json({ error: "Session has been logged out or revoked. Please log in again." });
      return;
    }

    req.user = decoded;
    (req as any).dbUser = user;
    next();
  } catch (_err) {
    res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
  }
}

export default authMiddleware;
