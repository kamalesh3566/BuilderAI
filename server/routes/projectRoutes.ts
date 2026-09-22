import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import {
  createProject,
  deleteProject,
  getProject,
  getPublicProject,
  listProjects,
  publishProject,
  rollbackProject,
  stopProjectGeneration,
  updateProjectFiles,
} from "../controllers/projectController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { chat } from "../controllers/chatController.js";
import { aiChatLimiter, aiProjectLimiter, fileUpdateLimiter } from "../middleware/rateLimiters.js";
import {
  validate,
  GenerateProjectSchema,
  ReviseProjectSchema,
  SaveFilesSchema,
  RollbackSchema,
} from "../middleware/validate.js";

const projectRouter: Router = Router();

// Validate :id format globally to prevent Mongoose CastError 500 exceptions
projectRouter.param("id", (_req: Request, res: Response, next: NextFunction, id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "Invalid project ID format" });
    return;
  }
  next();
});

// Public Route
projectRouter.get("/public/:id", getPublicProject);

// Protect all following routes
projectRouter.use(authMiddleware);

projectRouter.post("/", aiProjectLimiter, validate(GenerateProjectSchema), createProject);
projectRouter.get("/", listProjects);
projectRouter.get("/:id", getProject);
projectRouter.delete("/:id", deleteProject);
projectRouter.put("/:id/files", fileUpdateLimiter, validate(SaveFilesSchema), updateProjectFiles);
projectRouter.post("/:id/publish", publishProject);
projectRouter.post("/:id/stop", stopProjectGeneration);
projectRouter.post("/:id/rollback", validate(RollbackSchema), rollbackProject);

// Chat / Revisions
projectRouter.post("/:id/chat", aiChatLimiter, validate(ReviseProjectSchema), chat);

export default projectRouter;
