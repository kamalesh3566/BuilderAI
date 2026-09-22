import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import jwt from 'jsonwebtoken';
import { decryptText } from '../utils/encryption.js';
import { abortGeneration } from '../services/generationManager.js';
import { IUserDocument, AuthUserPayload } from '../types/index.js';
import { logSecurityAudit } from '../utils/securityLogger.js';

const JWT_SECRET = process.env.JWT_SECRET || "builder_ai_dev_jwt_secret";

// Helper to set cookie and return token with embedded tokenVersion
const setSessionCookie = (res: Response, payload: AuthUserPayload): string => {
  const token = jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      tokenVersion: payload.tokenVersion ?? 0,
    },
    JWT_SECRET,
    { expiresIn: "30d", algorithm: "HS256" }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/",
  });

  return token;
};

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body;

  const trimmedName = name.trim();
  const trimmedEmail = email.toLowerCase().trim();

  const existing = await User.findOne({ email: trimmedEmail });
  if (existing) {
    logSecurityAudit({
      action: "AUTH_REGISTER_SUCCESS",
      req,
      email: trimmedEmail,
      status: "BLOCKED",
      reason: "Email already registered",
    });
    res.status(400).json({ error: "An account with this email already exists" });
    return;
  }

  const user = await User.create({
    name: trimmedName,
    email: trimmedEmail,
    password,
    tokenVersion: 0,
  });

  const token = setSessionCookie(res, {
    userId: user._id.toString(),
    email: user.email,
    tokenVersion: user.tokenVersion || 0,
  });

  logSecurityAudit({
    action: "AUTH_REGISTER_SUCCESS",
    req,
    userId: user._id.toString(),
    email: user.email,
    status: "SUCCESS",
  });

  res.status(201).json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const trimmedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: trimmedEmail });
  if (!user) {
    logSecurityAudit({
      action: "AUTH_LOGIN_FAILED",
      req,
      email: trimmedEmail,
      status: "FAILED",
      reason: "User email not found",
    });
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    logSecurityAudit({
      action: "AUTH_LOGIN_FAILED",
      req,
      userId: user._id.toString(),
      email: trimmedEmail,
      status: "FAILED",
      reason: "Incorrect password attempt",
    });
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = setSessionCookie(res, {
    userId: user._id.toString(),
    email: user.email,
    tokenVersion: user.tokenVersion || 0,
  });

  logSecurityAudit({
    action: "AUTH_LOGIN_SUCCESS",
    req,
    userId: user._id.toString(),
    email: user.email,
    status: "SUCCESS",
  });

  res.status(200).json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      selectedModel: user.selectedModel,
      hasCustomApiKey: Boolean(user.customApiKey && user.customApiKey.length > 0),
      hasCustomVisionApiKey: Boolean(user.customVisionApiKey && user.customVisionApiKey.length > 0),
      createdAt: user.createdAt,
    },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  // Extract token if present to revoke tokenVersion server-side
  const authPayload = req.user as AuthUserPayload | undefined;
  if (authPayload && authPayload.userId) {
    await User.findByIdAndUpdate(authPayload.userId, { $inc: { tokenVersion: 1 } });
    logSecurityAudit({
      action: "AUTH_LOGOUT",
      req,
      userId: authPayload.userId,
      email: authPayload.email,
      status: "SUCCESS",
      reason: "Server-side token version incremented to invalidate active JWTs",
    });
  }

  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 0,
    path: "/",
  });

  res.json({ success: true, message: "Logged out and all session tokens invalidated." });
}

// Helper to sanitize and mask user object before sending to client
function sanitizeUserResponse(userDoc: IUserDocument | null) {
  if (!userDoc) return null;
  let hasKey = false;
  let maskedKey = "";
  let hasVisionKey = false;
  let maskedVisionKey = "";

  try {
    const decryptedKey = typeof userDoc.getDecryptedApiKey === 'function' ? userDoc.getDecryptedApiKey() : (userDoc.customApiKey ? decryptText(userDoc.customApiKey) : "");
    hasKey = Boolean(decryptedKey && decryptedKey.trim().length > 0);
    if (hasKey && decryptedKey) {
      const trimmed = decryptedKey.trim();
      maskedKey = trimmed.length > 8 ? `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}` : "********";
    }
  } catch (_e) {
    hasKey = false;
  }

  try {
    const decryptedVisionKey = typeof userDoc.getDecryptedVisionApiKey === 'function' ? userDoc.getDecryptedVisionApiKey() : (userDoc.customVisionApiKey ? decryptText(userDoc.customVisionApiKey) : "");
    hasVisionKey = Boolean(decryptedVisionKey && decryptedVisionKey.trim().length > 0);
    if (hasVisionKey && decryptedVisionKey) {
      const trimmed = decryptedVisionKey.trim();
      maskedVisionKey = trimmed.length > 8 ? `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}` : "********";
    }
  } catch (_e) {
    hasVisionKey = false;
  }

  return {
    _id: userDoc._id,
    name: userDoc.name,
    email: userDoc.email,
    selectedModel: userDoc.selectedModel || "cohere/north-mini-code:free",
    hasCustomApiKey: hasKey,
    maskedApiKey: maskedKey,
    hasCustomVisionApiKey: hasVisionKey,
    maskedVisionApiKey: maskedVisionKey,
    createdAt: userDoc.createdAt,
    updatedAt: userDoc.updatedAt,
  };
}

