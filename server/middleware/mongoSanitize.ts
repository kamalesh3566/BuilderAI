import { Request, Response, NextFunction } from "express";

/**
 * NoSQL Injection Protection Middleware
 * Recursively cleanses keys starting with '$' or containing '.' from req.body, req.query, and req.params
 * in-place to prevent MongoDB query and operator injection attacks.
 */

function cleanInPlace(obj: unknown): void {
    if (!obj || typeof obj !== "object") return;

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            if (typeof obj[i] === "object" && obj[i] !== null) {
                cleanInPlace(obj[i]);
            }
        }
        return;
    }

    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) {
        if (
            key.startsWith("$") ||
            key.includes(".") ||
            key === "__proto__" ||
            key === "constructor" ||
            key === "prototype"
        ) {
            delete record[key];
            continue;
        }

        if (typeof record[key] === "object" && record[key] !== null) {
            cleanInPlace(record[key]);
        }
    }
}

export function mongoSanitize(req: Request, _res: Response, next: NextFunction): void {
    if (req.body && typeof req.body === "object") {
        cleanInPlace(req.body);
    }
    if (req.query && typeof req.query === "object") {
        cleanInPlace(req.query);
    }
    if (req.params && typeof req.params === "object") {
        cleanInPlace(req.params);
    }
    next();
}

export default mongoSanitize;
