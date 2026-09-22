import { Request, Response } from 'express';
import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";
import crypto from "crypto";
import { generateProject, AIClientConfig } from "../services/ai.js";
import { analyzeReferenceImages } from "../services/visionAnalyzer.js";
import { registerGeneration, abortGeneration, cleanupGeneration } from "../services/generationManager.js";
import { sanitizeErrorMessage } from "../utils/sanitizeError.js";

function hashContent(content: string): string {
  return crypto.createHash("md5").update(content).digest("hex").slice(0, 12);
}

const VALID_DATA_IMAGE_REGEX = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-zA-Z0-9+/=]+$/;
const MAX_IMAGE_BASE64_LEN = 7 * 1024 * 1024; // ~5MB raw payload limit

// POST /api/projects
// Create a new project from an AI prompt.
export async function createProject(req: Request, res: Response): Promise<void> {
  const { prompt, images } = req.body;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: "prompt is required and must be a valid string" });
    return;
  }

  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.length > 50000) {
    res.status(400).json({ error: "Prompt cannot exceed 50,000 characters" });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Enforce max 10 projects quota per user to prevent storage & AI abuse
  const existingCount = await Project.countDocuments({ owner: req.user.userId });
  if (existingCount >= 10) {
    res.status(400).json({
      error: "Project quota reached (maximum 10 projects per account). Please delete an existing project before creating a new one.",
    });
    return;
  }

  // Validate images: max 5 images, strict MIME format, and size bounds
  const validImages: string[] = Array.isArray(images)
    ? images
        .slice(0, 5)
        .filter(
          (img: unknown): img is string =>
            typeof img === "string" &&
            img.length <= MAX_IMAGE_BASE64_LEN &&
            VALID_DATA_IMAGE_REGEX.test(img)
        )
    : [];

  // Create project in DB immediately with "pending" status
  const project = await Project.create({
    name: "Planning project...",
    description: trimmedPrompt,
    referenceImages: validImages,
    files: {},
    messages: [
      { role: "user", content: trimmedPrompt, images: validImages },
      {
        role: "assistant",
        content:
          validImages.length > 0
            ? `Received prompt and ${validImages.length} reference screenshot(s). Inspecting visual layout & structure...`
            : 'Planning project structure...',
      },
    ],
    version: 0,
    owner: req.user.userId,
    status: "pending",
    filesPlanned: [],
    filesGenerated: [],
    currentFile: null,
    error: null,
  });

  // Fetch user AI model preferences
  const user = await User.findById(req.user.userId);
  const aiConfig: AIClientConfig & { customVisionApiKey?: string } = {
    customModel: user?.selectedModel || "cohere/north-mini-code:free",
    customApiKey: user ? user.getDecryptedApiKey() : "",
    customVisionApiKey: user ? user.getDecryptedVisionApiKey() : "",
  };

  // Start background generation
  runBackgroundGeneration(project._id.toString(), trimmedPrompt, validImages, aiConfig).catch((err) => {
    console.error(`[Background AI] Fatal generation error for project ${project._id}:`, err);
  });

  res.status(201).json({
    _id: project._id,
    name: project.name,
    description: project.description,
    referenceImages: project.referenceImages,
    files: {},
    messages: project.messages,
    version: project.version,
    status: project.status,
    filesPlanned: project.filesPlanned,
    filesGenerated: project.filesGenerated,
    currentFile: project.currentFile,
    error: project.error,
    createdAt: project.createdAt,
  });
}

