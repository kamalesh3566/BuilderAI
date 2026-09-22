import { XIcon } from 'lucide-react';
import React from 'react';
import toast from 'react-hot-toast';

interface PublishModalProps {
  publishUrl?: string;
  onClose: () => void;
}

const PublishModal: React.FC<PublishModalProps> = ({ publishUrl = '', onClose }) => {
  const handleCopyLink = () => {
    if (!publishUrl) return;
    navigator.clipboard.writeText(publishUrl);
    toast.success("Public link copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="glass-modal border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.15)] rounded-2xl max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer">
          <XIcon size={16} />
        </button>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-1">Your website is live!</h3>
          <p className="text-xs text-zinc-300">Anyone with the link below can view your published site.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-rose-300 uppercase tracking-widest mb-1.5">
              Published Link
            </label>
            <input
              type="text"
              readOnly
              value={publishUrl}
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-zinc-100 font-mono select-all outline-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold cursor-pointer rounded-xl shadow-[0_4px_16px_rgba(244,63,94,0.35)] transition-all text-center active:scale-95"
            >
              Copy Link
            </button>
            <button
              onClick={() => window.open(publishUrl, '_blank')}
              className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-medium cursor-pointer rounded-xl transition-all text-center active:scale-95"
            >
              Open Site
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublishModal;
