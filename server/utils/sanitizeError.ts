/**
 * Secret & Sensitive Data Redaction Utility
 * Scrubs API keys, passwords, bearer tokens, DB URIs, and server file paths from error logs and client responses.
 */

const SENSITIVE_PATTERNS: RegExp[] = [
    // OpenRouter / OpenAI API keys
    /(?:sk-or-v1-[a-zA-Z0-9_\-]{20,}|sk-[a-zA-Z0-9_\-]{20,})/gi,
    // Versioned encrypted strings
    /enc_v1:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+/gi,
    // Raw encryption strings (iv:tag:ciphertext)
    /[a-f0-9]{32}:[a-f0-9]{32}:[a-f0-9]{32,}/gi,
    // Bearer tokens
    /Bearer\s+[a-zA-Z0-9_\-\.]+/gi,
    // MongoDB connection strings with credentials
    /mongodb(?:\+srv)?:\/\/[^@\s]+@/gi,
    // Absolute Windows / Linux paths
    /(?:[a-zA-Z]:\\[^\s:"]+|\/(?:home|Users|var|tmp|etc)\/[^\s:"]+)/gi,
];

/**
 * Redacts any sensitive information from a text string.
 */
export function sanitizeErrorMessage(message?: string | null): string {
    if (!message || typeof message !== "string") return "An unexpected error occurred.";

    let sanitized = message;

    // Redact API keys and secrets
    for (const pattern of SENSITIVE_PATTERNS) {
        sanitized = sanitized.replace(pattern, "[REDACTED_SECRET]");
    }

    // Generic cleanup for common AI provider error bodies
    if (sanitized.includes('"apiKey"') || sanitized.includes('"customApiKey"')) {
        sanitized = sanitized.replace(/"(apiKey|customApiKey)"\s*:\s*"[^"]+"/g, '"$1": "[REDACTED]"');
    }

    return sanitized;
}

export default sanitizeErrorMessage;
