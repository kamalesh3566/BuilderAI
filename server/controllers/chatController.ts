import { Request, Response } from 'express';
import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";
import { buildManifest } from "../services/diff.js";
import { reviseProject } from "../services/ai.js";
import { applyOperations } from "../services/diff.js";
import { analyzeReferenceImages } from "../services/visionAnalyzer.js";
import { sanitizeErrorMessage } from "../utils/sanitizeError.js";
import { ChatMessage, ProjectFiles } from '../types/index.js';

const VALID_DATA_IMAGE_REGEX = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-zA-Z0-9+/=]+$/;
const MAX_IMAGE_BASE64_LEN = 7 * 1024 * 1024; // ~5MB limit

// POST /api/projects/:id/chat
// Send a prompt to revise an existing project with stage-1 Vision AI support
export async function chat(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { images } = req.body;
  const message = req.body.prompt || req.body.message;

  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Prompt/Message is required" });
    return;
  }

  const trimmedPrompt = message.trim();
  if (trimmedPrompt.length > 50000) {
    res.status(400).json({ error: "Message exceeds maximum allowed length of 50,000 characters." });
    return;
  }

  const project = await Project.findOne({ _id: id, owner: req.user.userId });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Fetch user AI model preferences
  const user = await User.findById(req.user.userId);
  const aiConfig = {
    customModel: user?.selectedModel || "cohere/north-mini-code:free",
    customApiKey: user ? user.getDecryptedApiKey() : "",
    customVisionApiKey: user ? user.getDecryptedVisionApiKey() : "",
  };

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

  // Set status to revising and save user prompt immediately
  project.status = "revising";
  project.messages.push({
    role: "user",
    content: trimmedPrompt,
    images: validImages,
    timestamp: new Date(),
  });
  await project.save();

  try {
    let designSpec: string | null = null;
    if (validImages.length > 0) {
      console.log(`[Vision AI] Analyzing ${validImages.length} revision reference images for project ${project._id}...`);
      designSpec = await analyzeReferenceImages(validImages, trimmedPrompt, aiConfig.customVisionApiKey);
    }

    // Build compact manifest (path + hash + size) instead of sending all code
    const manifest = buildManifest(project.files);

    // Include ALL file contents so the AI can do accurate search/replace
    const relevantFiles: ProjectFiles = {};
    for (const [path, entry] of Object.entries(project.files)) {
      relevantFiles[path] = typeof entry === 'string' ? entry : (entry as any)?.content || '';
    }

    // Recent messages for context (last 4 max)
    const recentMessages: ChatMessage[] = project.messages.slice(-4).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    console.log(
      `[AI] Revising project ${project._id}: "${trimmedPrompt.slice(0, 80)}..." ` +
        `(${manifest.length} files, manifest ~${JSON.stringify(manifest).length} chars, Has Design Spec: ${!!designSpec}, Model: ${aiConfig.customModel || 'default'})`
    );

    // Call AI with manifest + relevant files + designSpec + aiConfig
    const result = await reviseProject(trimmedPrompt, manifest, relevantFiles, recentMessages, designSpec, aiConfig);

    console.log(`[AI] Got ${result.operations.length} operations: ${result.description}`);

    // Apply operations to file map
    const { files: updatedFiles, applied, errors } = applyOperations(project.files, result.operations);

    if (errors.length > 0) {
      console.warn(`[Diff] Errors applying operations:`, errors);
    }

    // Save previous snapshot to history
    project.history = project.history || [];
    project.history.push({
      version: project.version,
      files: project.files,
      prompt: trimmedPrompt,
      timestamp: new Date(),
    });
    project.markModified("history");

    // Update project in DB
    project.files = updatedFiles;
    project.markModified("files");
    project.version += 1;
    project.status = "completed";
    project.messages.push({
      role: "assistant",
      content: result.description + (errors.length > 0 ? `\n\n Some operations failed: ${errors.join(", ")}` : ""),
      timestamp: new Date(),
    });

    await project.save();

    // Return updated project
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
      history: (project.history || []).map((h) => ({
        version: h.version,
        prompt: h.prompt,
        timestamp: h.timestamp,
        fileCount: Object.keys(h.files || {}).length,
      })),
      status: project.status,
      applied,
      errors,
      aiDescription: result.description,
    });
  } catch (err: any) {
    const cleanError = sanitizeErrorMessage(err?.message || "Failed to process revision request");
    console.error(`[AI Revision Error] ${cleanError}`);
    project.status = "completed";
    project.messages.push({
      role: "assistant",
      content: `⚠️ Revision encounter an issue: ${cleanError}`,
      timestamp: new Date(),
    });
    await project.save();
    res.status(500).json({ error: cleanError });
  }
}
