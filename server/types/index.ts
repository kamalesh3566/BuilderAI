import { Document, Model, Types } from 'mongoose';

/**
 * JWT Auth Decoded User Payload
 */
export interface AuthUserPayload {
    userId: string;
    email: string;
    tokenVersion?: number;
}

/**
 * User Model Interface
 */
export interface IUser {
    name: string;
    email: string;
    password?: string;
    tokenVersion: number;
    selectedModel?: string;
    customApiKey?: string;
    customVisionApiKey?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IUserMethods {
    comparePassword(candidate: string): Promise<boolean>;
    getDecryptedApiKey(): string;
    getDecryptedVisionApiKey(): string;
}

export interface IUserDocument extends Document, IUser, IUserMethods {
    _id: Types.ObjectId;
}

export type IUserModel = Model<IUserDocument, {}, IUserMethods>;

/**
 * Project File Structure
 */
export type ProjectFiles = Record<string, string>;

/**
 * Chat Message Structure
 */
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    images?: string[];
    timestamp?: Date | string;
}

/**
 * Planned File in Generation Pipeline
 */
export interface PlannedFile {
    path: string;
    description: string;
}

/**
 * Project Version Snapshot
 */
export interface IProjectVersion {
    version: number;
    files: ProjectFiles;
    timestamp?: Date | string;
    prompt?: string;
}

/**
 * Project Model Interface
 */
export interface IProject {
    name: string;
    description?: string;
    owner: Types.ObjectId | string;
    referenceImages?: string[];
    designSpec?: string | null;
    files: ProjectFiles;
    messages: ChatMessage[];
    version: number;
    history: IProjectVersion[];
    published?: boolean;
    status: 'pending' | 'generating' | 'revising' | 'completed' | 'failed' | 'stopped';
    filesPlanned: PlannedFile[];
    filesGenerated: string[];
    currentFile: string | null;
    error: string | null;
    publishedUrl?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IProjectDocument extends Document, Omit<IProject, 'owner'> {
    _id: Types.ObjectId;
    owner: Types.ObjectId;
}

export type IProjectModel = Model<IProjectDocument>;

/**
 * Manifest & Diff Interfaces
 */
export interface FileManifestItem {
    path: string;
    hash: string;
    size: number;
}

export type FileManifest = FileManifestItem[];

export interface FileOp {
    op: 'create' | 'update' | 'delete';
    path: string;
    content?: string | null;
    code?: string | null;
    search?: string | null;
    replace?: string | null;
    description?: string | null;
}

export interface FileDiff {
    manifest: FileManifest;
    changedFiles: string[];
}

/**
 * AI Generation Options
 */
export interface AIModelConfig {
    apiKey?: string;
    visionApiKey?: string;
    model?: string;
    visionModel?: string;
}

export interface GenerateProjectOptions {
    prompt: string;
    images?: string[];
    userConfig?: AIModelConfig;
    onProgress?: (progress: { currentFile: string; completedFiles: string[]; filesPlanned: PlannedFile[] }) => void;
    signal?: AbortSignal;
}

export interface ReviseProjectOptions {
    prompt: string;
    currentFiles: ProjectFiles;
    conversation?: ChatMessage[];
    userConfig?: AIModelConfig;
    signal?: AbortSignal;
}

export interface GenerationResult {
    name: string;
    files: ProjectFiles;
    filesPlanned: PlannedFile[];
    filesGenerated: string[];
    summary?: string;
}
