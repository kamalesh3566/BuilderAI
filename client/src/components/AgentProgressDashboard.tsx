import React, { useEffect, useRef } from "react";
import { CheckCircle2Icon, CircleIcon, Loader2Icon, SquareIcon } from "lucide-react";
import gsap from "gsap";
import { Project } from "../types";

interface AgentProgressDashboardProps {
  project: Project;
  onStop?: () => void;
}

/**
 * AgentProgressDashboard Component
 * 
 * Visual real-time agent build progress indicator showing:
 * - Architecture planning status & file generation queue.
 * - GSAP-animated step reveals and progress bar transitions.
 * - Emergency abort button with AbortController integration.
 */
export default function AgentProgressDashboard({ project, onStop }: AgentProgressDashboardProps) {
  const planned = project.filesPlanned || [];
  const completed = project.filesGenerated || [];
  const current = project.currentFile;
  const isFailed = project.status === "failed";
  const isGenerating = project.status === "pending" || project.status === "generating" || project.status === "revising";

  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".gsap-dashboard-card", {
        scale: 0.96,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out"
      });

      gsap.from(".gsap-file-step", {
        x: -12,
        opacity: 0,
        duration: 0.4,
        stagger: 0.04,
        ease: "power2.out",
        delay: 0.1
      });
    }, cardRef);

    return () => ctx.revert();
  }, [planned.length]);

  return (
    <div ref={cardRef} className="h-full w-full bg-zinc-50 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
      <div className="gsap-dashboard-card max-w-xl w-full bg-white border border-zinc-200 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-sm">
        {/* Status Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
              {isFailed
                ? "Generation Failed"
                : project.status === "pending"
                ? "Planning Architecture..."
                : "AI Agent is Building..."}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isFailed ? "An error occurred during build" : "Writing production-ready React codebase"}
            </p>
          </div>

          {isGenerating && onStop && (
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold cursor-pointer transition-colors shadow-xs active:scale-95"
              title="Stop building and keep generated files"
            >
              <SquareIcon size={12} className="fill-current" /> Stop Generation
            </button>
          )}
        </div>

        {isFailed && project.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 font-medium">
            Error: {project.error}
          </div>
        )}

        {/* Progress bar */}
        {planned.length > 0 && !isFailed && (
          <div className="mb-6">
            <div className="flex justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              <span>Progress</span>
              <span>{Math.round((completed.length / planned.length) * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-900 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${(completed.length / planned.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Files checklist */}
        {planned.length > 0 ? (
          <div>
            <span className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
              Planned Files ({completed.length}/{planned.length})
            </span>
            <div className="space-y-2.5 max-h-75 overflow-y-auto pr-1">
              {planned.map((file) => {
                const isCompleted = completed.includes(file.path);
                const isGenerating = current === file.path;

                return (
                  <div
                    key={file.path}
                    className={`gsap-file-step flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                      isGenerating
                        ? "bg-zinc-50/50 border-zinc-300"
                        : isCompleted
                        ? "bg-white border-zinc-100"
                        : "bg-white border-zinc-100 opacity-60"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2Icon size={16} className="text-emerald-500 shrink-0" />
                    ) : isGenerating ? (
                      <Loader2Icon size={16} className="animate-spin text-zinc-900 shrink-0" />
                    ) : (
                      <CircleIcon size={16} className="text-zinc-300 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-medium truncate ${isGenerating ? "text-zinc-800" : "text-zinc-700"}`}
                      >
                        {file.path}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">{file.description}</p>
                    </div>
                    {isGenerating && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-semibold animate-pulse uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          !isFailed && (
            <div className="flex flex-col items-center justify-center py-6 text-zinc-400">
              <Loader2Icon size={24} className="animate-spin mb-2" />
              <p className="text-xs">Analyzing requirements and designing project structure...</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
