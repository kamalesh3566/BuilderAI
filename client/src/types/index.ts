import { ReactNode } from 'react';

export interface User {
  _id: string;
  name: string;
  email: string;
  selectedModel?: string;
  customApiKey?: string;
  hasCustomApiKey?: boolean;
  customVisionApiKey?: string;
  hasCustomVisionApiKey?: boolean;
  createdAt?: string | Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
  timestamp?: string | Date;
}

export interface PlannedFile {
  path: string;
  description: string;
}

export interface ProjectVersionHistoryItem {
  version: number;
  prompt?: string;
  timestamp?: string | Date;
  fileCount?: number;
  files?: Record<string, any>;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  referenceImages?: string[];
  files: Record<string, any>;
  messages: ChatMessage[];
  version: number;
  history?: ProjectVersionHistoryItem[];
  published?: boolean;
  status: 'pending' | 'generating' | 'revising' | 'completed' | 'failed' | 'stopped';
  filesPlanned?: PlannedFile[];
  filesGenerated?: string[];
  currentFile?: string | null;
  error?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ProjectSummary {
  _id: string;
  name: string;
  description?: string;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type DeviceViewport = 'desktop' | 'tablet' | 'mobile';

export type SettingsTab = 'profile' | 'models' | 'security' | 'terms' | 'privacy';

export interface AppContextType {
  user: User | null;
  loadingUser: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  projects: ProjectSummary[];
  loadingProjects: boolean;
  activeProject: Project | null;
  loadingActiveProject: boolean;
  chatLoading: boolean;
  generatingProject: boolean;
  activeFile: string;
  showCode: boolean;
  deviceViewport: DeviceViewport;
  isHistoryOpen: boolean;
  isCommandPaletteOpen: boolean;
  setActiveFile: React.Dispatch<React.SetStateAction<string>>;
  setShowCode: React.Dispatch<React.SetStateAction<boolean>>;
  setDeviceViewport: React.Dispatch<React.SetStateAction<DeviceViewport>>;
  setIsHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadProjects: () => Promise<void>;
  loadProject: (id: string, silent?: boolean) => Promise<void>;
  handleGenerate: (prompt: string, images?: string[]) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profileData: string | Partial<User>) => Promise<any>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<any>;
  deleteAccount: () => Promise<any>;
  exportAccountData: () => Promise<any>;
  settingsModalOpen: boolean;
  settingsTab: SettingsTab;
  openSettings: (tab?: SettingsTab) => void;
  closeSettings: () => void;
  updateProjectFiles: (files: Record<string, string>) => Promise<void>;
  handleChat: (prompt: string, images?: string[]) => Promise<void>;
  handleStopGeneration: (projectId?: string) => Promise<void>;
  handleRollbackProject: (targetVersion: number) => Promise<void>;
}

export interface AppContextProviderProps {
  children: ReactNode;
}
