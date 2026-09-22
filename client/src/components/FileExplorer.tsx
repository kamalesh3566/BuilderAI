import { FileCodeIcon, FileTextIcon, FolderOpenIcon } from 'lucide-react';
import React, { useMemo, useEffect, useRef } from 'react';
import gsap from 'gsap';

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

/**
 * Builds nested tree data structure from flat filepath array
 */
function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const filePath of paths.sort()) {
    const parts = filePath.split("/").filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLast = i === parts.length - 1;
      const fullPath = "/" + parts.slice(0, i + 1).join("/");
      let existing = current.find((n) => n.name === name);
      if (!existing) {
        existing = {
          name,
          path: fullPath,
          isDir: !isLast,
          children: [],
        };
        current.push(existing);
      }
      current = existing.children;
    }
  }
  return root;
}

function getFileIcon(name: string) {
  if (name.endsWith(".css")) return <FileTextIcon size={14} className="text-sky-500 shrink-0" />;
  if (name.endsWith(".jsx") || name.endsWith(".js") || name.endsWith(".tsx") || name.endsWith(".ts"))
    return <FileCodeIcon size={14} className="text-amber-500 shrink-0" />;
  if (name.endsWith(".json")) return <FileTextIcon size={14} className="text-emerald-500 shrink-0" />;
  return <FileTextIcon size={14} className="text-zinc-400 shrink-0" />;
}

interface TreeItemProps {
  node: TreeNode;
  activeFile: string;
  currentFile?: string | null;
  onFileSelect: (path: string) => void;
  depth?: number;
}

function TreeItem({ node, activeFile, currentFile, onFileSelect, depth = 0 }: TreeItemProps) {
  const isActive = node.path === activeFile;
  const isGenerating = Boolean(currentFile && currentFile === node.path);

  if (node.isDir) {
    return (
      <div>
        <div
          className="flex items-center gap-2 py-1 px-2 text-xs text-zinc-400 select-none"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <FolderOpenIcon size={14} className="text-zinc-600 opacity-60" />
          <span className="font-medium text-zinc-500">{node.name}</span>
        </div>
        {node.children.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            activeFile={activeFile}
            currentFile={currentFile}
            onFileSelect={onFileSelect}
            depth={depth + 1}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onFileSelect(node.path)}
      className={`gsap-tree-file w-full flex items-center justify-between gap-2 py-1.5 px-2 text-xs transition-colors rounded-lg cursor-pointer text-left ${
        isActive
          ? "bg-zinc-100 text-zinc-950 font-semibold shadow-2xs"
          : isGenerating
          ? "bg-violet-50 text-violet-900 font-medium"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {getFileIcon(node.name)}
        <span className="truncate">{node.name}</span>
      </div>

      {isGenerating && (
        <span className="flex items-center gap-1 text-[10px] text-violet-600 font-mono animate-pulse shrink-0">
          <span className="size-1.5 rounded-full bg-violet-600 animate-ping" />
          Writing
        </span>
      )}
    </button>
  );
}

interface FileExplorerProps {
  files?: Record<string, any>;
  activeFile: string;
  currentFile?: string | null;
  onFileSelect: (path: string) => void;
}

/**
 * FileExplorer Component
 * 
 * Interactive hierarchical directory tree for project component files.
 */
const FileExplorer: React.FC<FileExplorerProps> = ({ files, activeFile, currentFile, onFileSelect }) => {
  const tree = useMemo(() => buildTree(Object.keys(files || {})), [files]);
  const explorerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (explorerRef.current) {
      gsap.from(".gsap-tree-file", {
        x: -6,
        opacity: 0,
        duration: 0.25,
        stagger: 0.02,
        ease: "power2.out"
      });
    }
  }, [tree.length]);

  return (
    <div ref={explorerRef} className="py-2 overflow-y-auto hide-scrollbar">
      <div className="flex items-center justify-between px-3 py-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          Explorer
        </p>
        <span className="text-[10px] text-zinc-400 font-mono">
          {Object.keys(files || {}).length} files
        </span>
      </div>
      <div className="px-1 space-y-0.5">
        {tree.map((node) => (
          <TreeItem
            key={node.path}
            node={node}
            activeFile={activeFile}
            currentFile={currentFile}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;
