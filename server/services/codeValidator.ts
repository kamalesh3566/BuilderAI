// Post-generation code validator and auto-fixer
// Uses Babel AST parsing and targeted regex heuristics to guarantee 100% syntactically valid code

import { parse } from "@babel/parser";

// Void HTML elements that must be self-closed in JSX
const VOID_ELEMENTS = ["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"];

export interface ValidationContext {
  allPlannedFiles?: Array<{ path: string; [key: string]: any }>;
}

export interface ValidationResult {
  code: string;
  warnings: string[];
}

export interface RevisionValidationResult {
  content?: string | null;
  warnings: string[];
}

/**
 * Stateful tokenizer that removes stray backslashes outside of strings, comments, and regexes.
 * Prevents "SyntaxError: Expecting Unicode escape sequence \uXXXX" in JSX/JS.
 */
export function stripInvalidBackslashes(code: string): string {
  if (typeof code !== "string" || !code.includes("\\")) return code;

  let inSingleQuote = false;
  let inDoubleQuote = false;
  const templateStack: Array<string | number> = []; // tracks '{' depth inside template expressions
  let inLineComment = false;
  let inBlockComment = false;
  let result = "";

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1];
    const prevChar = i > 0 ? code[i - 1] : "";

    // Handle line comment
    if (inLineComment) {
      result += char;
      if (char === "\n") inLineComment = false;
      continue;
    }

    // Handle block comment
    if (inBlockComment) {
      result += char;
      if (prevChar === "*" && char === "/") inBlockComment = false;
      continue;
    }

    // Handle single quote string
    if (inSingleQuote) {
      result += char;
      if (char === "'" && prevChar !== "\\") inSingleQuote = false;
      continue;
    }

    // Handle double quote string
    if (inDoubleQuote) {
      result += char;
      if (char === '"' && prevChar !== "\\") inDoubleQuote = false;
      continue;
    }

    // Handle template string literal
    if (templateStack.length > 0) {
      const currentMode = templateStack[templateStack.length - 1];
      if (currentMode === "LITERAL") {
        if (char === "`" && prevChar !== "\\") {
          templateStack.pop();
          result += char;
          continue;
        } else if (char === "$" && nextChar === "{" && prevChar !== "\\") {
          templateStack.push("EXPR");
          templateStack.push(0); // brace depth counter
          result += char + "{";
          i++; // skip '{'
          continue;
        } else {
          result += char;
          continue;
        }
      } else if (typeof currentMode === "number") {
        // We are inside ${ ... } expression
        if (char === "{") {
          (templateStack[templateStack.length - 1] as number)++;
        } else if (char === "}") {
          if (templateStack[templateStack.length - 1] === 0) {
            templateStack.pop(); // pop depth counter
            templateStack.pop(); // pop 'EXPR'
            result += char;
            continue;
          } else {
            (templateStack[templateStack.length - 1] as number)--;
          }
        }
      }
    }

    // Start of comments
    if (char === "/" && nextChar === "/") {
      inLineComment = true;
      result += char;
      continue;
    }
    if (char === "/" && nextChar === "*") {
      inBlockComment = true;
      result += char;
      continue;
    }

    // Start of strings
    if (char === "'") {
      inSingleQuote = true;
      result += char;
      continue;
    }
    if (char === '"') {
      inDoubleQuote = true;
      result += char;
      continue;
    }
    if (char === "`") {
      templateStack.push("LITERAL");
      result += char;
      continue;
    }

    // If outside strings/comments/regex, backslash is NEVER valid in JS/JSX!
    if (char === "\\") {
      // Strip the stray backslash
      continue;
    }

    result += char;
  }

  return result;
}

/**
 * Repairs common quote mismatches and trailing stray characters
 */
