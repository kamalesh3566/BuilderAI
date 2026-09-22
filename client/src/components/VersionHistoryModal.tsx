import React, { useState } from 'react';
import { ClockIcon, HistoryIcon, RotateCcwIcon, XIcon, CheckCircle2Icon, FileCodeIcon, SparklesIcon, Loader2Icon } from 'lucide-react';
import moment from 'moment';
import { Project } from '../types';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onRollback: (version: number) => Promise<void>;
}

const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ isOpen, onClose, project, onRollback }) => {
  const [rollingBackVer, setRollingBackVer] = useState<number | null>(null);

  if (!isOpen || !project) return null;

  const currentVersion = project.version || 1;
  const history =
    project.history && project.history.length > 0
      ? [...project.history].reverse()
      : [
          {
            version: 1,
            prompt: project.description || "Initial website creation",
            timestamp: project.createdAt || new Date(),
            fileCount: Object.keys(project.files || {}).length,
          },
        ];

  const handleRestore = async (version: number) => {
    if (version === currentVersion) return;
    setRollingBackVer(version);
    try {
      await onRollback(version);
      onClose();
    } catch (err) {
      console.error("Rollback error:", err);
    } finally {
      setRollingBackVer(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-xl glass-modal rounded-2xl border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/30 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <HistoryIcon size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Version History
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-rose-200 border border-white/10 font-mono">
                  Current: v{currentVersion}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                View project snapshots and restore any previous version instantly.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Timeline List */}
        <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar">
          {history.map((item, idx) => {
            const isCurrent = item.version === currentVersion;
            const isRollingBack = rollingBackVer === item.version;

            return (
              <div
                key={item.version + "-" + idx}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? "bg-rose-950/20 border-rose-500/30 ring-1 ring-rose-500/20 shadow-[0_4px_20px_rgba(244,63,94,0.15)]"
                    : "glass-card border-white/10 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md font-mono ${
                          isCurrent
                            ? "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-sm"
                            : "bg-white/10 text-zinc-300 border border-white/10"
                        }`}
                      >
                        v{item.version}
                      </span>

                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
                          <CheckCircle2Icon size={12} /> Active Version
                        </span>
                      )}

                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <ClockIcon size={12} />
                        {moment(item.timestamp).fromNow()} ({moment(item.timestamp).format('MMM D, h:mm A')})
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed font-sans">
                      {item.prompt || "Revision update"}
                    </p>

                    {(item.fileCount || 0) > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <FileCodeIcon size={12} className="text-rose-400/80" />
                        <span>{item.fileCount} files snapshot</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0 pt-0.5">
                    {isCurrent ? (
                      <div className="text-xs text-zinc-400 font-medium px-3 py-1.5 bg-white/5 rounded-lg select-none border border-white/10">
                        Live Now
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRestore(item.version)}
                        disabled={isRollingBack}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-rose-600 hover:text-white text-zinc-200 border border-white/15 hover:border-rose-500 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        {isRollingBack ? (
                          <>
                            <Loader2Icon size={13} className="animate-spin text-white" />
                            Restoring...
                          </>
                        ) : (
                          <>
                            <RotateCcwIcon size={13} />
                            Restore
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Tip */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <SparklesIcon size={13} className="text-amber-400" />
            Restoring a version creates a new snapshot without losing your current code.
          </span>
          <span className="text-[10px] text-zinc-600 font-mono">
            Snapshots
          </span>
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryModal;
