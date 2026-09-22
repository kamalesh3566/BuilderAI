import { Request } from "express";

export type SecurityAction =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAILED"
  | "AUTH_REGISTER_SUCCESS"
  | "AUTH_LOGOUT"
  | "AUTH_TOKEN_REVOKED"
  | "AUTH_PASSWORD_CHANGED"
  | "BYOK_KEY_UPDATED"
  | "BYOK_KEY_DELETED"
  | "ACCOUNT_DATA_EXPORTED"
  | "ACCOUNT_DELETED"
  | "PROJECT_DELETED"
  | "SUSPICIOUS_PATH_BLOCKED";

export interface SecurityEventOptions {
  action: SecurityAction;
  req?: Request;
  userId?: string;
  email?: string;
  status: "SUCCESS" | "FAILED" | "BLOCKED";
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Structured Security Audit Logger
 * Emits JSON-structured security audit records for SIEM/observability ingestion.
 */
export function logSecurityAudit(event: SecurityEventOptions): void {
  const req = event.req;
  const clientIp = req?.headers["x-forwarded-for"] || req?.socket?.remoteAddress || "UNKNOWN_IP";
  const userAgent = req?.headers["user-agent"] || "UNKNOWN_UA";
  const requestId = (req as any)?.id || "N/A";

  const auditRecord = {
    timestamp: new Date().toISOString(),
    logType: "SECURITY_AUDIT",
    requestId,
    action: event.action,
    status: event.status,
    userId: event.userId || (req as any)?.user?._id || "ANONYMOUS",
    email: event.email || (req as any)?.user?.email || undefined,
    clientIp,
    userAgent,
    reason: event.reason,
    metadata: event.metadata,
  };

  if (event.status === "BLOCKED" || event.status === "FAILED") {
    console.warn(`[SECURITY ALERT]`, JSON.stringify(auditRecord));
  } else {
    console.log(`[SECURITY AUDIT]`, JSON.stringify(auditRecord));
  }
}
