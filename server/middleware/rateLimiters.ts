import rateLimit from "express-rate-limit";
import { Request } from "express";

const isProduction = process.env.NODE_ENV === "production";

// Global API rate limiter (generous in dev, strict in prod)
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 300 : 5000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => !isProduction && (req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1"),
    message: { error: "Too many requests from this IP, please try again after 15 minutes." }
});

// Auth rate limiter (15 attempts per 15 minutes to prevent brute-force attacks)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 15 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication attempts. Please try again after 15 minutes." }
});

// AI Generation rate limiter (protect API budget)
export const aiProjectLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: isProduction ? 10 : 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "AI generation quota limit reached. Please wait a few minutes before creating another project." }
});

// AI Chat Revision rate limiter
export const aiChatLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: isProduction ? 30 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many revision requests. Please wait a few minutes before trying again." }
});

// Password update rate limiter (5 attempts per 15 minutes to prevent brute-force credential stuffing)
export const passwordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 5 : 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many password update attempts. Please try again after 15 minutes." }
});

// File update rate limiter (protect server resources)
export const fileUpdateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: isProduction ? 60 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many file update requests. Please wait a moment." }
});

// Account deletion & data export rate limiter
export const accountLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 5 : 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many account data requests. Please try again after 15 minutes." }
});
