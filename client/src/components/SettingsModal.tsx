import React, { useState, useEffect, useRef } from 'react';
import {
    UserIcon,
    LockIcon,
    FileTextIcon,
    ShieldCheckIcon,
    XIcon,
    Loader2Icon,
    CheckCircle2Icon,
    SparklesIcon,
    FolderKanbanIcon,
    KeyIcon,
    CpuIcon,
    EyeIcon,
    EyeOffIcon,
    DownloadIcon,
    Trash2Icon,
    AlertTriangleIcon
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import moment from 'moment';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import gsap from 'gsap';

export type SettingsTab = 'profile' | 'models' | 'security' | 'terms' | 'privacy';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: SettingsTab;
}

/**
 * SettingsModal Component
 * 
 * Central account management dashboard featuring:
 * - Profile details & account deletion / data export.
 * - Dual-engine BYOK AI configurations (Cohere & Gemini Vision).
 * - Password changes with live password strength meter validation.
 * - Full Terms of Service & Privacy Policy views in unified fixed-dimension container.
 * - GSAP-animated modal reveal and smooth tab switching transitions.
 */
const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab = 'profile' }) => {
    const { user, projects, updateProfile, changePassword, deleteAccount, exportAccountData } = useAppContext();
    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const backdropRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);

    // Profile state
    const [name, setName] = useState<string>(user?.name || '');
    const [savingProfile, setSavingProfile] = useState<boolean>(false);

    // Password state
    const [currentPassword, setCurrentPassword] = useState<string>('');
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [savingPassword, setSavingPassword] = useState<boolean>(false);

    // Dual AI Engine BYOK states
    const [customApiKey, setCustomApiKey] = useState<string>(user?.customApiKey || '');
    const [customVisionApiKey, setCustomVisionApiKey] = useState<string>(user?.customVisionApiKey || '');
    const [showApiKey, setShowApiKey] = useState<boolean>(false);
    const [showVisionApiKey, setShowVisionApiKey] = useState<boolean>(false);
    const [savingAiSettings, setSavingAiSettings] = useState<boolean>(false);

    // Password visibility states
    const [showCurrentPw, setShowCurrentPw] = useState<boolean>(false);
    const [showNewPw, setShowNewPw] = useState<boolean>(false);
    const [showConfirmPw, setShowConfirmPw] = useState<boolean>(false);

    // Account export & deletion states
    const [exportingData, setExportingData] = useState<boolean>(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
    const [deleteInputConfirmation, setDeleteInputConfirmation] = useState<string>('');
    const [deletingAccount, setDeletingAccount] = useState<boolean>(false);

    // Synchronize activeTab when opened or initialTab changes
    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab);
            setShowDeleteConfirm(false);
            setDeleteInputConfirmation('');
        }
    }, [isOpen, initialTab]);

    // GSAP Animation on modal open
    useEffect(() => {
        if (isOpen && modalRef.current && backdropRef.current) {
            gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" });
            gsap.fromTo(modalRef.current,
                { scale: 0.95, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.4)" }
            );
        }
    }, [isOpen]);

    // GSAP Tab transition animation
    useEffect(() => {
        if (isOpen && contentRef.current) {
            gsap.fromTo(contentRef.current,
                { opacity: 0, x: 8 },
                { opacity: 1, x: 0, duration: 0.22, ease: "power2.out" }
            );
        }
    }, [activeTab, isOpen]);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setCustomApiKey(user.customApiKey || '');
            setCustomVisionApiKey(user.customVisionApiKey || '');
        }
    }, [user]);

    if (!isOpen) return null;

    const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Name cannot be empty");
            return;
        }
        setSavingProfile(true);
        try {
            await updateProfile({ name: name.trim() });
            toast.success("Profile updated successfully!");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to update profile";
            toast.error(msg);
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSaveAiSettings = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSavingAiSettings(true);
        try {
            await updateProfile({
                selectedModel: 'cohere/north-mini-code:free',
                customApiKey: customApiKey.trim(),
                customVisionApiKey: customVisionApiKey.trim(),
            });
            toast.success("AI preferences & API keys saved successfully!");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to save AI preferences";
            toast.error(msg);
        } finally {
            setSavingAiSettings(false);
        }
    };

    const handleClearApiKey = async () => {
        setCustomApiKey('');
        try {
            await updateProfile({
                customApiKey: ''
            });
            toast.success("Code Generation key removed. Reverted to shared Cohere default.");
        } catch {
            toast.error("Failed to remove Code Generation key");
        }
    };

    const handleClearVisionApiKey = async () => {
        setCustomVisionApiKey('');
        try {
            await updateProfile({
                customVisionApiKey: ''
            });
            toast.success("Vision AI key removed. Reverted to shared Google Gemini default.");
        } catch {
            toast.error("Failed to remove Vision AI key");
        }
    };

    const handleSavePassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!currentPassword || !newPassword) {
            toast.error("Please fill in all password fields");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("New password must be at least 6 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        setSavingPassword(true);
        try {
            await changePassword(currentPassword, newPassword);
            toast.success("Password changed successfully!");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to change password";
            toast.error(msg);
        } finally {
            setSavingPassword(false);
        }
    };

    const handleExportData = async () => {
        setExportingData(true);
        try {
            await exportAccountData();
        } catch {
            // Toast handled in context
        } finally {
            setExportingData(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteInputConfirmation !== "DELETE") {
            toast.error("Please type DELETE to confirm account removal");
            return;
        }
        setDeletingAccount(true);
        try {
            await deleteAccount();
            onClose();
        } catch {
            // Toast handled in context
        } finally {
            setDeletingAccount(false);
        }
    };

    const projectCount = projects?.length || 0;
    const maxProjects = 10;
    const hasCustomKey = Boolean(user?.hasCustomApiKey || (customApiKey && customApiKey.trim().length > 0));
    const hasCustomVisionKey = Boolean(user?.hasCustomVisionApiKey || (customVisionApiKey && customVisionApiKey.trim().length > 0));

    return (
        <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
            {/* Fixed Dimension Modal Dialog Container (Height 620px, Max-Width 3xl) */}
            <div ref={modalRef} className="bg-white/95 backdrop-blur-2xl text-zinc-900 border border-white/50 rounded-2xl w-full max-w-3xl h-[620px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.6)] flex flex-col md:flex-row">

                {/* Sidebar Navigation */}
                <div className="w-full md:w-60 bg-zinc-50/80 backdrop-blur-xl border-b md:border-b-0 md:border-r border-zinc-200/80 p-4 flex flex-col justify-between shrink-0">
                    <div className="space-y-1">
                        <div className="px-3 py-2 mb-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Settings</p>
                            <p className="text-sm font-medium text-zinc-900 truncate">{user?.name}</p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${activeTab === 'profile'
                                    ? 'bg-zinc-900 text-white shadow-xs'
                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                                }`}
                        >
                            <UserIcon size={14} /> Profile & Account
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('models')}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${activeTab === 'models'
                                    ? 'bg-zinc-900 text-white shadow-xs'
                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                                }`}
                        >
                            <CpuIcon size={14} /> AI Models & Keys
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('security')}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${activeTab === 'security'
                                    ? 'bg-zinc-900 text-white shadow-xs'
                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                                }`}
                        >
                            <LockIcon size={14} /> Password & Security
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('terms')}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${activeTab === 'terms'
                                    ? 'bg-zinc-900 text-white shadow-xs'
                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                                }`}
                        >
                            <FileTextIcon size={14} /> Terms of Service
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('privacy')}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${activeTab === 'privacy'
                                    ? 'bg-zinc-900 text-white shadow-xs'
                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                                }`}
                        >
                            <ShieldCheckIcon size={14} /> Privacy Policy
                        </button>
                    </div>

                    {/* Quota Badge */}
                    <div className="mt-4 p-3 rounded-xl bg-white border border-zinc-200/80 shadow-xs">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 mb-1.5">
                            <span className="flex items-center gap-1">
                                <FolderKanbanIcon size={12} className="text-zinc-700" /> Projects
                            </span>
                            <span>{projectCount}/{maxProjects}</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-zinc-900 rounded-full transition-all"
                                style={{ width: `${Math.min(100, (projectCount / maxProjects) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Content Area with Static Height and Clean Scroll Container */}
                <div ref={contentRef} className="flex-1 h-full overflow-y-auto p-6 flex flex-col justify-between custom-scrollbar bg-white">
                    <div className="flex-1">
                        {/* Header with Only ONE Clean Close Button */}
                        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-6">
                            <h3 className="text-base font-semibold text-zinc-900">
                                {activeTab === 'profile' && 'Profile & Account Management'}
                                {activeTab === 'models' && 'AI Models & BYOK API Keys'}
                                {activeTab === 'security' && 'Password & Security'}
                                {activeTab === 'terms' && 'Terms of Service'}
                                {activeTab === 'privacy' && 'Privacy Policy'}
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                                title="Close Settings"
                            >
                                <XIcon size={18} />
                            </button>
                        </div>

                        {/* TAB 1: PROFILE & ACCOUNT DATA */}
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                <form onSubmit={handleSaveProfile} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                             Display Name
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-all text-zinc-900 bg-white placeholder:text-zinc-400"
                                            placeholder="Your full name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={user?.email || ''}
                                            disabled
                                            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 cursor-not-allowed outline-none"
                                        />
                                        <p className="text-[11px] text-zinc-400 mt-1">Email cannot be changed after registration.</p>
                                    </div>

                                    {user?.createdAt && (
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                                Member Since
                                            </label>
                                            <p className="text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                                                {moment(user.createdAt).format("MMMM Do, YYYY")} ({moment(user.createdAt).fromNow()})
                                            </p>
                                        </div>
                                    )}

                                    <div className="pt-1">
                                        <button
                                            type="submit"
                                            disabled={savingProfile}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                        >
                                            {savingProfile ? <Loader2Icon size={14} className="animate-spin" /> : <CheckCircle2Icon size={14} />}
                                            Save Profile
                                        </button>
                                    </div>
                                </form>

                                {/* Data Export & Account Controls */}
                                <div className="pt-4 border-t border-zinc-100 space-y-3">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Data & Privacy Rights</h4>

                                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50">
                                        <div>
                                            <p className="text-xs font-semibold text-zinc-900">Download Account Data Package</p>
                                            <p className="text-[11px] text-zinc-500 mt-0.5">Export all your profile records, project codebases, and revision logs as a JSON archive.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleExportData}
                                            disabled={exportingData}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-medium transition-all cursor-pointer disabled:opacity-50 shrink-0"
                                        >
                                            {exportingData ? <Loader2Icon size={13} className="animate-spin" /> : <DownloadIcon size={13} />}
                                            Export Data (JSON)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: AI ENGINES & DUAL BYOK API KEYS */}
                        {activeTab === 'models' && (
                            <form onSubmit={handleSaveAiSettings} className="space-y-4">
                                {/* Concise Banner */}
                                <div className="p-3 rounded-xl bg-violet-50/80 border border-violet-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1 rounded-md bg-violet-600 text-white">
                                            <SparklesIcon size={13} />
                                        </div>
                                        <p className="text-xs text-violet-950 font-medium">
                                            Default AI is ready to use. Adding your own API keys below is completely optional.
                                        </p>
                                    </div>
                                </div>

                                {/* ENGINE 1: CODE GENERATION ENGINE */}
                                <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/40 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 rounded bg-zinc-900 text-white">
                                                <CpuIcon size={12} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-semibold text-zinc-900">Code Generation Engine</h4>
                                                <p className="text-[11px] text-zinc-500">Creates React pages, styles, and handles chat edits.</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-900 text-white shrink-0">
                                            Cohere (Default)
                                        </span>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[11px] font-semibold text-zinc-700 flex items-center gap-1">
                                                <KeyIcon size={11} /> Custom Code API Key (Optional)
                                            </label>
                                            {hasCustomKey ? (
                                                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 flex items-center gap-1">
                                                    <ShieldCheckIcon size={10} /> Encrypted
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-zinc-400">Shared Free Tier</span>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <input
                                                type={showApiKey ? "text" : "password"}
                                                value={customApiKey}
                                                onChange={(e) => setCustomApiKey(e.target.value)}
                                                className="w-full text-xs px-3 py-2 pr-20 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none font-mono tracking-wider text-zinc-900 bg-white placeholder:text-zinc-400"
                                                placeholder="sk-or-v1-••••••••••••••••"
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowApiKey(!showApiKey)}
                                                    className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer transition-colors"
                                                    title={showApiKey ? "Mask API key" : "Show API key"}
                                                >
                                                    {showApiKey ? <EyeOffIcon size={13} /> : <EyeIcon size={13} />}
                                                </button>
                                                {hasCustomKey && (
                                                    <button
                                                        type="button"
                                                        onClick={handleClearApiKey}
                                                        className="text-[10px] text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 font-medium cursor-pointer transition-colors"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-zinc-400 mt-1">
                                            Optional OpenRouter key from <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-violet-600 hover:underline">openrouter.ai/keys</a>. Leave blank to use shared Cohere.
                                        </p>
                                    </div>
                                </div>

                                {/* ENGINE 2: VISION AI BLUEPRINT ENGINE */}
                                <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/40 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 rounded bg-amber-500 text-white">
                                                <EyeIcon size={12} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-semibold text-zinc-900">Vision AI Engine</h4>
                                                <p className="text-[11px] text-zinc-500">Scans uploaded screenshots & wireframes to extract design layouts.</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500 text-white shrink-0">
                                            Google Gemini (Default)
                                        </span>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[11px] font-semibold text-zinc-700 flex items-center gap-1">
                                                <KeyIcon size={11} /> Custom Vision API Key (Optional)
                                            </label>
                                            {hasCustomVisionKey ? (
                                                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 flex items-center gap-1">
                                                    <ShieldCheckIcon size={10} /> Encrypted
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-zinc-400">Shared Free Tier</span>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <input
                                                type={showVisionApiKey ? "text" : "password"}
                                                value={customVisionApiKey}
                                                onChange={(e) => setCustomVisionApiKey(e.target.value)}
                                                className="w-full text-xs px-3 py-2 pr-20 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none font-mono tracking-wider text-zinc-900 bg-white placeholder:text-zinc-400"
                                                placeholder="AIzaSy•••••••• or sk-or-v1-••••••••"
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowVisionApiKey(!showVisionApiKey)}
                                                    className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer transition-colors"
                                                    title={showVisionApiKey ? "Mask Vision API key" : "Show Vision API key"}
                                                >
                                                    {showVisionApiKey ? <EyeOffIcon size={13} /> : <EyeIcon size={13} />}
                                                </button>
                                                {hasCustomVisionKey && (
                                                    <button
                                                        type="button"
                                                        onClick={handleClearVisionApiKey}
                                                        className="text-[10px] text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 font-medium cursor-pointer transition-colors"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-zinc-400 mt-1">
                                            Optional Gemini key from <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-violet-600 hover:underline">Google AI Studio</a>. Leave blank to use shared Gemini.
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-1">
                                    <button
                                        type="submit"
                                        disabled={savingAiSettings}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                    >
                                        {savingAiSettings ? <Loader2Icon size={14} className="animate-spin" /> : <CheckCircle2Icon size={14} />}
                                        Save Preferences
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* TAB 3: PASSWORD & SECURITY + DANGER ZONE ACCOUNT DELETION */}
                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <form onSubmit={handleSavePassword} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                            Current Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showCurrentPw ? "text" : "password"}
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="w-full text-xs px-3.5 py-2.5 pr-10 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none font-mono text-zinc-900 bg-white placeholder:text-zinc-400"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPw(!showCurrentPw)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
                                            >
                                                {showCurrentPw ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showNewPw ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full text-xs px-3.5 py-2.5 pr-10 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none font-mono text-zinc-900 bg-white placeholder:text-zinc-400"
                                                placeholder="At least 6 characters"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPw(!showNewPw)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
                                            >
                                                {showNewPw ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                                            </button>
                                        </div>
                                        <PasswordStrengthMeter password={newPassword} />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                            Confirm New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPw ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full text-xs px-3.5 py-2.5 pr-10 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none font-mono text-zinc-900 bg-white placeholder:text-zinc-400"
                                                placeholder="Repeat new password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPw(!showConfirmPw)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
                                            >
                                                {showConfirmPw ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-1">
                                        <button
                                            type="submit"
                                            disabled={savingPassword}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                        >
                                            {savingPassword ? <Loader2Icon size={14} className="animate-spin" /> : <LockIcon size={14} />}
                                            Update Password
                                        </button>
                                    </div>
                                </form>

                                {/* Danger Zone: Permanent Account Deletion */}
                                <div className="pt-6 border-t border-red-100">
                                    <div className="p-4 rounded-xl bg-red-50/70 border border-red-200/80">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-red-700 font-semibold text-xs">
                                                    <AlertTriangleIcon size={14} />
                                                    <span>Danger Zone: Account Deletion</span>
                                                </div>
                                                <p className="text-[11px] text-red-600/90 leading-relaxed">
                                                    Permanently delete your account and all associated projects. This action is irreversible.
                                                </p>
                                            </div>
                                            {!showDeleteConfirm && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDeleteConfirm(true)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
                                                >
                                                    <Trash2Icon size={13} />
                                                    Delete Account
                                                </button>
                                            )}
                                        </div>

                                        {showDeleteConfirm && (
                                            <div className="mt-4 pt-3 border-t border-red-200/60 space-y-3">
                                                <p className="text-[11px] text-red-800 font-medium">
                                                    To confirm, type <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-red-300">DELETE</span> in the box below:
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={deleteInputConfirmation}
                                                        onChange={(e) => setDeleteInputConfirmation(e.target.value)}
                                                        placeholder="Type DELETE"
                                                        className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-red-300 bg-white text-red-900 focus:outline-none focus:ring-1 focus:ring-red-600 font-mono"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleDeleteAccount}
                                                        disabled={deletingAccount || deleteInputConfirmation !== 'DELETE'}
                                                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shrink-0"
                                                    >
                                                        {deletingAccount && <Loader2Icon size={13} className="animate-spin" />}
                                                        Permanently Delete
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowDeleteConfirm(false);
                                                            setDeleteInputConfirmation('');
                                                        }}
                                                        className="px-2.5 py-1.5 text-zinc-600 hover:text-zinc-900 text-xs font-medium cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: TERMS OF SERVICE */}
                        {activeTab === 'terms' && (
                            <div className="text-xs text-zinc-600 space-y-3 leading-relaxed">
                                <h4 className="font-semibold text-zinc-900 text-sm">BuilderAI Terms of Service</h4>
                                <p>Welcome to BuilderAI. By using our platform, you agree to the following terms:</p>
                                <div className="space-y-2.5 mt-2 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                                    <p><strong>1. Ownership of Generated Code:</strong> You retain full commercial and copyright ownership of all source code, assets, and React components generated through your account.</p>
                                    <p><strong>2. Fair Use & Rate Limiting:</strong> Free tier accounts are subject to fair use limits to ensure high availability for all developers.</p>
                                    <p><strong>3. Service Availability:</strong> BuilderAI is provided "as is" with continuous automated quality improvements and uptime guarantees.</p>
                                    <p><strong>4. Security & Compliance:</strong> Users are responsible for maintaining the confidentiality of their credentials and API tokens.</p>
                                </div>
                            </div>
                        )}

                        {/* TAB 5: PRIVACY POLICY */}
                        {activeTab === 'privacy' && (
                            <div className="text-xs text-zinc-600 space-y-3 leading-relaxed">
                                <h4 className="font-semibold text-zinc-900 text-sm">BuilderAI Privacy Policy</h4>
                                <p>Your privacy and secret security are our utmost priority:</p>
                                <div className="space-y-2.5 mt-2 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                                    <p><strong>1. Zero Data Selling:</strong> We never sell, monetize, or share your prompts or generated code with any third party.</p>
                                    <p><strong>2. Encrypted Storage:</strong> All account credentials and passwords are encrypted using industry-standard bcrypt hashing and AES-256-GCM.</p>
                                    <p><strong>3. API Key Protection:</strong> Custom API keys are encrypted at rest and used solely for authenticating your requests directly to LLM providers.</p>
                                    <p><strong>4. Data Export & Erasure:</strong> You can export your full data package or permanently delete your account at any time under DPDP rights.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Clean Footer Info (No Duplicate Close Button) */}
                    <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1">
                            <SparklesIcon size={12} className="text-amber-500" /> BuilderAI Engine v2.0
                        </span>
                        <span className="text-[10px] text-zinc-400">
                            AES-256-GCM Security Verified
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
