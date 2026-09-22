/**
 * Client-side code sanitizer to ensure Sandpack preview never crashes
 * due to stray backslashes, escape sequences, or quote mismatches in LLM outputs.
 */

export function stripInvalidBackslashes(code: string): string {
  if (typeof code !== 'string' || !code.includes('\\')) return code;

  let inSingleQuote = false;
  let inDoubleQuote = false;
  const templateStack: Array<string | number> = [];
  let inLineComment = false;
  let inBlockComment = false;
  let result = '';

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1];
    const prevChar = i > 0 ? code[i - 1] : '';

    // Handle line comment
    if (inLineComment) {
      result += char;
      if (char === '\n') inLineComment = false;
      continue;
    }

    // Handle block comment
    if (inBlockComment) {
      result += char;
      if (prevChar === '*' && char === '/') inBlockComment = false;
      continue;
    }

    // Handle single quote string
    if (inSingleQuote) {
      result += char;
      if (char === "'" && prevChar !== '\\') inSingleQuote = false;
      continue;
    }

    // Handle double quote string
    if (inDoubleQuote) {
      result += char;
      if (char === '"' && prevChar !== '\\') inDoubleQuote = false;
      continue;
    }

    // Handle template string literal
    if (templateStack.length > 0) {
      const currentMode = templateStack[templateStack.length - 1];
      if (currentMode === 'LITERAL') {
        if (char === '`' && prevChar !== '\\') {
          templateStack.pop();
          result += char;
          continue;
        } else if (char === '$' && nextChar === '{' && prevChar !== '\\') {
          templateStack.push('EXPR');
          templateStack.push(0);
          result += char + '{';
          i++;
          continue;
        } else {
          result += char;
          continue;
        }
      } else if (typeof currentMode === 'number') {
        if (char === '{') {
          (templateStack[templateStack.length - 1] as number)++;
        } else if (char === '}') {
          if (templateStack[templateStack.length - 1] === 0) {
            templateStack.pop();
            templateStack.pop();
            result += char;
            continue;
          } else {
            (templateStack[templateStack.length - 1] as number)--;
          }
        }
      }
    }

    // Start of comments
    if (char === '/' && nextChar === '/') {
      inLineComment = true;
      result += char;
      continue;
    }
    if (char === '/' && nextChar === '*') {
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
    if (char === '`') {
      templateStack.push('LITERAL');
      result += char;
      continue;
    }

    // Outside strings/comments/regex, backslash is illegal in JS/JSX
    if (char === '\\') {
      continue;
    }

    result += char;
  }

  return result;
}

export function fixQuotesAndPunctuation(code: string): string {
  if (typeof code !== 'string') return code;

  // Fix trailing quote after comma e.g. 'item','
  code = code.replace(/,\s*['"]\s*$/gm, ',');
  code = code.replace(/,\s*['"]\s*(\]|\})/g, ', $1');

  // Fix mismatched JSX template strings: className={`...`} "
  code = code.replace(/(className=\{`[\s\S]*?`\})\s*["']/g, '$1');
  code = code.replace(/(className=\{[^}]+\})\s*["']/g, '$1');

  return code;
}

export function resolveAliases(code: string, filePath: string = ''): string {
  if (typeof code !== 'string' || !code.includes('@/')) return code;

  // Calculate directory depth of the current file
  const parts = filePath.split('/').filter(Boolean);
  const depth = Math.max(0, parts.length - 1);
  const prefix = depth === 0 ? './' : '../'.repeat(depth);

  // Replace from '@/...' or import '@/...'
  return code.replace(/(from|import)\s+['"]@\/([^'"]+)['"]/g, (_match, keyword, subpath) => {
    return `${keyword} '${prefix}${subpath}'`;
  });
}

export function sanitizeCodeForSandpack(code: string, filePath: string = ''): string {
  if (typeof code !== 'string') return '';
  if (filePath.endsWith('.css') || filePath.endsWith('.json') || filePath.endsWith('.html')) {
    return code;
  }
  let cleaned = stripInvalidBackslashes(code);
  cleaned = fixQuotesAndPunctuation(cleaned);
  cleaned = resolveAliases(cleaned, filePath);
  return cleaned;
}