// GET /api/auth/me
export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = await User.findById(req.user.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    user: sanitizeUserResponse(user),
  });
}

// GET /api/auth/keys
export async function getKeys(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = await User.findById(req.user.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(sanitizeUserResponse(user));
}

// PUT /api/auth/keys
export async function updateKeys(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { customApiKey, customVisionApiKey, selectedModel } = req.body;

  const user = await User.findById(req.user.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (customApiKey !== undefined) {
    user.customApiKey = customApiKey ? customApiKey.trim() : "";
  }

  if (customVisionApiKey !== undefined) {
    user.customVisionApiKey = customVisionApiKey ? customVisionApiKey.trim() : "";
  }

  if (selectedModel && typeof selectedModel === "string") {
    user.selectedModel = selectedModel.trim();
  }

  await user.save();

  logSecurityAudit({
    action: "BYOK_KEY_UPDATED",
    req,
    userId: user._id.toString(),
    email: user.email,
    status: "SUCCESS",
    metadata: {
      hasCustomApiKey: Boolean(user.customApiKey),
      hasCustomVisionApiKey: Boolean(user.customVisionApiKey),
      selectedModel: user.selectedModel,
    },
  });

  res.json({
    success: true,
    message: "Settings and API keys updated securely.",
    user: sanitizeUserResponse(user),
  });
}

// DELETE /api/auth/keys
export async function deleteKeys(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = await User.findById(req.user.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  user.customApiKey = "";
  user.customVisionApiKey = "";
  await user.save();

  logSecurityAudit({
    action: "BYOK_KEY_DELETED",
    req,
    userId: user._id.toString(),
    email: user.email,
    status: "SUCCESS",
  });

  res.json({
    success: true,
    message: "Custom API keys deleted securely.",
    user: sanitizeUserResponse(user),
  });
}

// PUT /api/auth/profile
export async function updateProfile(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { name } = req.body;
  const user = await User.findById(req.user.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  user.name = name.trim();
  await user.save();

  res.json({
    success: true,
    user: sanitizeUserResponse(user),
  });
}

// PUT /api/auth/password
export async function changePassword(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const isValid = await user.comparePassword(currentPassword);
  if (!isValid) {
    logSecurityAudit({
      action: "AUTH_PASSWORD_CHANGED",
      req,
      userId: user._id.toString(),
      email: user.email,
      status: "FAILED",
      reason: "Incorrect current password",
    });
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  user.password = newPassword;
  // Increment tokenVersion to immediately revoke any stolen or existing sessions
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  const freshToken = setSessionCookie(res, {
    userId: user._id.toString(),
    email: user.email,
    tokenVersion: user.tokenVersion,
  });

  logSecurityAudit({
    action: "AUTH_PASSWORD_CHANGED",
    req,
    userId: user._id.toString(),
    email: user.email,
    status: "SUCCESS",
    reason: "Password changed successfully and older session tokens revoked",
  });

  res.json({
    success: true,
    token: freshToken,
    message: "Password updated successfully. Other active sessions have been revoked.",
  });
}

// DELETE /api/auth/account
export async function deleteAccount(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const userId = req.user.userId;

  // Find all projects to abort active in-flight generations
  const userProjects = await Project.find({ owner: userId }, { _id: 1 });
  for (const p of userProjects) {
    abortGeneration(p._id.toString());
  }

  // Delete all user projects from database
  const deleteProjectsResult = await Project.deleteMany({ owner: userId });

  // Delete user account
  const deleteUserResult = await User.findByIdAndDelete(userId);

  if (!deleteUserResult) {
    res.status(404).json({ error: "User account not found" });
    return;
  }

  logSecurityAudit({
    action: "ACCOUNT_DELETED",
    req,
    userId,
    status: "SUCCESS",
    metadata: { deletedProjectsCount: deleteProjectsResult.deletedCount },
  });

  // Invalidate session cookie
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 0,
    path: "/",
  });

  res.json({
    success: true,
    message: "Account and all associated projects deleted permanently.",
    deletedProjects: deleteProjectsResult.deletedCount || 0,
  });
}

// GET /api/auth/export-data
export async function exportAccountData(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = await User.findById(req.user.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const projects = await Project.find({ owner: req.user.userId });

  logSecurityAudit({
    action: "ACCOUNT_DATA_EXPORTED",
    req,
    userId: user._id.toString(),
    email: user.email,
    status: "SUCCESS",
  });

  const exportPayload = {
    profile: sanitizeUserResponse(user),
    projectCount: projects.length,
    projects: projects.map((p) => {
      const filesObj: Record<string, string> = {};
      for (const [path, entry] of Object.entries(p.files || {})) {
        filesObj[path] = typeof entry === "string" ? entry : (entry as any)?.content || "";
      }
      return {
        id: p._id,
        name: p.name,
        description: p.description,
        version: p.version,
        status: p.status,
        files: filesObj,
        messages: p.messages,
        historyCount: (p.history || []).length,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    }),
    exportedAt: new Date().toISOString(),
    platform: "BuilderAI Studio",
  };

  res.json(exportPayload);
}
