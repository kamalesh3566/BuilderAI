import crypto from "crypto";
import { FileManifest, FileOp, ProjectFiles } from "../types/index.js";

export function hashContent(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export function buildManifest(files: ProjectFiles | Record<string, { content?: string; hash?: string }>): FileManifest {
    const manifest: FileManifest = [];
    for (const [path, entry] of Object.entries(files || {})) {
        const content = typeof entry === "string" ? entry : (entry as { content?: string })?.content || "";
        const hash = typeof entry === "object" && (entry as { hash?: string })?.hash 
            ? (entry as { hash: string }).hash 
            : hashContent(content);
        manifest.push({ path, hash, size: content.length });
    }
    return manifest;
}

export interface ApplyOperationsResult {
    files: ProjectFiles;
    applied: string[];
    errors: string[];
}

// Apply AI file operations (create, update, delete) to project files
export function applyOperations(
    currentFiles: ProjectFiles,
    operations: FileOp[]
): ApplyOperationsResult {
    const files: ProjectFiles = { ...currentFiles };
    const applied: string[] = [];
    const errors: string[] = [];

    for (const op of operations) {
        try {
            if (!op || typeof op !== "object" || !op.path || typeof op.path !== "string") {
                errors.push("Invalid operation structure or missing path");
                continue;
            }

            const dangerousKeys = ["__proto__", "constructor", "prototype"];
            if (dangerousKeys.includes(op.path) || op.path.includes("..") || !op.path.startsWith("/")) {
                errors.push(`Blocked invalid or dangerous path: ${op.path}`);
                continue;
            }

            switch (op.op) {
                case "create": {
                    const content = op.code || op.content;
                    if (!content) {
                        errors.push(`create ${op.path}: missing content`);
                        break;
                    }
                    files[op.path] = content;
                    applied.push(`created ${op.path}`);
                    break;
                }

                case "update": {
                    const existing = files[op.path];
                    if (!existing) {
                        errors.push(`update ${op.path}: file not found`);
                        break;
                    }
                    if (!op.search || op.replace == null) {
                        errors.push(`update ${op.path}: missing search/replace`);
                        break;
                    }

                    const existingContent = typeof existing === "string" ? existing : (existing as any)?.content || "";
                    const newContent = searchReplace(existingContent, op.search, op.replace);

                    if (newContent === null) {
                        errors.push(`update ${op.path}: search string not found`);
                        break;
                    }

                    files[op.path] = newContent;
                    applied.push(`updated ${op.path}`);
                    break;
                }

                case "delete": {
                    if (files[op.path]) {
                        delete files[op.path];
                        applied.push(`deleted ${op.path}`);
                    } else {
                        errors.push(`delete ${op.path}: file not found`);
                    }
                    break;
                }

                default:
                    errors.push(`unknown op: ${(op as any).op}`);
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            errors.push(`${op.op} ${op.path}: ${errorMsg}`);
        }
    }

    return { files, applied, errors };
}

// Search and replace code with fallback whitespace normalization matching
function searchReplace(content: string, search: string, replace: string): string | null {
    // 1. Try exact match
    if (content.includes(search)) {
        return content.replace(search, () => replace);
    }

    // 2. Try with normalized whitespace (collapse multiple spaces/tabs, trim lines)
    const normalizeWs = (s: string): string =>
        s
            .split("\n")
            .map((line) => line.replace(/\s+/g, " ").trim())
            .join("\n")
            .trim();

    const normalizedContent = normalizeWs(content);
    const normalizedSearch = normalizeWs(search);

    if (normalizedContent.includes(normalizedSearch)) {
        // Find the original substring by matching line-by-line
        const searchLines = normalizedSearch.split("\n");
        const contentLines = content.split("\n");

        for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
            let match = true;
            for (let j = 0; j < searchLines.length; j++) {
                if (normalizeWs(contentLines[i + j]) !== searchLines[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                const before = contentLines.slice(0, i);
                const after = contentLines.slice(i + searchLines.length);
                return [...before, replace, ...after].join("\n");
            }
        }
    }

    return null;
}
