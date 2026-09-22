import { Router } from "express";
import {
  changePassword,
  deleteAccount,
  exportAccountData,
  getKeys,
  login,
  logout,
  me,
  register,
  updateKeys,
  updateProfile,
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authLimiter, passwordLimiter, accountLimiter } from "../middleware/rateLimiters.js";
import {
  validate,
  RegisterSchema,
  LoginSchema,
  ChangePasswordSchema,
  UpdateProfileSchema,
  SaveKeysSchema,
} from "../middleware/validate.js";

const authRouter: Router = Router();

authRouter.post('/register', authLimiter, validate(RegisterSchema), register);
authRouter.post('/login', authLimiter, validate(LoginSchema), login);
authRouter.post('/logout', logout);
authRouter.get('/me', authMiddleware, me);
authRouter.put('/profile', authMiddleware, validate(UpdateProfileSchema), updateProfile);
authRouter.put('/password', authMiddleware, passwordLimiter, validate(ChangePasswordSchema), changePassword);
authRouter.get('/keys', authMiddleware, getKeys);
authRouter.put('/keys', authMiddleware, validate(SaveKeysSchema), updateKeys);
authRouter.delete('/account', authMiddleware, accountLimiter, deleteAccount);
authRouter.get('/export-data', authMiddleware, accountLimiter, exportAccountData);

export default authRouter;
