import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate, useParams } from 'react-router-dom';
import Loading from '../components/Loading';
import BuilderHeader from '../components/BuilderHeader';
import { FolderTreeIcon, MessageSquareIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import ChatPanel from '../components/ChatPanel';
import FileExplorer from '../components/FileExplorer';
import PreviewPanel from '../components/PreviewPanel';
import AgentProgressDashboard from '../components/AgentProgressDashboard';
import PublishModal from '../components/PublishModal';
import VersionHistoryModal from '../components/VersionHistoryModal';
import CommandPalette from '../components/CommandPalette';
import api from '../api/api';
import toast from 'react-hot-toast';
import { exportProjectZip } from '../utils/exportProject';
import SettingsModal from '../components/SettingsModal';
import axios from 'axios';

const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 620;
const DEFAULT_SIDEBAR_WIDTH = 360;

const BuilderPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [leftTab, setLeftTab] = useState<"chat" | "files">("chat");
    const [publishing, setPublishing] = useState<boolean>(false);
    const [publishUrl, setPublishUrl] = useState<string | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    // Draggable Resizer State
    const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
        const saved = localStorage.getItem("builder_sidebar_width");
        return saved ? Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, parseInt(saved, 10))) : DEFAULT_SIDEBAR_WIDTH;
    });
    const isDraggingRef = useRef<boolean>(false);

    const {
        activeProject,
        loadingActiveProject,
        activeFile,
        showCode,
        deviceViewport,
        isHistoryOpen,
        isCommandPaletteOpen,
        setActiveFile,
        setShowCode,
        setDeviceViewport,
        setIsHistoryOpen,
        setIsCommandPaletteOpen,
        loadProject,
        logout,
        chatLoading,
        handleChat,
        handleStopGeneration,
        handleRollbackProject,
        settingsModalOpen,
        settingsTab,
        openSettings,
        closeSettings,
    } = useAppContext();

    useEffect(() => {
        if (!id) return;
        loadProject(id);
    }, [id, loadProject]);

    // Handle Split Panel Dragging with iframe pointer-events protection
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        isDraggingRef.current = true;
        setIsDragging(true);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!isDraggingRef.current) return;
            const newWidth = Math.min(
                MAX_SIDEBAR_WIDTH,
                Math.max(MIN_SIDEBAR_WIDTH, moveEvent.clientX)
            );
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                setIsDragging(false);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                setSidebarWidth((current) => {
                    localStorage.setItem("builder_sidebar_width", current.toString());
                    return current;
                });
            }
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, []);

    const handleOpenPreview = () => {
        if (!id) return;
        window.open(`/preview/${id}`, "_blank");
    };

    const handlePublish = async () => {
        if (!id) return;
        setPublishing(true);
        try {
            await api.post(`/api/projects/${id}/publish`);
            const url = `${window.location.origin}/publish/${id}`;
            setPublishUrl(url);
            toast.success("Website published successfully!");
        } catch (err: unknown) {
            console.error("Publish failed:", err);
            if (axios.isAxiosError(err)) {
                toast.error(err?.response?.data?.error || "Publish failed");
            } else {
                toast.error("Publish failed");
            }
        } finally {
            setPublishing(false);
        }
    };

    const handleDownload = () => {
        if (!activeProject) return;
        exportProjectZip(activeProject);
    };

    if (loadingActiveProject || !activeProject) {
        return <Loading />;
    }

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden text-zinc-900 relative">
            {/* Top Bar Header */}
            <BuilderHeader
                projectName={activeProject.name}
                version={activeProject.version}
                showCode={showCode}
                publishing={publishing}
                deviceViewport={deviceViewport}
                onSetDeviceViewport={setDeviceViewport}
                onToggleShowCode={() => setShowCode(!showCode)}
                onOpenPreview={handleOpenPreview}
                onPublish={handlePublish}
                onDownload={handleDownload}
                onBack={() => navigate("/")}
                onOpenHistory={() => setIsHistoryOpen(true)}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            />

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Sidebar (Draggable & Collapsible) */}
                {!isSidebarCollapsed && (
                    <div
                        style={{ width: `${sidebarWidth}px` }}
                        className="shrink-0 flex flex-col border-r border-zinc-200 bg-white select-none transition-none relative"
                    >
                        {/* Sidebar Tabs */}
                        <div className="flex border-b border-zinc-100">
                            <button
                                onClick={() => setLeftTab("chat")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium cursor-pointer transition-colors ${
                                    leftTab === "chat"
                                        ? "text-zinc-900 border-b-2 border-zinc-900 font-semibold"
                                        : "text-zinc-400 hover:text-zinc-700"
                                }`}
                            >
                                <MessageSquareIcon size={13} /> Chat
                            </button>

                            <button
                                onClick={() => setLeftTab("files")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium cursor-pointer transition-colors ${
                                    leftTab === "files"
                                        ? "text-zinc-900 border-b-2 border-zinc-900 font-semibold"
                                        : "text-zinc-400 hover:text-zinc-700"
                                }`}
                            >
                                <FolderTreeIcon size={13} /> Files
                            </button>
                        </div>

                        {/* Sidebar Content */}
                        <div className="flex-1 overflow-hidden select-text">
                            {leftTab === 'chat' ? (
                                <ChatPanel
                                    messages={activeProject.messages}
                                    onSend={handleChat}
                                    onStop={() => handleStopGeneration(activeProject._id)}
                                    loading={
                                        chatLoading ||
                                        activeProject.status === "generating" ||
                                        activeProject.status === "pending" ||
                                        activeProject.status === "revising"
                                    }
                                    onOpenFile={(path) => {
                                        setActiveFile(path);
                                        setShowCode(true);
                                    }}
                                />
                            ) : (
                                <FileExplorer
                                    files={activeProject.files}
                                    activeFile={activeFile}
                                    currentFile={activeProject.currentFile}
                                    onFileSelect={(path) => {
                                        setActiveFile(path);
                                        setShowCode(true);
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Draggable Resizer Gutter */}
                {!isSidebarCollapsed && (
                    <div
                        onMouseDown={handleMouseDown}
                        onDoubleClick={() => setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)}
                        className="w-1.5 hover:w-2 active:w-2 bg-transparent hover:bg-violet-500 active:bg-violet-600 cursor-col-resize z-20 transition-all group flex items-center justify-center shrink-0"
                        title="Drag to resize panel (Double-click to reset)"
                    >
                        <div className="w-0.5 h-6 bg-zinc-300 group-hover:bg-violet-400 rounded-full" />
                    </div>
                )}

                {/* Collapse / Expand Toggle Button */}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute top-3 z-30 p-1 rounded-md bg-white border border-zinc-200/80 shadow-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-all cursor-pointer"
                    style={{ left: isSidebarCollapsed ? '8px' : `${sidebarWidth + 6}px` }}
                    title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isSidebarCollapsed ? <ChevronRightIcon size={14} /> : <ChevronLeftIcon size={14} />}
                </button>

                {/* Preview / Code Area */}
                <div className={`flex-1 overflow-hidden min-w-0 bg-zinc-50 ${isDragging ? 'pointer-events-none select-none' : ''}`}>
                    {activeProject.status === "pending" ||
                    activeProject.status === "generating" ||
                    activeProject.status === "failed" ||
                    (activeProject.status === "stopped" &&
                        (!activeProject.filesGenerated || activeProject.filesGenerated.length === 0)) ? (
                        <AgentProgressDashboard
                            project={activeProject}
                            onStop={() => handleStopGeneration(activeProject._id)}
                        />
                    ) : (
                        <PreviewPanel
                            project={activeProject}
                            activeFile={activeFile}
                            showCode={showCode}
                            deviceViewport={deviceViewport}
                        />
                    )}
                </div>
            </div>

            {/* Modals & Spotlight Search */}
            {publishUrl && (
                <PublishModal
                    publishUrl={publishUrl}
                    onClose={() => setPublishUrl(null)}
                />
            )}

            <VersionHistoryModal
                isOpen={isHistoryOpen}
                project={activeProject}
                onClose={() => setIsHistoryOpen(false)}
                onRollback={handleRollbackProject}
            />

            <CommandPalette
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
                onOpen={() => setIsCommandPaletteOpen(true)}
                project={activeProject}
                activeFile={activeFile}
                showCode={showCode}
                deviceViewport={deviceViewport}
                onToggleShowCode={() => setShowCode(!showCode)}
                onOpenPreview={handleOpenPreview}
                onPublish={handlePublish}
                onDownload={handleDownload}
                onSelectFile={(path) => {
                    setActiveFile(path);
                    setShowCode(true);
                }}
                onSetDeviceViewport={setDeviceViewport}
                onOpenHistory={() => setIsHistoryOpen(true)}
                onOpenSettings={() => openSettings('models')}
            />

            <SettingsModal
                isOpen={settingsModalOpen}
                initialTab={settingsTab}
                onClose={closeSettings}
            />
        </div>
    );
};

export default BuilderPage;
