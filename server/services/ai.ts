import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import pMap from 'p-map';
import { FileCodeSchema, FilePlanSchema, RevisionResultSchema, RevisionResultData } from './aiSchemas.js';
import { buildFileCodeSystem, FILE_PLAN_SYSTEM, REVISE_SYSTEM, FilePlanItem } from './prompts.js';
import { normalizeContent } from './contentNormalizer.js';
import { validateAndFixCode, validateRevisionContent } from './codeValidator.js';
import { FileManifest, ChatMessage, ProjectFiles, PlannedFile } from '../types/index.js';

const MAX_CONCURRENCY = parseInt(process.env.AI_MAX_CONCURRENCY || '6', 10);

export interface AIClientConfig {
  customModel?: string;
  customApiKey?: string;
}

export interface ModelClientResult {
  model: any;
  modelName: string;
}

export interface GenerateProjectCallbacks {
  designSpec?: string | null;
  onPlan?: (plan: { projectName: string; projectDescription?: string; description?: string; files: any[] }) => Promise<void> | void;
  onFileStart?: (path: string) => Promise<void> | void;
  onFileComplete?: (path: string, code: string) => Promise<void> | void;
}

export interface GeneratedProjectOutput {
  projectName: string;
  description?: string;
  files: ProjectFiles;
}

/**
 * Creates an OpenRouter model client dynamically based on user settings or system defaults.
 */
export function getModelClient(customModel?: string, customApiKey?: string): ModelClientResult {
  const apiKey =
    (typeof customApiKey === 'string' && customApiKey.trim()) || process.env.OPENROUTER_API_KEY;
  const modelName =
    (typeof customModel === 'string' && customModel.trim()) ||
    process.env.OPENROUTER_MODEL ||
    'cohere/north-mini-code:free';

  const client = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  } as any);

  return { model: client(modelName), modelName };
}

// Generate a single file's code
async function generateSingleFile(
  file: PlannedFile,
  allFiles: FilePlanItem[],
  prompt: string,
  alreadyGeneratedFiles: Record<string, string>,
  designSpec?: string | null,
  aiConfig?: AIClientConfig | null
): Promise<{ path: string; code: string }> {
  const { model, modelName } = getModelClient(aiConfig?.customModel, aiConfig?.customApiKey);
  const system = buildFileCodeSystem(allFiles, alreadyGeneratedFiles);

  let userMsg = `Project: ${prompt}\n\nWrite the complete code for: ${file.path}\nPurpose: ${file.description}`;
  if (designSpec) {
    userMsg = `Project: ${prompt}\n\n=== RELEVANT DESIGN SYSTEM SPECS ===\n${designSpec.slice(0, 1200)}\n====================================\n\nWrite the complete code for: ${file.path}\nPurpose: ${file.description}`;
  }

  console.log(`[AI] Creating file: ${file.path} (Model: ${modelName})...`);
  const { object } = await generateObject({
    model,
    schema: FileCodeSchema,
    system,
    prompt: userMsg,
    maxRetries: 2,
  });

  let code = normalizeContent(object.code);

  if (code.trim().length === 0) {
    throw new Error('Generated code is empty after normalization');
  }

  // Apply post-generation validation and auto-fixing
  const validation = validateAndFixCode(code, file.path, { allPlannedFiles: allFiles });
  code = validation.code;

  if (validation.warnings.length > 0) {
    console.log(`[Validator] Code adjustments for ${file.path}:\n  - ${validation.warnings.join('\n  - ')}`);
  }

  console.log(`[AI] Created file: ${file.path} (${code.length} chars)`);
  return { path: file.path, code };
}

