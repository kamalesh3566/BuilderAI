

import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { encryptText, decryptText } from '../utils/encryption.js';
import { IUserDocument, IUserModel } from '../types/index.js';

const UserSchema = new Schema<IUserDocument, IUserModel>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        tokenVersion: { type: Number, default: 0 },
        selectedModel: { type: String, default: "cohere/north-mini-code:free" },
        customApiKey: { type: String, default: "" }, // Code generation API key
        customVisionApiKey: { type: String, default: "" }, // Vision AI API key
    },
    { timestamps: true }
);

// Hash password and encrypt custom API keys before saving
UserSchema.pre('save', async function (this: IUserDocument) {
    if (this.isModified('password') && this.password) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    if (this.isModified('customApiKey') && this.customApiKey) {
        const trimmed = this.customApiKey.trim();
        if (trimmed && !trimmed.startsWith('enc_v1:')) {
            this.customApiKey = encryptText(trimmed);
        }
    }
    if (this.isModified('customVisionApiKey') && this.customVisionApiKey) {
        const trimmed = this.customVisionApiKey.trim();
        if (trimmed && !trimmed.startsWith('enc_v1:')) {
            this.customVisionApiKey = encryptText(trimmed);
        }
    }
});

// Compare password method
UserSchema.methods.comparePassword = async function (this: IUserDocument, candidate: string): Promise<boolean> {
    if (!candidate || typeof candidate !== "string" || !this.password) return false;
    return bcrypt.compare(candidate, this.password);
};

// Decrypt Code API key for AI generation
UserSchema.methods.getDecryptedApiKey = function (this: IUserDocument): string {
    if (!this.customApiKey) return "";
    return decryptText(this.customApiKey);
};

// Decrypt Vision API key for Vision AI analysis
UserSchema.methods.getDecryptedVisionApiKey = function (this: IUserDocument): string {
    if (!this.customVisionApiKey) return "";
    return decryptText(this.customVisionApiKey);
};

export const User = mongoose.model<IUserDocument, IUserModel>('User', UserSchema);
export default User;