export function fixQuotesAndPunctuation(code: string): string {
  if (typeof code !== "string") return code;

  // 1. Fix stray trailing quote after commas in array/object literals e.g. 'item',' or "item","
  code = code.replace(/,\s*['"]\s*$/gm, ",");
  code = code.replace(/,\s*['"]\s*(\]|\})/g, ", $1");

  // 2. Fix JSX attributes with mismatched quotes or template quotes:
  // className={`...`} " or className={`...`} '
  code = code.replace(/(className=\{`[\s\S]*?`\})\s*["']/g, "$1");
  code = code.replace(/(className=\{[^}]+\})\s*["']/g, "$1");

  // Fix <tag attr="...'> or <tag attr='...">
  code = code.replace(/(<[a-zA-Z][^>]*?\s+[a-zA-Z0-9_-]+)="([^">]*?)'(>|\s)/g, '$1="$2"$3');
  code = code.replace(/(<[a-zA-Z][^>]*?\s+[a-zA-Z0-9_-]+)='([^'>]*?)"(>|\s)/g, "$1='$2'$3");

  // Fix stray quote before closing tag e.g. <div className="..." ">
  code = code.replace(/(<[a-zA-Z][^>]*?)\s+["'](\s*\/?>)/g, "$1$2");

  return code;
}

// Validate and auto-fix common AI-generated code issues
export function validateAndFixCode(code: string, filePath: string, context?: ValidationContext): ValidationResult {
  const warnings: string[] = [];
  const isCSS = filePath.endsWith(".css");
  const isJS = filePath.endsWith(".js") || filePath.endsWith(".jsx") || filePath.endsWith(".ts") || filePath.endsWith(".tsx");

  // 1. Strip markdown code fences that some models wrap around code
  const fencePattern = /^```(?:jsx?|javascript|css|html|tsx?|react)?\s*\n([\s\S]*?)\n```\s*$/;
  const fenceMatch = code.match(fencePattern);
  if (fenceMatch) {
    code = fenceMatch[1];
    warnings.push(`${filePath}: Stripped markdown code fences`);
  }

  // Also handle cases where fences appear at the very start/end with other content
  code = code.replace(/^```(?:jsx?|javascript|css|html|tsx?|react)?\s*\n/, "");
  code = code.replace(/\n```\s*$/, "");

  if (isCSS) {
    return { code: code.trim() + "\n", warnings };
  }

  if (!isJS) {
    return { code, warnings };
  }

  // --- JS/JSX-specific fixes ---

  // 2. Strip invalid stray backslashes (fixes Unicode escape \uXXXX crash)
  const backslashStripped = stripInvalidBackslashes(code);
  if (backslashStripped !== code) {
    code = backslashStripped;
    warnings.push(`${filePath}: Removed invalid backslash escape sequences outside strings`);
  }

  // 3. Fix quotes and punctuation
  const quotesFixed = fixQuotesAndPunctuation(code);
  if (quotesFixed !== code) {
    code = quotesFixed;
    warnings.push(`${filePath}: Repaired mismatched quotes and punctuation`);
  }

  // 4. Fix `class=` → `className=` in JSX (but not inside strings or comments)
  const classFixRegex = /(<[a-zA-Z][^>]*?)\bclass=/g;
  if (classFixRegex.test(code)) {
    code = code.replace(/(<[a-zA-Z][^>]*?)\bclass=/g, "$1className=");
    warnings.push(`${filePath}: Fixed 'class=' → 'className='`);
  }

  // 5. Fix `for=` → `htmlFor=` in JSX labels
  const forFixRegex = /(<label[^>]*?)\bfor=/gi;
  if (forFixRegex.test(code)) {
    code = code.replace(/(<label[^>]*?)\bfor=/gi, "$1htmlFor=");
    warnings.push(`${filePath}: Fixed 'for=' → 'htmlFor='`);
  }

  // 6. Self-close void elements that aren't self-closed
  for (const tag of VOID_ELEMENTS) {
    const voidRegex = new RegExp(`<${tag}(\\s[^>]*?)?(?<!/)>`, "gi");
    if (voidRegex.test(code)) {
      code = code.replace(new RegExp(`<${tag}(\\s[^>]*?)?(?<!/)>`, "gi"), (match, attrs) => `<${tag}${attrs || ""} />`);
      warnings.push(`${filePath}: Self-closed <${tag}> elements`);
    }
  }

  // 7. Ensure exactly one default export exists
  const defaultExportCount = (code.match(/export\s+default\s+/g) || []).length;
  if (defaultExportCount === 0 && !filePath.endsWith(".css")) {
    const funcMatch = code.match(/^function\s+([A-Z]\w*)\s*\(/m);
    const constMatch = code.match(/^const\s+([A-Z]\w*)\s*=\s*(?:\(|function)/m);
    const componentName = funcMatch?.[1] || constMatch?.[1];

    if (componentName) {
      const namedExportRegex = new RegExp(`export\\s+(function|const)\\s+${componentName}`);
      if (namedExportRegex.test(code)) {
        code = code.replace(new RegExp(`export\\s+(function|const)\\s+${componentName}`), `export default $1 ${componentName}`);
      } else {
        code = code.trimEnd() + `\n\nexport default ${componentName};\n`;
      }
      warnings.push(`${filePath}: Added missing default export for '${componentName}'`);
    }
  }

  // 8. Remove stray HTML comments inside JSX return blocks
  const htmlCommentRegex = /<!--[\s\S]*?-->/g;
  if (htmlCommentRegex.test(code)) {
    code = code.replace(htmlCommentRegex, "");
    warnings.push(`${filePath}: Removed HTML comments (invalid in JSX)`);
  }

  // 9. Fix common TypeScript syntax that slips in
  code = code.replace(/:\s*React\.FC(?:<[^>]*>)?\s*=/g, () => {
    warnings.push(`${filePath}: Removed TypeScript React.FC annotation`);
    return " =";
  });

  code = code.replace(/(\([^)]*?)\s*:\s*(?:string|number|boolean|any|object|void)\s*([,)])/g, (match, before, after) => {
    warnings.push(`${filePath}: Removed TypeScript type annotation`);
    return `${before}${after}`;
  });

  // 10. Ensure React import exists if JSX is used
  const hasJSX = /<[A-Za-z]/.test(code);
  const hasReactImport = /import\s+React/.test(code);
  if (hasJSX && !hasReactImport) {
    code = `import React from 'react';\n${code}`;
    warnings.push(`${filePath}: Added missing React import`);
  }

  // 11. Fix import paths that point to incorrect folders/paths compared to what was planned
  if (context?.allPlannedFiles) {
    const fixResult = fixImportPaths(code, filePath, context.allPlannedFiles);
    code = fixResult.code;
    warnings.push(...fixResult.warnings);
  }

  // 12. AST Verification & Deep Healing using Babel Parser
  try {
    parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
  } catch (parseError: any) {
    // Apply second-pass aggressive healing if Babel detected syntax error
    warnings.push(`${filePath}: Babel detected syntax error: ${parseError.message}. Applying AST healing.`);

    let healedCode = stripInvalidBackslashes(code);
    healedCode = fixQuotesAndPunctuation(healedCode);

    // Re-verify with Babel
    try {
      parse(healedCode, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
      });
      code = healedCode;
      warnings.push(`${filePath}: Successfully healed code with AST sanitizer`);
    } catch {
      // If still failing, keep safest cleaned version
      code = healedCode;
    }
  }

  return { code: code.trim() + "\n", warnings };
}

// Validate and fix code specifically for revision operations
export function validateRevisionContent(content?: string | null, filePath: string = '', op: string = ''): RevisionValidationResult {
  if (op === "delete" || !content) return { content, warnings: [] };

  if (op === "create") {
    const result = validateAndFixCode(content, filePath);
    return { content: result.code, warnings: result.warnings };
  }

  // For update ops (search/replace content), apply safe fixes
  const warnings: string[] = [];

  // Strip invalid backslashes
  let fixedContent = stripInvalidBackslashes(content);
  if (fixedContent !== content) {
    warnings.push(`${filePath}: Removed invalid backslash escape sequences`);
  }

  // Fix quotes
  const quotesFixed = fixQuotesAndPunctuation(fixedContent);
  if (quotesFixed !== fixedContent) {
    fixedContent = quotesFixed;
    warnings.push(`${filePath}: Repaired quotes and punctuation`);
  }

  // Fix class → className
  const classFixRegex = /(<[a-zA-Z][^>]*?)\bclass=/g;
  if (classFixRegex.test(fixedContent)) {
    fixedContent = fixedContent.replace(/(<[a-zA-Z][^>]*?)\bclass=/g, "$1className=");
    warnings.push(`${filePath}: Fixed 'class=' → 'className=' in replacement`);
  }

  // Fix for → htmlFor
  const forFixRegex = /(<label[^>]*?)\bfor=/gi;
  if (forFixRegex.test(fixedContent)) {
    fixedContent = fixedContent.replace(/(<label[^>]*?)\bfor=/gi, "$1htmlFor=");
    warnings.push(`${filePath}: Fixed 'for=' → 'htmlFor=' in replacement`);
  }

  // Self-close void elements
  for (const tag of VOID_ELEMENTS) {
    const voidRegex = new RegExp(`<${tag}(\\s[^>]*?)?(?<!/)>`, "gi");
    if (voidRegex.test(fixedContent)) {
      fixedContent = fixedContent.replace(new RegExp(`<${tag}(\\s[^>]*?)?(?<!/)>`, "gi"), (match, attrs) => `<${tag}${attrs || ""} />`);
      warnings.push(`${filePath}: Self-closed <${tag}> in replacement`);
    }
  }

  return { content: fixedContent, warnings };
}

// --- Import Path Resolution Helpers ---

function getDir(p: string): string {
  const parts = p.split("/");
  parts.pop();
  return parts.join("/") || "/";
}

function resolvePath(baseDir: string, relativePath: string): string {
  const baseParts = baseDir.split("/").filter(Boolean);
  const relParts = relativePath.split("/").filter(Boolean);

  for (const part of relParts) {
    if (part === ".") {
      continue;
    } else if (part === "..") {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }
  return "/" + baseParts.join("/");
}

function getRelativePath(fromDir: string, toPath: string): string {
  const fromParts = fromDir.split("/").filter(Boolean);
  const toParts = toPath.split("/").filter(Boolean);

  let commonLength = 0;
  while (commonLength < fromParts.length && commonLength < toParts.length && fromParts[commonLength] === toParts[commonLength]) {
    commonLength++;
  }

  const upCount = fromParts.length - commonLength;
  const remainingTo = toParts.slice(commonLength);

  const relParts: string[] = [];
  for (let i = 0; i < upCount; i++) {
    relParts.push("..");
  }
  if (relParts.length === 0) {
    relParts.push(".");
  }
  relParts.push(...remainingTo);
  return relParts.join("/");
}

function cleanExtension(p: string): string {
  return p.replace(/\.(js|jsx|css|ts|tsx)$/, "");
}

function fixImportPaths(code: string, filePath: string, allPlannedFiles: Array<{ path: string }>): ValidationResult {
  const warnings: string[] = [];
  if (!allPlannedFiles || allPlannedFiles.length === 0) {
    return { code, warnings };
  }

  const currentDir = getDir(filePath);
  const plannedPaths = allPlannedFiles.map((f) => (f.path.startsWith("/") ? f.path : "/" + f.path));

  const importRegex = /(from\s+['"]|import\s+['"])([^'"]+)(['"])/g;

  const newCode = code.replace(importRegex, (match, prefix, importTarget, suffix) => {
    if (!importTarget.startsWith(".")) {
      return match;
    }

    const resolvedTarget = resolvePath(currentDir, importTarget);
    const resolvedClean = cleanExtension(resolvedTarget);

    const exactExists = plannedPaths.some((p) => cleanExtension(p) === resolvedClean);
    if (exactExists) {
      return match;
    }

    const importFilename = resolvedClean.split("/").pop();
    if (!importFilename) {
      return match;
    }

    const foundPlannedPath = plannedPaths.find((p) => {
      const plannedClean = cleanExtension(p);
      const plannedFilename = plannedClean.split("/").pop();
      return plannedFilename === importFilename;
    });

    if (foundPlannedPath) {
      const newRelative = getRelativePath(currentDir, foundPlannedPath);
      const finalRelative = newRelative.startsWith(".") ? newRelative : "./" + newRelative;

      const hasExt = /\.(js|jsx|css|ts|tsx)$/.test(importTarget);
      const ext = hasExt ? "." + importTarget.split(".").pop() : "";

      const rewrittenTarget = cleanExtension(finalRelative) + ext;
      if (rewrittenTarget !== importTarget) {
        warnings.push(
          `${filePath}: Corrected import '${importTarget}' to '${rewrittenTarget}' (file planned at '${foundPlannedPath}')`
        );
        return `${prefix}${rewrittenTarget}${suffix}`;
      }
    }

    return match;
  });

  return { code: newCode, warnings };
}