// Generate project files: plan first, then build files in order with fallback retries
export async function generateProject(
  prompt: string,
  callbacks?: GenerateProjectCallbacks | null,
  abortSignal?: AbortSignal | null,
  aiConfig?: AIClientConfig | null
): Promise<GeneratedProjectOutput> {
  const designSpec = callbacks?.designSpec;
  const { model, modelName } = getModelClient(aiConfig?.customModel, aiConfig?.customApiKey);

  if (abortSignal?.aborted) {
    throw new Error('Generation stopped by user');
  }

  // Phase 1: Plan
  console.log(
    `[AI] Phase 1: Planning file structure for: "${prompt.slice(0, 80)}..." (Model: ${modelName}, Has Design Spec: ${!!designSpec})`
  );

  let planningPrompt = `Plan a React website for: ${prompt}`;
  if (designSpec) {
    planningPrompt =
      `Plan a React website for: ${prompt}\n\n` +
      `=== REVERSE-ENGINEERED UI/UX DESIGN BLUEPRINT (FROM REFERENCE IMAGES) ===\n` +
      `${designSpec}\n` +
      `=========================================================================\n` +
      `STRICT REQUIREMENT: Plan and build the exact visual structure, color palette, typography hierarchy, button geometry, and component layout described in the UI/UX Blueprint above.`;
  }

  const { object: plan } = await generateObject({
    model,
    schema: FilePlanSchema,
    system: FILE_PLAN_SYSTEM,
    prompt: planningPrompt,
    maxRetries: 2,
  });

  if (abortSignal?.aborted) {
    throw new Error('Generation stopped by user');
  }

  if (!plan.files.find((f) => f.path === '/App.js')) {
    plan.files.unshift({
      path: '/App.js',
      description: 'Main application entry point',
      exports: 'default App',
      imports: ['./styles.css'],
    });
  }

  if (!plan.files.find((f) => f.path === '/styles.css')) {
    plan.files.push({
      path: '/styles.css',
      description: 'Global CSS: Google Font import, keyframe animations, utility classes',
      exports: 'none',
      imports: [],
    });
  }

  if (callbacks?.onPlan) {
    await callbacks.onPlan(plan);
  }

  console.log(
    `[AI] Phase 2: Generating ${plan.files.length} files in parallel (concurrency=${MAX_CONCURRENCY}): ${plan.files.map((f) => f.path).join(', ')}`
  );

  const files: ProjectFiles = {};
  let pendingFiles = plan.files.map((f) => ({ ...f }));
  const maxRetryRounds = 2;

  for (let round = 0; round <= maxRetryRounds; round++) {
    if (pendingFiles.length === 0) break;

    if (abortSignal?.aborted) {
      throw new Error('Generation stopped by user');
    }

    if (round > 0) {
      console.log(
        `[AI] Retry round ${round}/${maxRetryRounds} for ${pendingFiles.length} missing files: ${pendingFiles.map((f) => f.path).join(', ')}`
      );
    }

    const failedFiles: typeof pendingFiles = [];

    await pMap(
      pendingFiles,
      async (file) => {
        if (abortSignal?.aborted) return;
        if (callbacks?.onFileStart) {
          await callbacks.onFileStart(file.path);
        }

        try {
          const alreadyGeneratedFiles = Object.keys(files).reduce((acc, k) => {
            acc[k] = files[k];
            return acc;
          }, {} as Record<string, string>);

          const { code } = await generateSingleFile(
            file,
            plan.files,
            prompt,
            alreadyGeneratedFiles,
            designSpec,
            aiConfig
          );
          files[file.path] = code;

          if (callbacks?.onFileComplete) {
            await callbacks.onFileComplete(file.path, code);
          }
        } catch (fileErr: any) {
          console.error(`[AI] Error generating ${file.path} (round ${round}):`, fileErr?.message || fileErr);
          failedFiles.push(file);
        }
      },
      { concurrency: MAX_CONCURRENCY }
    );

    if (abortSignal?.aborted) {
      throw new Error('Generation stopped by user');
    }

    pendingFiles = failedFiles;
  }

  // Critical files fallback check
  if (!files['/App.js']) {
    console.warn('[AI] /App.js failed to generate; creating minimal fallback');
    files['/App.js'] = `import React from 'react';
import './styles.css';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4">${prompt.replace(/["\\]/g, '')}</h1>
        <p className="text-slate-400">Application initialized successfully.</p>
      </div>
    </div>
  );
}`;
    if (callbacks?.onFileComplete) {
      await callbacks.onFileComplete('/App.js', files['/App.js']);
    }
  }

  if (!files['/styles.css']) {
    files['/styles.css'] = `@import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap');
body {
  margin: 0;
  font-family: 'Urbanist', system-ui, -apple-system, sans-serif;
  background: #09090b;
  color: #f4f4f5;
}`;
    if (callbacks?.onFileComplete) {
      await callbacks.onFileComplete('/styles.css', files['/styles.css']);
    }
  }

  return {
    projectName: plan.projectName,
    description: plan.projectDescription,
    files,
  };
}