// Background worker to progressive generate files and update database in real-time.
async function runBackgroundGeneration(
  projectId: string,
  prompt: string,
  images: string[] = [],
  aiConfig: (AIClientConfig & { customVisionApiKey?: string }) | null = null
): Promise<void> {
  const controller = registerGeneration(projectId);
  const abortSignal = controller.signal;

  try {
    console.log(
      `[Background AI] Starting generation for project ${projectId} (Reference Images: ${images.length}, Model: ${aiConfig?.customModel || 'default'})`
    );
    let designSpec: string | null = null;

    if (abortSignal.aborted) {
      throw new Error("Generation stopped by user");
    }

    // Stage 1: If reference images are provided, run Vision Analysis first
    if (images && images.length > 0) {
      await Project.findByIdAndUpdate(projectId, {
        status: "generating",
        $push: {
          messages: {
            role: "assistant",
            content: `🔍 **Scanning ${images.length} reference screenshot(s)**: Analyzing layout, colors, typography, buttons, and DOM structure...`,
            timestamp: new Date(),
          },
        },
      });

      if (abortSignal.aborted) {
        throw new Error("Generation stopped by user");
      }

      designSpec = await analyzeReferenceImages(images, prompt, aiConfig?.customVisionApiKey);

      if (abortSignal.aborted) {
        throw new Error("Generation stopped by user");
      }

      if (designSpec) {
        await Project.findByIdAndUpdate(projectId, {
          designSpec,
          $push: {
            messages: {
              role: "assistant",
              content: `✨ **Visual Analysis Complete**: Extracted design system, color palette, and component blueprint. Handing off to Code Engine...`,
              timestamp: new Date(),
            },
          },
        });
      }
    }

    if (abortSignal.aborted) {
      throw new Error("Generation stopped by user");
    }

    // Stage 2: Call Code Engine with prompt and design specification
    const result = await generateProject(
      prompt,
      {
        designSpec,
        onPlan: async (plan) => {
          if (abortSignal.aborted) return;
          console.log(`[Background AI] Plan created for project ${projectId}. Planned ${plan.files.length} files.`);
          const fileList = plan.files.map((f) => `- \`${f.path}\`: ${f.description}`).join("\n");

          await Project.findByIdAndUpdate(projectId, {
            name: plan.projectName || "Generated Project",
            status: "generating",
            filesPlanned: plan.files,
            $push: {
              messages: {
                role: "assistant",
                content: `Planned website structure:\n${fileList}`,
                timestamp: new Date(),
              },
            },
          });
        },
        onFileStart: async (path) => {
          if (abortSignal.aborted) return;
          console.log(`[Background AI] Starting file ${path} for project ${projectId}`);
          await Project.findByIdAndUpdate(projectId, {
            currentFile: path,
          });
        },
        onFileComplete: async (path, code) => {
          if (abortSignal.aborted) return;
          console.log(`[Background AI] Finished file ${path} for project ${projectId}`);

          const project = await Project.findById(projectId);

          if (project) {
            project.files = project.files || {};
            project.files[path] = { content: code, hash: hashContent(code) } as any;
            project.filesGenerated = [...(project.filesGenerated || []), path];
            project.messages.push({
              role: "assistant",
              content: `Created file "${path}"`,
              timestamp: new Date(),
            });
            project.currentFile = null;
            project.markModified("files");
            await project.save();
          }
        },
      },
      abortSignal,
      aiConfig
    );

    if (abortSignal.aborted) {
      throw new Error("Generation stopped by user");
    }

    console.log(`[Background AI] Successfully generated project ${projectId}`);

    const project = await Project.findById(projectId);
    if (project) {
      project.status = "completed";
      project.version = 1;
      if (result.description) {
        project.name = result.description;
      }
      project.history = [
        {
          version: 1,
          files: project.files || {},
          prompt: project.description || "Initial website creation",
          timestamp: new Date(),
        },
      ];
      project.messages.push({
        role: "assistant",
        content: `Website generation complete! You can view and edit the files.`,
        timestamp: new Date(),
      });
      await project.save();
    }
  } catch (err: any) {
    if (abortSignal.aborted || err?.message === "Generation stopped by user") {
      console.log(`[Background AI] Generation stopped by user for project ${projectId}`);
      const project = await Project.findById(projectId);
      if (project) {
        project.status = project.filesGenerated && project.filesGenerated.length > 0 ? "completed" : "stopped";
        project.currentFile = null;
        project.messages.push({
          role: "assistant",
          content: `⏹️ Generation stopped by user. Generated files have been preserved.`,
          timestamp: new Date(),
        });
        await project.save();
      }
    } else {
      const cleanError = sanitizeErrorMessage(err?.message || "Unknown generation error");
      console.error(`[Background AI] Fatal generation error for project ${projectId}:`, cleanError);
      await Project.findByIdAndUpdate(projectId, {
        status: "failed",
        error: cleanError,
        currentFile: null,
        $push: {
          messages: {
            role: "assistant",
            content: `❌ Generation failed: ${cleanError}`,
            timestamp: new Date(),
          },
        },
      });
    }
  } finally {
    cleanupGeneration(projectId);
  }
}

