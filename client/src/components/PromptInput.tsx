import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowRightIcon, CloudUploadIcon, ImagePlusIcon, Loader2Icon, SquareIcon, XIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import gsap from 'gsap';

interface PromptInputProps {
  onSubmit: (prompt: string, images?: string[]) => void;
  onStop?: () => void;
  loading?: boolean;
  placeholder?: string;
  large?: boolean;
  autoFocus?: boolean;
  variant?: "default" | "glass";
}

/**
 * Helper to compress images client-side before submission
 */
function compressImage(file: File, maxWidth = 1600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * PromptInput Component
 * 
 * Multi-line expanding prompt input with:
 * - HTML5 Canvas client-side image compression (up to 10 screenshots).
 * - Drag-and-drop & paste event handlers.
 * - GSAP-animated thumbnail additions and smooth send button states.
 */
const PromptInput: React.FC<PromptInputProps> = ({
  onSubmit,
  onStop,
  loading = false,
  placeholder = "Describe the website you want to build...",
  large = false,
  autoFocus = false,
  variant = "default"
}) => {
  const [value, setValue] = useState<string>("");
  const [images, setImages] = useState<string[]>([]); // array of base64 strings
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<any>(null);
  const uniqueInputId = useId();

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // GSAP Animation when new image thumbnails are added
  useEffect(() => {
    if (images.length > 0 && containerRef.current) {
      gsap.from(".gsap-thumbnail-pop", {
        scale: 0.8,
        opacity: 0,
        duration: 0.3,
        stagger: 0.05,
        ease: "back.out(1.7)"
      });
    }
  }, [images.length]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const incomingFiles = Array.from(fileList);
    const validImageFiles = incomingFiles.filter(f => f.type.startsWith("image/"));

    if (validImageFiles.length === 0) {
      toast.error("Please select valid image files (PNG, JPG, WebP)");
      return;
    }

    const remainingSlots = 10 - images.length;
    if (remainingSlots <= 0) {
      toast.error("Maximum 10 reference images allowed");
      return;
    }

    const filesToProcess = validImageFiles.slice(0, remainingSlots);
    if (validImageFiles.length > remainingSlots) {
      toast(`Only ${remainingSlots} more image(s) can be attached (max 10).`, { icon: "ℹ️" });
    }

    const toastId = toast.loading(`Optimizing ${filesToProcess.length} image(s)...`);
    try {
      const compressed = await Promise.all(
        filesToProcess.map(file => compressImage(file, 1600, 0.8))
      );
      setImages(prev => [...prev, ...compressed]);
      toast.success(`Attached ${filesToProcess.length} reference image(s)`, { id: toastId });
    } catch (err) {
      console.error("Image processing error:", err);
      toast.error("Failed to process attached image(s)", { id: toastId });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (textareaRef.current && !large) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(120, Math.max(24, textareaRef.current.scrollHeight))}px`;
    }
  };

  const handleClearInput = () => {
    setValue("");
    setImages([]);
    if (textareaRef.current && !large) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type && item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) pastedFiles.push(file);
      }
    }

    if (pastedFiles.length > 0) {
      const dataTransfer = new DataTransfer();
      pastedFiles.forEach(f => dataTransfer.items.add(f));
      handleFiles(dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    onSubmit(trimmed, images);
    handleClearInput();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (variant === "glass") {
    return (
      <form
        ref={containerRef}
        onSubmit={handleSubmit}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`max-w-2xl w-full relative glass-panel rounded-2xl focus-within:border-rose-400/50 focus-within:shadow-[0_20px_60px_rgba(244,63,94,0.25)] overflow-hidden transition-all duration-300 ${
          isDragging ? "border-rose-400/80 bg-black/40 shadow-[0_0_35px_rgba(244,63,94,0.35)]" : ""
        }`}
      >
        {/* Image Thumbnails Strip */}
        {images.length > 0 && (
          <div className="px-4 pt-3 pb-1 flex items-center gap-2.5 overflow-x-auto hide-scrollbar">
            {images.map((imgSrc, idx) => (
              <div key={idx} className="gsap-thumbnail-pop relative group shrink-0">
                <img
                  src={imgSrc}
                  alt={`Reference ${idx + 1}`}
                  className="h-14 w-20 object-cover rounded-lg border border-white/30 shadow-md transition-transform group-hover:scale-105"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-0.5 shadow-md cursor-pointer transition-colors"
                  title="Remove image"
                >
                  <XIcon size={12} />
                </button>
                <span className="absolute bottom-0.5 right-1 text-[9px] bg-black/70 text-white px-1.5 py-0.2 rounded font-mono">
                  #{idx + 1}
                </span>
              </div>
            ))}
            <span className="text-xs text-white/80 font-medium whitespace-nowrap pl-1">
              {images.length}/10 {images.length === 1 ? "image" : "images"} attached
            </span>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={isDragging ? "Drop your reference screenshots here..." : placeholder}
          disabled={loading}
          rows={3}
          className="w-full p-4 pb-2 resize-none placeholder:text-white/50 outline-none bg-transparent text-white text-base leading-relaxed"
        />

        <div className="flex items-center justify-between pb-3 px-3.5 gap-2">
          <label
            htmlFor={`file-upload-${uniqueInputId}`}
            className={`border border-white/20 hover:text-white hover:border-white/40 hover:bg-white/10 p-2 rounded-xl cursor-pointer flex items-center justify-center transition-all text-white/80 active:scale-95 ${
              images.length > 0 ? "bg-white/20 text-white border-white/40" : ""
            }`}
            title="Upload reference screenshot(s) (up to 10)"
          >
            <input
              ref={fileInputRef}
              type="file"
              id={`file-upload-${uniqueInputId}`}
              multiple
              accept="image/png, image/jpeg, image/webp"
              onChange={(e) => handleFiles(e.target.files)}
              hidden
            />
            <CloudUploadIcon size={18} />
          </label>

          <div className="flex items-center justify-end gap-2">
            {loading && onStop ? (
              <button
                type="button"
                onClick={onStop}
                title="Stop generation"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold cursor-pointer shadow-[0_4px_16px_rgba(244,63,94,0.4)] transition-all animate-pulse"
              >
                <SquareIcon size={12} className="fill-current" /> Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!value.trim() || loading}
                className="flex items-center justify-center p-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-500 hover:to-red-500 shadow-[0_4px_20px_rgba(244,63,94,0.45)] hover:shadow-[0_6px_25px_rgba(244,63,94,0.6)] disabled:opacity-40 disabled:hover:shadow-none cursor-pointer transition-all active:scale-95"
              >
                {loading ? <Loader2Icon size={18} className="animate-spin" /> : <ArrowRightIcon size={18} />}
              </button>
            )}
          </div>
        </div>
      </form>
    );
  }

  // Default Variant (e.g. ChatPanel & Builder Sidebar)
  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-white border border-zinc-200 rounded-xl flex flex-col gap-2 focus-within:ring-1 focus-within:ring-zinc-300 transition ${
        large ? "p-4" : "p-3"
      } ${isDragging ? "border-zinc-900 ring-1 ring-zinc-900 bg-zinc-50" : ""}`}
    >
      {/* Image Preview Strip */}
      {images.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 pt-0.5">
          {images.map((imgSrc, idx) => (
            <div key={idx} className="gsap-thumbnail-pop relative group shrink-0">
              <img
                src={imgSrc}
                alt={`Ref ${idx + 1}`}
                className="h-12 w-16 object-cover rounded border border-zinc-200 shadow-xs"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="absolute -top-1.5 -right-1.5 bg-zinc-900 hover:bg-red-600 text-white rounded-full p-0.5 cursor-pointer transition-colors shadow-xs"
                title="Remove image"
              >
                <XIcon size={10} />
              </button>
              <span className="absolute bottom-0.5 right-1 text-[8px] bg-black/70 text-white px-1 rounded font-mono">
                #{idx + 1}
              </span>
            </div>
          ))}
          <span className="text-[11px] text-zinc-500 font-medium whitespace-nowrap pl-1">
            {images.length}/10 {images.length === 1 ? "image" : "images"}
          </span>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={isDragging ? "Drop screenshot..." : placeholder}
          disabled={loading}
          rows={large ? 5 : 1}
          className={`flex-1 bg-transparent border-none outline-none resize-none text-zinc-900 placeholder:text-zinc-400 ${
            large ? "text-base" : "text-sm"
          }`}
        />

        <div className="flex items-center gap-1.5 shrink-0">
          <label
            htmlFor={`file-upload-${uniqueInputId}`}
            className={`p-1.5 rounded-lg border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 text-zinc-600 cursor-pointer flex items-center justify-center transition-colors ${
              images.length > 0 ? "bg-zinc-100 text-zinc-900 border-zinc-300" : ""
            }`}
            title="Attach reference screenshot(s) (up to 10)"
          >
            <input
              ref={fileInputRef}
              type="file"
              id={`file-upload-${uniqueInputId}`}
              multiple
              accept="image/png, image/jpeg, image/webp"
              onChange={(e) => handleFiles(e.target.files)}
              hidden
            />
            <ImagePlusIcon size={16} />
          </label>

          {loading && onStop ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop generation"
              className="inline-flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-all shadow-xs animate-pulse"
              style={{ height: large ? 36 : 28 }}
            >
              <SquareIcon size={11} className="fill-current" /> Stop
            </button>
          ) : (
            <button
              onClick={() => handleSubmit()}
              disabled={!value.trim() || loading}
              className="inline-flex items-center justify-center bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-40 cursor-pointer rounded-full shrink-0 transition-all shadow-xs"
              style={{
                width: large ? 36 : 28,
                height: large ? 36 : 28,
              }}
            >
              {loading ? <Loader2Icon size={large ? 20 : 14} className="animate-spin" /> : <ArrowRightIcon size={large ? 20 : 14} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptInput;
