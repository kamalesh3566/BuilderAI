import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

/**
 * Generic Express middleware to validate request body, query, and params against a Zod schema.
 */
export const validate = (schema: z.ZodObject<any, any> | z.ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed: any = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Assign parsed sanitized data
      if (parsed && typeof parsed === "object") {
        if (parsed.body !== undefined) req.body = parsed.body;
        if (parsed.query !== undefined) req.query = parsed.query;
        if (parsed.params !== undefined) req.params = parsed.params;
      }

      next();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const issues = (err as any).issues || (err as any).errors || [];
        const formattedErrors = issues.map((e: any) => ({
          field: Array.isArray(e.path) ? e.path.join(".") : String(e.path),
          message: e.message,
        }));

        res.status(400).json({
          error: "Validation failed",
          details: formattedErrors,
        });
        return;
      }

      res.status(400).json({ error: "Malformed request payload" });
    }
  };
};

// -------------------------------------------------------------
// Authentication Schemas
// -------------------------------------------------------------

export const RegisterSchema = z.object({
  body: z.object({
    name: z.string({ error: "Name is required" }).trim().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters"),
    email: z.string({ error: "Email is required" }).trim().email("Invalid email format").max(100, "Email cannot exceed 100 characters"),
    password: z.string({ error: "Password is required" }).min(6, "Password must be at least 6 characters").max(128, "Password cannot exceed 128 characters"),
  }),
});

export const LoginSchema = z.object({
  body: z.object({
    email: z.string({ error: "Email is required" }).trim().email("Invalid email format").max(100),
    password: z.string({ error: "Password is required" }).min(1).max(128),
  }),
});

export const ChangePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters").max(128),
  }),
});

export const UpdateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(50),
  }),
});

// -------------------------------------------------------------
// User BYOK API Key Schemas
// -------------------------------------------------------------

export const SaveKeysSchema = z.object({
  body: z.object({
    customApiKey: z.string().max(256).optional().nullable(),
    customVisionApiKey: z.string().max(256).optional().nullable(),
    selectedModel: z.string().max(100).optional().nullable(),
  }),
});

// -------------------------------------------------------------
// Project & AI Schemas
// -------------------------------------------------------------

export const GenerateProjectSchema = z.object({
  body: z.object({
    prompt: z.string({ error: "Prompt is required" }).trim().min(3, "Prompt must be at least 3 characters").max(4000, "Prompt cannot exceed 4000 characters"),
    images: z.array(z.string()).max(10, "Maximum 10 reference screenshots allowed").optional(),
  }),
});

export const ReviseProjectSchema = z.object({
  body: z.object({
    message: z.string({ error: "Message is required" }).trim().min(1, "Message cannot be empty").max(3000, "Message cannot exceed 3000 characters"),
    images: z.array(z.string()).max(10).optional(),
  }),
});

export const SaveFilesSchema = z.object({
  body: z.object({
    files: z.record(z.string(), z.string()).refine((files) => Object.keys(files).length <= 200, {
      message: "Project cannot exceed 200 files",
    }),
  }),
});

export const RollbackSchema = z.object({
  body: z.object({
    version: z.number().int().positive("Version must be a positive integer"),
  }),
});
