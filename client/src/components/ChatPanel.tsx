import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  BotIcon, 
  CheckCircle2Icon, 
  ChevronDownIcon, 
  ChevronUpIcon, 
  Code2Icon, 
  FileCodeIcon, 
  Loader2Icon, 
  SparklesIcon, 
  UserIcon,
  ScanEyeIcon,
  ArrowUpRightIcon
} from 'lucide-react';
import PromptInput from './PromptInput';
import { ChatMessage } from '../types';

const QUICK_PROMPTS = [
  "🌙 Add Dark Mode theme toggle",
  "✨ Add Bento Grid feature section",
  "📱 Optimize layout for mobile responsiveness",
  "⚡ Add smooth CSS hover micro-animations",
  "💬 Add customer testimonials & social proof",
  "🎨 Switch to sleek Slate & Indigo color palette",
];

// Helper to determine if an assistant message is an automated build step/log
function isBuildStepMessage(msg: ChatMessage): boolean {
  if (!msg || msg.role !== "assistant") return false;
  const c = msg.content || "";
  return (
    c.startsWith("🔍 **Scanning") ||
    c.startsWith("✨ **Visual Analysis") ||
    c.startsWith("Received prompt and") ||
    c.startsWith("Planning project structure") ||
    c.startsWith("Planned website structure:") ||
    c.startsWith('Created file "') ||
    c.startsWith("Website generation complete!") ||
    c.startsWith("⏹️ Generation stopped") ||
    c.startsWith("❌ Generation failed")
  );
}

interface BuildStepsCardProps {
  items: ChatMessage[];
  onOpenFile?: (path: string) => void;
}