// GET /api/projects
// List all projects owned by the user (summary only, no file contents).
export async function listProjects(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const projects = await Project.find(
    { owner: req.user.userId },
    { name: 1, description: 1, version: 1, createdAt: 1, updatedAt: 1 }
  ).sort({ updatedAt: -1 });

  res.json(projects);
}

// GET /api/projects/:id
// Get full project details.
export async function getProject(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = req.params.id as string;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const project = await Project.findOne({ _id: id, owner: req.user.userId });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const filesObj: Record<string, string> = {};
  for (const [path, entry] of Object.entries(project.files || {})) {
    filesObj[path] = typeof entry === 'string' ? entry : (entry as any)?.content || '';
  }

  res.json({
    _id: project._id,
    name: project.name,
    description: project.description,
    files: filesObj,
    messages: project.messages,
    version: project.version,
    history: (project.history || []).map((h) => {
      const histFiles: Record<string, string> = {};
      if (h.files) {
        for (const [p, f] of Object.entries(h.files)) {
          histFiles[p] = typeof f === "string" ? f : (f as any)?.content || "";
        }
      }
      return {
        version: h.version,
        prompt: h.prompt,
        timestamp: h.timestamp,
        fileCount: Object.keys(histFiles).length,
      };
    }),
    status: project.status,
    filesPlanned: project.filesPlanned,
    filesGenerated: project.filesGenerated,
    currentFile: project.currentFile,
    error: project.error,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}

// DELETE /api/projects/:id
// Delete a project.
export async function deleteProject(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = req.params.id as string;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  // Abort active background generation worker if running
  abortGeneration(id);

  const result = await Project.findOneAndDelete({ _id: id, owner: req.user.userId });
  if (!result) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({ success: true });
}

// PUT /api/projects/:id/files
// Update project files (manual edits).
export async function updateProjectFiles(req: Request, res: Response): Promise<void> {
  const { files } = req.body;
  if (!files || typeof files !== 'object' || Array.isArray(files)) {
    res.status(400).json({ error: "files must be a valid key-value object" });
    return;
  }

  const fileEntries = Object.entries(files);
  if (fileEntries.length > 50) {
    res.status(400).json({ error: "Cannot exceed maximum limit of 50 files per project" });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = req.params.id as string;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const project = await Project.findOne({ _id: id, owner: req.user.userId });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Rebuild project files map with content & hashes, ignoring dangerous keys and path traversal
  const newFiles: Record<string, { content: string; hash: string }> = {};
  const dangerousKeys = ["__proto__", "constructor", "prototype"];
  const SAFE_PATH_REGEX = /^\/[a-zA-Z0-9_\-\.\/]+$/;
  const BLOCKED_FILENAMES = ["/.env", "/.git", "/credentials", "/id_rsa", "/.npmrc", "/.yarnrc"];

  for (const [path, content] of fileEntries) {
    if (dangerousKeys.includes(path)) continue;
    if (BLOCKED_FILENAMES.some((b) => path.toLowerCase().startsWith(b))) continue;

    if (
      typeof path === "string" &&
      path.startsWith("/") &&
      SAFE_PATH_REGEX.test(path) &&
      !path.includes("..") &&
      !path.includes("//") &&
      !path.includes("\\") &&
      !path.includes("\0") &&
      typeof content === "string" &&
      content.length <= 1000000 // 1MB per file limit
    ) {
      newFiles[path] = { content, hash: hashContent(content) };
    }
  }

  project.files = newFiles as any;
  await project.save();

  const filesObj: Record<string, string> = {};
  for (const [path, entry] of Object.entries(project.files)) {
    filesObj[path] = typeof entry === 'string' ? entry : (entry as any)?.content || '';
  }

  res.json({
    _id: project._id,
    name: project.name,
    description: project.description,
    files: filesObj,
    messages: project.messages,
    version: project.version,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}

// POST /api/projects/:id/publish
// Mark a project as publicly published.
export async function publishProject(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = req.params.id as string;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const project = await Project.findOneAndUpdate(
    { _id: id, owner: req.user.userId },
    { published: true },
    { returnDocument: "after" }
  );

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json({ success: true, published: project.published });
}

// GET /api/projects/public/:id
// Get a publicly published project details (without auth).
export async function getPublicProject(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const project = await Project.findById(id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (!project.published) {
    res.status(403).json({ error: "Project is not published yet" });
    return;
  }

  const filesObj: Record<string, string> = {};
  for (const [path, entry] of Object.entries(project.files)) {
    filesObj[path] = typeof entry === 'string' ? entry : (entry as any)?.content || '';
  }

  res.json({
    _id: project._id,
    name: project.name,
    description: project.description,
    files: filesObj,
    version: project.version,
  });
}

// POST /api/projects/:id/stop
// Stop/Abort in-flight generation for a project.
export async function stopProjectGeneration(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = req.params.id as string;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const project = await Project.findOne({ _id: id, owner: req.user.userId });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Abort active background generation worker
  abortGeneration(id);

  // Update project state in DB
  const hasFiles = project.filesGenerated && project.filesGenerated.length > 0;
  project.status = hasFiles ? "completed" : "stopped";
  project.currentFile = null;
  project.messages.push({
    role: "assistant",
    content: `⏹️ Generation stopped by user. ${hasFiles ? "Generated files have been saved." : ""}`,
    timestamp: new Date(),
  });

  await project.save();

  const filesObj: Record<string, string> = {};
  for (const [path, entry] of Object.entries(project.files || {})) {
    filesObj[path] = typeof entry === "string" ? entry : (entry as any)?.content || "";
  }

  res.json({
    _id: project._id,
    name: project.name,
    description: project.description,
    files: filesObj,
    messages: project.messages,
    version: project.version,
    status: project.status,
    filesPlanned: project.filesPlanned,
    filesGenerated: project.filesGenerated,
    currentFile: project.currentFile,
    error: project.error,
    updatedAt: project.updatedAt,
  });
}

// POST /api/projects/:id/rollback
// Rollback project to a previous historical version snapshot.
export async function rollbackProject(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = req.params.id as string;
  const { targetVersion } = req.body;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  if (!Number.isInteger(targetVersion) || targetVersion < 1) {
    res.status(400).json({ error: "targetVersion must be a valid positive integer" });
    return;
  }

  const project = await Project.findOne({ _id: id, owner: req.user.userId });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (targetVersion > project.version) {
    res.status(400).json({
      error: `Cannot rollback to version v${targetVersion} higher than current version v${project.version}`,
    });
    return;
  }

  // Find the historical version
  const historicalSnapshot = (project.history || []).find((h) => h.version === targetVersion);
  if (!historicalSnapshot && targetVersion !== 1) {
    res.status(404).json({ error: `Version v${targetVersion} not found in project history` });
    return;
  }

  const targetFiles = historicalSnapshot ? historicalSnapshot.files : project.files;

  // Save current version before rolling back so user can undo
  project.history = project.history || [];
  project.history.push({
    version: project.version,
    files: project.files,
    prompt: `Pre-rollback snapshot before restoring v${targetVersion}`,
    timestamp: new Date(),
  });

  const newVersion = project.version + 1;
  project.version = newVersion;
  project.files = targetFiles;
  project.status = "completed";
  project.messages.push({
    role: "assistant",
    content: `⏪ **Rolled back project to Version v${targetVersion}**. All files restored to that version snapshot. (Now on v${newVersion})`,
    timestamp: new Date(),
  });
  project.markModified("files");
  project.markModified("history");
  await project.save();

  const filesObj: Record<string, string> = {};
  for (const [path, entry] of Object.entries(project.files || {})) {
    filesObj[path] = typeof entry === "string" ? entry : (entry as any)?.content || "";
  }

  res.json({
    success: true,
    project: {
      _id: project._id,
      name: project.name,
      description: project.description,
      files: filesObj,
      messages: project.messages,
      version: project.version,
      history: (project.history || []).map((h) => ({
        version: h.version,
        prompt: h.prompt,
        timestamp: h.timestamp,
        fileCount: Object.keys(h.files || {}).length,
      })),
      status: project.status,
      updatedAt: project.updatedAt,
    },
  });
}
