import React, { useEffect, useRef } from 'react';
import {
  ArrowLeftIcon,
  Code2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  GlobeIcon,
  HistoryIcon,
  Loader2Icon,
  MonitorIcon,
  SearchIcon,
  SmartphoneIcon,
  TabletIcon,
} from 'lucide-react';
import UserMenu from './UserMenu';
import gsap from 'gsap';
import { DeviceViewport } from '../types';

interface BuilderHeaderProps {
  projectName?: string;
  version?: number;
  showCode?: boolean;
  publishing?: boolean;
  deviceViewport?: DeviceViewport;
  onSetDeviceViewport: (device: DeviceViewport) => void;
  onToggleShowCode: () => void;
  onOpenPreview: () => void;
  onPublish: () => void;
  onDownload: () => void;
  onBack: () => void;
  onOpenHistory: () => void;
  onOpenCommandPalette: () => void;
}

/**
 * BuilderHeader Component
 * 
 * Top bar in the IDE layout featuring:
 * - GSAP entrance animations for controls.
 * - Viewport dimension controls (desktop, tablet, mobile).
 * - Spotlight launcher button (Ctrl+K).
 * - Live preview, publish, and ZIP export actions.
 */
const BuilderHeader: React.FC<BuilderHeaderProps> = ({
  projectName = '',
  version = 1,
  showCode = false,
  publishing = false,
  deviceViewport = 'desktop',
  onSetDeviceViewport,
  onToggleShowCode,
  onOpenPreview,
  onPublish,
  onDownload,
  onBack,
  onOpenHistory,
  onOpenCommandPalette,
}) => {
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".gsap-header-control", {
        y: -10,
        opacity: 0,
        duration: 0.4,
        stagger: 0.03,
        ease: "power2.out"
      });
    }, headerRef);

    return () => ctx.revert();
  }, []);

  return (
    <header ref={headerRef} className="h-12 shrink-0 flex items-center justify-between px-3 border-b border-zinc-200 bg-white whitespace-nowrap overflow-visible relative z-30 select-none gap-2">
      {/* Left: Back & Project Info */}
      <div className="gsap-header-control flex items-center gap-2 min-w-0 shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 cursor-pointer transition-colors"
          title="Back to Projects"
        >
          <ArrowLeftIcon size={16} />
        </button>
        <img src="/logo.svg" alt="" className="invert size-5 shrink-0" />
        <span className="text-sm font-semibold truncate max-w-28 sm:max-w-40 md:max-w-64 text-zinc-900" title={projectName}>
          {projectName}
        </span>

        {/* Version & History Trigger */}
        <button
          onClick={onOpenHistory}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-violet-50 hover:text-violet-700 text-zinc-600 font-mono font-medium border border-zinc-200/80 transition-all cursor-pointer shrink-0"
          title="View Version History & Rollback"
        >
          <HistoryIcon size={11} className="text-zinc-400" />
          v{version}
        </button>
      </div>

      {/* Center: Device Viewport Switcher (Desktop, Tablet, Mobile) */}
      <div className="gsap-header-control hidden sm:flex items-center gap-1 p-1 bg-zinc-100 rounded-lg border border-zinc-200/80 shrink-0">
        <button
          onClick={() => onSetDeviceViewport('desktop')}
          className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
            deviceViewport === 'desktop'
              ? 'bg-white text-zinc-950 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
          title="Desktop View"
        >
          <MonitorIcon size={14} />
          <span className="hidden md:inline">Desktop</span>
        </button>
        <button
          onClick={() => onSetDeviceViewport('tablet')}
          className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
            deviceViewport === 'tablet'
              ? 'bg-white text-zinc-950 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
          title="Tablet View (768px)"
        >
          <TabletIcon size={14} />
          <span className="hidden md:inline">Tablet</span>
        </button>
        <button
          onClick={() => onSetDeviceViewport('mobile')}
          className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
            deviceViewport === 'mobile'
              ? 'bg-white text-zinc-950 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
          title="Mobile View (375px)"
        >
          <SmartphoneIcon size={14} />
          <span className="hidden md:inline">Mobile</span>
        </button>
      </div>

      {/* Right: Actions, Spotlight & User */}
      <div className="gsap-header-control flex items-center gap-1.5 shrink-0">
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:inline-flex items-center gap-1.5 py-1.5 px-2.5 border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 text-xs font-medium rounded-lg cursor-pointer bg-white transition-colors"
          title="Command Palette (Ctrl + K)"
        >
          <SearchIcon size={13} />
          <span className="hidden lg:inline">Search</span>
          <kbd className="text-[10px] font-mono bg-zinc-100 border border-zinc-200 px-1 py-0.2 rounded text-zinc-400">
            ⌘K
          </kbd>
        </button>

        {/* Code / Preview Toggle */}
        <button
          onClick={onToggleShowCode}
          className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 sm:px-3 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 text-xs font-medium rounded-lg cursor-pointer bg-white transition-all ${
            showCode ? 'bg-zinc-100 text-zinc-900 ring-1 ring-zinc-300' : ''
          }`}
          title={showCode ? 'Switch to Preview' : 'Split Code Editor'}
        >
          {showCode ? (
            <>
              <EyeIcon size={13} /> <span className="hidden sm:inline">Preview</span>
            </>
          ) : (
            <>
              <Code2Icon size={13} /> <span className="hidden sm:inline">Code</span>
            </>
          )}
        </button>

        {/* Open External Preview */}
        <button
          onClick={onOpenPreview}
          className="hidden sm:inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 sm:px-3 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 text-xs font-medium rounded-lg cursor-pointer bg-white transition-colors"
          title="Open Full Page Live Preview in New Tab"
        >
          <ExternalLinkIcon size={13} />
          <span className="hidden md:inline">Open</span>
        </button>

        {/* Publish */}
        <button
          onClick={onPublish}
          disabled={publishing}
          className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 sm:px-3 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 text-xs font-medium rounded-lg cursor-pointer bg-white transition-colors disabled:opacity-50"
          title="Publish to public URL"
        >
          {publishing ? <Loader2Icon size={13} className="animate-spin text-zinc-900" /> : <GlobeIcon size={13} />}
          <span className="hidden sm:inline">Publish</span>
        </button>

        {/* Export ZIP */}
        <button
          onClick={onDownload}
          className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 sm:px-3 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 text-xs font-medium rounded-lg cursor-pointer bg-white transition-colors"
          title="Download Source Code (ZIP)"
        >
          <DownloadIcon size={13} />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* User Dropdown */}
        <div className="pl-1 border-l border-zinc-200 ml-0.5 shrink-0">
          <UserMenu light={true} />
        </div>
      </div>
    </header>
  );
};

export default BuilderHeader;