// Collapsible Lovable-style Build & Generation Steps Card
function BuildStepsCard({ items, onOpenFile }: BuildStepsCardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const isDone = items.some(
    (m) => m.content.includes("Website generation complete") || m.content.includes("⏹️ Generation stopped")
  );
  const isFailed = items.some((m) => m.content.includes("❌ Generation failed"));

  // Extract files created from step items
  const createdFiles = useMemo(() => {
    const list: string[] = [];
    for (const item of items) {
      const match = item.content.match(/^Created file "([^"]+)"/);
      if (match) {
        list.push(match[1]);
      }
    }
    return list;
  }, [items]);

  const hasVisionScan = items.some(
    (m) => m.content.includes("Scanning") || m.content.includes("Visual Analysis")
  );

  return (
    <div className="bg-zinc-50 border border-zinc-200/90 rounded-xl overflow-hidden shadow-2xs my-2 transition-all">
      {/* Header Accordion Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-zinc-100/70 transition-colors select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md flex items-center justify-center bg-zinc-900 text-white shrink-0">
            {isFailed ? (
              <span className="text-[10px] font-bold text-red-400">!</span>
            ) : isDone ? (
              <CheckCircle2Icon size={12} className="text-emerald-400" />
            ) : (
              <Loader2Icon size={12} className="animate-spin text-zinc-300" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-900 truncate flex items-center gap-1.5">
              <span>{isDone ? "Generation Complete" : isFailed ? "Generation Halted" : "Building Website..."}</span>
              {createdFiles.length > 0 && (
                <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-zinc-200/70 text-zinc-600">
                  {createdFiles.length} {createdFiles.length === 1 ? "file" : "files"}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-700 text-[11px] font-medium shrink-0">
          <span>{isExpanded ? "Hide details" : "View steps"}</span>
          {isExpanded ? <ChevronUpIcon size={13} /> : <ChevronDownIcon size={13} />}
        </div>
      </div>

      {/* Collapsed Preview Strip (Chips of generated files) */}
      {!isExpanded && createdFiles.length > 0 && (
        <div className="px-3.5 pb-2.5 pt-0.5 flex flex-wrap gap-1.5">
          {createdFiles.map((path) => (
            <button
              key={path}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenFile) onOpenFile(path);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-md text-[11px] font-mono text-zinc-700 transition-colors cursor-pointer shadow-2xs group"
              title={`Open ${path} in editor`}
            >
              <FileCodeIcon size={10} className="text-zinc-400 group-hover:text-white" />
              <span>{path}</span>
            </button>
          ))}
        </div>
      )}

      {/* Expanded Step Log */}
      {isExpanded && (
        <div className="px-3.5 pb-3 pt-1 border-t border-zinc-200/60 bg-white/50 space-y-2 text-xs">
          {hasVisionScan && (
            <div className="flex items-start gap-2 text-zinc-600 py-1">
              <ScanEyeIcon size={13} className="text-indigo-600 mt-0.5 shrink-0" />
              <span>Analyzed reference screenshots and synthesized UI design blueprint.</span>
            </div>
          )}

          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Generated Files</p>
            <div className="grid grid-cols-1 gap-1">
              {createdFiles.map((path) => (
                <div 
                  key={path} 
                  onClick={() => onOpenFile && onOpenFile(path)}
                  className="flex items-center justify-between p-1.5 px-2 bg-white rounded-md border border-zinc-100 hover:border-zinc-300 cursor-pointer text-zinc-700 group transition-all"
                >
                  <span className="font-mono text-[11px] flex items-center gap-1.5">
                    <Code2Icon size={12} className="text-zinc-400 group-hover:text-zinc-900" />
                    {path}
                  </span>
                  <ArrowUpRightIcon size={11} className="text-zinc-300 group-hover:text-zinc-700" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface FormattedMessageContentProps {
  content?: string;
  onOpenFile?: (path: string) => void;
}

// Format message markdown content with highlighted code tags
function FormattedMessageContent({ content, onOpenFile }: FormattedMessageContentProps) {
  if (!content) return null;

  // Simple markdown tokenizer for bullet points, bolding, and code chips
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5 text-[13px] leading-relaxed break-words overflow-hidden">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Bullet point
        const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
        const textWithoutBullet = isBullet ? trimmed.substring(2) : trimmed;

        // Parse inline code blocks `code`
        const parts = textWithoutBullet.split(/(`[^`]+`)/g);

        return (
          <p key={idx} className={`${isBullet ? 'pl-2 border-l-2 border-zinc-200' : ''} break-words`}>
            {parts.map((part, partIdx) => {
              if (part.startsWith("`") && part.endsWith("`")) {
                const codeVal = part.slice(1, -1);
                const isFile = codeVal.startsWith("/");
                return (
                  <span
                    key={partIdx}
                    onClick={() => isFile && onOpenFile && onOpenFile(codeVal)}
                    className={`inline-block px-1.5 py-0.2 mx-0.5 font-mono text-[11px] rounded break-all ${
                      isFile
                        ? "bg-zinc-100 text-zinc-900 hover:bg-zinc-900 hover:text-white cursor-pointer font-semibold"
                        : "bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {codeVal}
                  </span>
                );
              }
              return <span key={partIdx}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

interface ChatPanelProps {
  messages?: ChatMessage[];
  onSend: (prompt: string, images?: string[]) => void;
  onStop?: () => void;
  onOpenFile?: (path: string) => void;
  loading?: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages = [],
  onSend,
  onStop,
  onOpenFile,
  loading = false,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Group consecutive build step messages
  const processedMessages = useMemo(() => {
    const groups: Array<
      | { type: "build_steps"; items: ChatMessage[] }
      | { type: "chat_message"; msg: ChatMessage }
    > = [];
    let currentBuildSteps: ChatMessage[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (isBuildStepMessage(msg)) {
        currentBuildSteps.push(msg);
      } else {
        if (currentBuildSteps.length > 0) {
          groups.push({ type: "build_steps", items: [...currentBuildSteps] });
          currentBuildSteps = [];
        }
        groups.push({ type: "chat_message", msg });
      }
    }

    if (currentBuildSteps.length > 0) {
      groups.push({ type: "build_steps", items: [...currentBuildSteps] });
    }

    return groups;
  }, [messages]);

  const handleQuickPromptClick = (promptText: string) => {
    if (!loading && onSend) {
      onSend(promptText, []);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 hide-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-600 mb-3 shadow-2xs">
              <SparklesIcon size={18} />
            </div>
            <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1">
              Builder AI Assistant
            </h3>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
              Ask AI to redesign sections, add dark mode, refine typography, or paste reference screenshots.
            </p>
          </div>
        )}

        {processedMessages.map((item, idx) => {
          if (item.type === "build_steps") {
            return <BuildStepsCard key={idx} items={item.items} onOpenFile={onOpenFile} />;
          }

          const msg = item.msg;
          const isUser = msg.role === "user";

          return (
            <div key={idx} className={`flex gap-2.5 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
              <div
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 text-xs font-medium shadow-2xs ${
                  isUser ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {isUser ? <UserIcon size={13} /> : <BotIcon size={13} />}
              </div>

              <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
                <div
                  className={`inline-block text-left rounded-2xl p-3 max-w-[92%] shadow-2xs ${
                    isUser
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-50 border border-zinc-200/80 text-zinc-800'
                  }`}
                >
                  <FormattedMessageContent content={msg.content} onOpenFile={onOpenFile} />

                  {/* Render user image thumbnails */}
                  {msg.images && msg.images.length > 0 && (
                    <div className={`mt-2 flex flex-wrap gap-1.5 ${isUser ? 'justify-end' : ''}`}>
                      {msg.images.map((imgSrc, imgIdx) => (
                        <img
                          key={imgIdx}
                          src={imgSrc}
                          alt={`Screenshot ${imgIdx + 1}`}
                          className="h-14 w-20 object-cover rounded-lg border border-white/20 shadow-xs"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Active Loading Bubble */}
        {loading && (
          <div className="flex gap-2.5 items-start">
            <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 bg-zinc-100 text-zinc-700">
              <BotIcon size={13} />
            </div>
            <div className="flex-1 bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3 inline-block max-w-[85%] shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-600">
                <Loader2Icon size={13} className="animate-spin text-zinc-900" />
                <span>AI Agent is writing and refining code...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick Suggestion Chips (Lovable Style) */}
      {!loading && messages.length > 0 && (
        <div className="px-3 pt-2 pb-1 border-t border-zinc-100 bg-white">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Quick Refinements
          </p>
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {QUICK_PROMPTS.map((promptText, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleQuickPromptClick(promptText)}
                className="px-2.5 py-1 rounded-full border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white bg-zinc-50 text-[11px] font-medium text-zinc-700 whitespace-nowrap cursor-pointer transition-colors shrink-0 shadow-2xs"
              >
                {promptText}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prompt Input Area */}
      <div className="p-3 border-t border-zinc-200 bg-white">
        <PromptInput 
          onSubmit={onSend} 
          onStop={onStop} 
          loading={loading} 
          placeholder="Ask AI to modify design, add sections, or paste screenshots..." 
          autoFocus
        />
      </div>
    </div>
  );
};

export default ChatPanel;
