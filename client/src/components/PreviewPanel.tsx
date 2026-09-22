import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from '@codesandbox/sandpack-react';
import { detectDependencies } from '../utils/sandpackUtils';
import { sanitizeCodeForSandpack } from '../utils/codeSanitizer';
import { useAppContext } from '../context/AppContext';
import SandpackErrorMonitor from './SandpackErrorMonitor';
import { Project, DeviceViewport } from '../types';

interface SandpackFileWatcherProps {
  onLiveFilesChange: (files: Record<string, string>) => void;
}

// Watches for file edits inside Sandpack editor and saves changes to DB & live state
function SandpackFileWatcher({ onLiveFilesChange }: SandpackFileWatcherProps) {
  const { sandpack } = useSandpack();
  const { files } = sandpack;
  const { activeProject, updateProjectFiles } = useAppContext();

  const activeProjectRef = useRef(activeProject);

  useEffect(() => {
    activeProjectRef.current = activeProject;
  }, [activeProject]);

  useEffect(() => {
    const project = activeProjectRef.current;
    if (!project) return;
    const updatedFiles: Record<string, string> = {};
    let hasChanges = false;

    for (const [path, fileObj] of Object.entries(files)) {
      const fileCode = fileObj.code;
      updatedFiles[path] = fileCode;
      const originalContent =
        typeof project.files[path] === 'string'
          ? project.files[path]
          : project.files[path]?.content;
      if (originalContent !== undefined && originalContent !== fileCode) {
        hasChanges = true;
      }
    }

    // Sync live files to parent
    onLiveFilesChange(updatedFiles);
    if (hasChanges) {
      updateProjectFiles(updatedFiles);
    }
  }, [files]);
  return null;
}

interface PreviewPanelProps {
  project: Project;
  activeFile: string;
  showCode: boolean;
  deviceViewport?: DeviceViewport;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  project,
  activeFile,
  showCode,
  deviceViewport = 'desktop',
}) => {
  const [showErrorOverlay, setShowErrorOverlay] = useState<boolean>(true);
  // Keep local state of files that updates as user types
  const [liveFiles, setLiveFiles] = useState<Record<string, any>>(project.files || {});

  // Sync liveFiles whenever incoming project files change from server/generation
  useEffect(() => {
    if (project?.files) {
      setLiveFiles(project.files);
    }
  }, [project?._id, project?.version, project?.status, project?.updatedAt]);

  const handleLiveFilesChange = (newFiles: Record<string, string>) => {
    setLiveFiles((prev) => {
      let changed = false;
      for (const [p, code] of Object.entries(newFiles)) {
        if (prev[p] !== code) {
          changed = true;
          break;
        }
      }
      return changed ? newFiles : prev;
    });
  };

  // Convert liveFiles to Sandpack format with automatic syntax sanitization
  const sandpackFiles = useMemo(() => {
    const spFiles: Record<string, { code: string; active: boolean }> = {};
    for (const [path, content] of Object.entries(liveFiles)) {
      const rawCode = typeof content === 'string' ? content : content?.content || '';
      const fileCode = sanitizeCodeForSandpack(rawCode, path);
      spFiles[path] = {
        code: fileCode,
        active: path === activeFile,
      };
    }
    return spFiles;
  }, [liveFiles, activeFile]);

  // Detect dependencies from import statements using liveFiles
  const dependencies = useMemo(() => {
    return detectDependencies(liveFiles);
  }, [liveFiles]);

  // Viewport styling calculations
  const isConstrained = !showCode && deviceViewport !== 'desktop';
  const maxWidthStyle =
    deviceViewport === 'mobile' ? '375px' : deviceViewport === 'tablet' ? '768px' : '100%';

  return (
    <div className={`h-full w-full flex flex-col ${isConstrained ? 'bg-zinc-100/70 overflow-y-auto p-4' : ''}`}>
      <div
        className={`h-full w-full transition-all duration-300 mx-auto ${
          isConstrained
            ? 'border border-zinc-300 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col my-auto'
            : ''
        }`}
        style={{
          maxWidth: isConstrained ? maxWidthStyle : '100%',
          height: isConstrained ? (deviceViewport === 'mobile' ? '740px' : '90%') : '100%',
        }}
      >
        {/* Device Notch Bar for Tablet/Mobile */}
        {isConstrained && (
          <div className="h-6 bg-zinc-900 flex items-center justify-center shrink-0 relative">
            <div className="size-2 rounded-full bg-zinc-700 mx-auto" />
            <span className="absolute right-3 text-[10px] text-zinc-500 font-mono">
              {deviceViewport === 'mobile' ? '375 × 740' : '768 × Auto'}
            </span>
          </div>
        )}

        <SandpackProvider
          key={`${project._id}-v${project.version}-${project.status}`}
          template="react"
          files={sandpackFiles}
          customSetup={{ dependencies }}
          options={{
            externalResources: [
              'https://cdn.tailwindcss.com',
              'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
            ],
            classes: {
              'sp-wrapper': 'sp-wrapper h-full',
              'sp-layout': 'sp-layout h-full',
              'sp-preview': 'sp-preview h-full',
            },
            logLevel: 0,
          }}
          theme={{
            colors: {
              surface1: '#ffffff',
              surface2: '#f4f4f5',
              surface3: '#e4e4e7',
              clickable: '#71717a',
              base: '#09090b',
              disabled: '#a1a1aa',
              hover: '#18181b',
              accent: '#18181b',
              error: '#ef4444',
              errorSurface: '#fef2f2',
            },
            font: {
              body: "'Urbanist', system-ui, -apple-system, sans-serif",
              mono: "'Geist Mono', ui-monospace, monospace",
              size: '13px',
              lineHeight: '1.6',
            },
          }}
          className="h-full w-full"
        >
          <SandpackFileWatcher onLiveFilesChange={handleLiveFilesChange} />
          <SandpackErrorMonitor onErrorChange={setShowErrorOverlay} />
          <SandpackLayout
            style={{
              height: '100%',
              border: 'none',
              borderRadius: 0,
              background: 'transparent',
            }}
          >
            {showCode && (
              <SandpackCodeEditor
                showTabs
                showLineNumbers
                showInlineErrors
                wrapContent
                style={{ height: '100%', flex: 1, minWidth: 0 }}
              />
            )}

            <SandpackPreview
              showNavigator={false}
              showRefreshButton
              showOpenInCodeSandbox={false}
              showSandpackErrorOverlay={showErrorOverlay}
              style={{ height: '100%', flex: showCode ? 1 : 2, minWidth: 0 }}
            />
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </div>
  );
};

export default PreviewPanel;
