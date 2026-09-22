import React, { useState, useEffect, useRef } from 'react';
import {
    SearchIcon,
    Code2Icon,
    EyeIcon,
    ExternalLinkIcon,
    DownloadIcon,
    GlobeIcon,
    HistoryIcon,
    SettingsIcon,
    MonitorIcon,
    TabletIcon,
    SmartphoneIcon,
    FileCodeIcon,
    SparklesIcon,
    XIcon,
    ArrowRightIcon,
    LucideIcon
} from 'lucide-react';
import gsap from 'gsap';
import { Project, DeviceViewport } from '../types';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onOpen?: () => void;
    project: Project | null;
    activeFile: string | null;
    showCode: boolean;
    deviceViewport: DeviceViewport;
    onToggleShowCode: () => void;
    onOpenPreview: () => void;
    onPublish: () => void;
    onDownload: () => void;
    onSelectFile: (filePath: string) => void;
    onSetDeviceViewport: (vp: DeviceViewport) => void;
    onOpenHistory: () => void;
    onOpenSettings: () => void;
}

interface ActionItem {
    id: string;
    category: string;
    title: string;
    icon: LucideIcon;
    run: () => void;
    badge: string;
}

/**
 * CommandPalette Component
 * 
 * Spotlight launcher (Ctrl+K / Cmd+K) allowing rapid navigation, file selection,
 * viewport toggling, and project actions with GSAP spring modal animations.
 */
