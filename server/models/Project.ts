import mongoose, { Schema } from 'mongoose';
import { IProjectDocument, IProjectModel } from '../types/index.js';

const MessageSchema = new Schema(
    {
        role: { type: String, enum: ["user", "assistant", "system"], required: true },
        content: { type: String, required: true },
        images: { type: [String], default: [] },
        timestamp: { type: Date, default: Date.now },
    },
    { _id: false }
);

const PlannedFileSchema = new Schema(
    {
        path: { type: String, required: true },
        description: { type: String, required: true },
    },
    { _id: false }
);

const HistorySchema = new Schema(
    {
        version: { type: Number, required: true },
        files: { type: Schema.Types.Mixed, required: true },
        prompt: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now },
    },
    { _id: false }
);

const ProjectSchema = new Schema<IProjectDocument, IProjectModel>(
    {
        name: { type: String, required: true, default: "Untitled Project" },
        description: { type: String, default: "" },
        referenceImages: { type: [String], default: [] },
        designSpec: { type: String, default: null },
        files: { type: Schema.Types.Mixed, default: {} },
        messages: { type: [MessageSchema], default: [] },
        version: { type: Number, default: 0 },
        history: { type: [HistorySchema], default: [] },
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
        published: { type: Boolean, default: false },
        publishedUrl: { type: String, default: null },
        status: {
            type: String,
            enum: ["pending", "generating", "revising", "completed", "failed", "stopped"],
            default: "pending",
        },
        filesPlanned: { type: [PlannedFileSchema], default: [] },
        filesGenerated: { type: [String], default: [] },
        currentFile: { type: String, default: null },
        error: { type: String, default: null },
    },
    { timestamps: true }
);

export const Project = mongoose.model<IProjectDocument, IProjectModel>('Project', ProjectSchema);
export default Project;
