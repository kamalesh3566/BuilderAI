import React, { useState, useEffect } from 'react';
import { LaptopIcon, XIcon } from 'lucide-react';

export default function DeviceAdvisory() {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const checkDevice = () => {
      const isSmallScreen = window.innerWidth < 1024;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      setIsMobileOrTablet(isSmallScreen || (isTouchDevice && isMobileUA));
    };

    const isDismissed = sessionStorage.getItem('device_advisory_dismissed');
    if (isDismissed) {
      setDismissed(true);
    }

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('device_advisory_dismissed', 'true');
  };

  if (!isMobileOrTablet || dismissed) return null;

  return (
    <div className="fixed top-3 inset-x-3 md:inset-x-auto md:right-4 z-50 animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-auto">
      <div className="glass-modal text-white border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] rounded-2xl px-4 py-3 flex items-center gap-3 max-w-md mx-auto">
        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
          <LaptopIcon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white flex items-center gap-1.5">
            PC / Desktop Recommended
          </p>
          <p className="text-[11px] text-zinc-300 leading-tight mt-0.5">
            BuilderAI's split-screen code editor & live preview are optimized for larger screens.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          title="Dismiss notification"
        >
          <XIcon size={15} />
        </button>
      </div>
    </div>
  );
}