const CommandPalette: React.FC<CommandPaletteProps> = ({
    isOpen,
    onClose,
    onOpen,
    project,
    activeFile,
    showCode,
    deviceViewport,
    onToggleShowCode,
    onOpenPreview,
    onPublish,
    onDownload,
    onSelectFile,
    onSetDeviceViewport,
    onOpenHistory,
    onOpenSettings,
}) => {
    const [query, setQuery] = useState<string>('');
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const backdropRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);

            // GSAP Spring Pop on Open
            if (modalRef.current && backdropRef.current) {
                gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" });
                gsap.fromTo(modalRef.current, 
                    { scale: 0.94, y: -10, opacity: 0 }, 
                    { scale: 1, y: 0, opacity: 1, duration: 0.35, ease: "back.out(1.6)" }
                );
            }
        }
    }, [isOpen]);

    // Keyboard listener for global Cmd/Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (isOpen) {
                    onClose();
                } else if (onOpen) {
                    onOpen();
                }
            } else if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, onOpen]);

    if (!isOpen) return null;

    // Collect all files
    const files = Object.keys(project?.files || {});

    // Build action items
    const actions: ActionItem[] = [
        // Quick Actions
        {
            id: 'toggle-code',
            category: 'Actions',
            title: showCode ? 'Switch to Full Live Preview' : 'Open Code Editor Side-by-Side',
            icon: showCode ? EyeIcon : Code2Icon,
            run: () => { onToggleShowCode(); onClose(); },
            badge: showCode ? 'Preview' : 'Code',
        },
        {
            id: 'open-preview',
            category: 'Actions',
            title: 'Open Full Page External Preview',
            icon: ExternalLinkIcon,
            run: () => { onOpenPreview(); onClose(); },
            badge: 'New Tab',
        },
        {
            id: 'history',
            category: 'Actions',
            title: 'View Version History & Rollback',
            icon: HistoryIcon,
            run: () => { onOpenHistory(); onClose(); },
            badge: `v${project?.version || 1}`,
        },
        {
            id: 'export-zip',
            category: 'Actions',
            title: 'Export Full React Project (ZIP)',
            icon: DownloadIcon,
            run: () => { onDownload(); onClose(); },
            badge: 'Export',
        },
        {
            id: 'publish',
            category: 'Actions',
            title: 'Publish Website to Public Web',
            icon: GlobeIcon,
            run: () => { onPublish(); onClose(); },
            badge: 'Deploy',
        },
        {
            id: 'settings',
            category: 'Actions',
            title: 'Account & AI Model Settings',
            icon: SettingsIcon,
            run: () => { onOpenSettings(); onClose(); },
            badge: 'Preferences',
        },

        // Device Viewports
        {
            id: 'vp-desktop',
            category: 'Device Viewport',
            title: 'Desktop View (100% Width)',
            icon: MonitorIcon,
            run: () => { onSetDeviceViewport('desktop'); onClose(); },
            badge: deviceViewport === 'desktop' ? 'Active' : '100%',
        },
        {
            id: 'vp-tablet',
            category: 'Device Viewport',
            title: 'Tablet View (768px iPad)',
            icon: TabletIcon,
            run: () => { onSetDeviceViewport('tablet'); onClose(); },
            badge: deviceViewport === 'tablet' ? 'Active' : '768px',
        },
        {
            id: 'vp-mobile',
            category: 'Device Viewport',
            title: 'Mobile View (375px iPhone)',
            icon: SmartphoneIcon,
            run: () => { onSetDeviceViewport('mobile'); onClose(); },
            badge: deviceViewport === 'mobile' ? 'Active' : '375px',
        },

        // Project Files
        ...files.map((filePath) => ({
            id: `file-${filePath}`,
            category: 'Files',
            title: filePath,
            icon: FileCodeIcon,
            run: () => { onSelectFile(filePath); onClose(); },
            badge: filePath === activeFile ? 'Current' : 'Open',
        })),
    ];

    // Filter items based on query
    const filteredActions = actions.filter((item) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredActions[selectedIndex]) {
                filteredActions[selectedIndex].run();
            }
        }
    };

    return (
        <div
            ref={backdropRef}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-start justify-center pt-[15vh] px-4 animate-in fade-in duration-150"
        >
            {/* Modal Dialog */}
            <div
                ref={modalRef}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xl glass-modal rounded-2xl border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden flex flex-col max-h-[70vh] transition-all"
            >
                {/* Search Input Bar */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-black/30 backdrop-blur-md">
                    <SearchIcon size={18} className="text-rose-400 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command, search files, or switch viewports..."
                        className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="p-1 rounded text-zinc-500 hover:text-zinc-300 cursor-pointer"
                        >
                            <XIcon size={14} />
                        </button>
                    )}
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-white/10 border border-white/15 rounded shadow-xs">
                        ESC
                    </kbd>
                </div>

                {/* Results List */}
                <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar max-h-[50vh]">
                    {filteredActions.length === 0 ? (
                        <div className="py-12 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
                            <SparklesIcon size={20} className="text-rose-400/60" />
                            No commands or files found matching "{query}"
                        </div>
                    ) : (
                        filteredActions.map((action, idx) => {
                            const isSelected = idx === selectedIndex;
                            const IconComponent = action.icon;

                            return (
                                <button
                                    key={action.id}
                                    onClick={action.run}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer text-left ${
                                        isSelected
                                            ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-[0_4px_16px_rgba(244,63,94,0.35)]'
                                            : 'text-zinc-300 hover:bg-white/10'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <div
                                            className={`p-1.5 rounded-lg shrink-0 ${
                                                isSelected
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-white/10 text-zinc-300'
                                            }`}
                                        >
                                            <IconComponent size={14} />
                                        </div>
                                        <div className="min-w-0 flex-1 truncate">
                                            <span className="font-medium truncate block">{action.title}</span>
                                            <span
                                                className={`text-[10px] truncate block mt-0.5 ${
                                                    isSelected ? 'text-rose-100' : 'text-zinc-400'
                                                }`}
                                            >
                                                {action.category}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span
                                            className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                                                isSelected
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-white/5 text-zinc-400 border border-white/10'
                                            }`}
                                        >
                                            {action.badge}
                                        </span>
                                        {isSelected && (
                                            <ArrowRightIcon size={12} className="text-white/80 shrink-0" />
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer Tip */}
                <div className="px-4 py-2.5 border-t border-white/10 bg-black/40 flex items-center justify-between text-[11px] text-zinc-400">
                    <div className="flex items-center gap-3">
                        <span>
                            <kbd className="px-1 py-0.5 text-[9px] font-mono bg-zinc-800 rounded border border-zinc-700 mr-1">↑</kbd>
                            <kbd className="px-1 py-0.5 text-[9px] font-mono bg-zinc-800 rounded border border-zinc-700 mr-1.5">↓</kbd>
                            Navigate
                        </span>
                        <span>
                            <kbd className="px-1 py-0.5 text-[9px] font-mono bg-zinc-800 rounded border border-zinc-700 mr-1.5">↵</kbd>
                            Select
                        </span>
                    </div>
                    <span className="text-[10px] text-zinc-600 font-mono">BuilderAI Spotlight</span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
