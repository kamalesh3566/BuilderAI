// Fix double-escaped newlines/quotes from AI JSON string output
export function normalizeContent(content?: string | null): string {
    if (!content || typeof content !== "string") return "";

    let normalized = content;

    // Remove BOM if present
    if (normalized.charCodeAt(0) === 0xfeff) {
        normalized = normalized.slice(1);
    }

    // Normalize \r\n to \n
    normalized = normalized.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    const realNewlines = (normalized.match(/\n/g) || []).length;
    const literalBackslashN = (normalized.match(/\\n/g) || []).length;

    if (literalBackslashN > realNewlines) {
        // Triple-escaped first: \\\\n → \\n (leave as literal), then \\n → \n
        normalized = normalized
            .replace(/\\\\n/g, "%%PRESERVED_ESCAPED_N%%")
            .replace(/\\n/g, "\n")
            .replace(/%%PRESERVED_ESCAPED_N%%/g, "\\n")
            .replace(/\\t/g, "\t")
            .replace(/\\r/g, "")
            .replace(/\\\\/g, "\\");
    }

    // Always clean up backslash-escaped quotes (e.g. className=\"relative\") in code.
    normalized = normalized.replace(/(\w+)=\\"([^"]*?)\\"/g, '$1="$2"');

    return normalized;
}

export default normalizeContent;