// Revise project with user prompt
export async function reviseProject(
  prompt: string,
  manifest: FileManifest,
  relevantFiles: ProjectFiles,
  recentMessages: ChatMessage[] = [],
  designSpec: string | null = null,
  aiConfig: AIClientConfig | null = null
): Promise<RevisionResultData> {
  const { model, modelName } = getModelClient(aiConfig?.customModel, aiConfig?.customApiKey);

  const contextParts = [
    `## File Manifest (${manifest.length} files)\n` +
      manifest.map((f) => `- ${f.path} (size: ${f.size} chars)`).join('\n'),
  ];

  if (Object.keys(relevantFiles).length > 0) {
    contextParts.push('\n## Current File Contents');
    for (const [path, content] of Object.entries(relevantFiles)) {
      contextParts.push(`### File: ${path}\n\`\`\`\n${content}\n\`\`\``);
    }
  }

  if (recentMessages.length > 0) {
    contextParts.push('\n## Recent Conversation');
    for (const msg of recentMessages.slice(-3)) {
      contextParts.push(`${msg.role}: ${msg.content}`);
    }
  }

  if (designSpec) {
    contextParts.push('\n## Reference Design Specification (Extracted from user screenshots)');
    contextParts.push(designSpec);
  }

  contextParts.push(`\n## Revision Request\n${prompt}`);

  console.log(`[AI] Revising project (Model: ${modelName})...`);

  const { object: rawParsed } = await generateObject({
    model,
    schema: RevisionResultSchema,
    system: REVISE_SYSTEM,
    prompt: contextParts.join('\n'),
    maxRetries: 2,
  });

  if (rawParsed && Array.isArray(rawParsed.operations)) {
    rawParsed.operations = rawParsed.operations.map((op: any) => {
      if (!op || typeof op !== 'object') return op;

      const opStr = String(op.op || '').trim().toLowerCase();

      if (['create', 'add', 'new'].includes(opStr)) op.op = 'create';
      else if (['update', 'edit', 'modify', 'patch'].includes(opStr)) op.op = 'update';
      else if (['delete', 'remove', 'del', 'rm'].includes(opStr)) op.op = 'delete';

      if (op.path && typeof op.path === 'string' && !op.path.startsWith('/')) {
        op.path = '/' + op.path;
      }

      if (op.content) op.content = normalizeContent(op.content);
      if (op.search) op.search = normalizeContent(op.search);
      if (op.replace) op.replace = normalizeContent(op.replace);

      if (op.op === 'create' && op.content) {
        const validation = validateRevisionContent(op.content, op.path, 'create');
        op.content = validation.content;
        if (validation.warnings.length > 0) {
          console.log(`[Validator] Revision Create adjustments for ${op.path}:\n  - ${validation.warnings.join('\n  - ')}`);
        }
      } else if (op.op === 'update' && op.replace) {
        const validation = validateRevisionContent(op.replace, op.path, 'update');
        op.replace = validation.content;
        if (validation.warnings.length > 0) {
          console.log(`[Validator] Revision Update adjustments for ${op.path}:\n  - ${validation.warnings.join('\n  - ')}`);
        }
      }
      return op;
    });
  }
  return rawParsed;
}
