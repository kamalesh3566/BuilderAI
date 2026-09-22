import React, { useEffect, useRef, useState } from 'react';
import { 
  UserIcon, 
  LockIcon, 
  FileTextIcon, 
  ShieldCheckIcon, 
  LogOutIcon, 
  ChevronDownIcon,
  CpuIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import gsap from 'gsap';

interface UserMenuProps {
  light?: boolean;
}

/**
 * UserMenu Component
 * 
 * Account dropdown providing quick access to Profile, BYOK Model settings,
 * Security & Password controls, Terms of Service, Privacy Policy, and Sign Out.
 * Enhanced with GSAP micro-animations on toggle.
 * When user is not logged in, displays clear "Sign in" and "Create an account" buttons.
 */
export default function UserMenu({ light = false }: UserMenuProps) {
  const { user, logout, openSettings } = useAppContext();
  const [open, setOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // GSAP Animation when dropdown opens
  useEffect(() => {
    if (open && dropdownRef.current) {
      gsap.fromTo(
        dropdownRef.current, 
        { opacity: 0, y: -8, scale: 0.96 }, 
        { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: "back.out(1.5)" }
      );

      gsap.fromTo(
        ".gsap-user-menu-item",
        { opacity: 0, x: -6 },
        { opacity: 1, x: 0, duration: 0.2, stagger: 0.03, ease: "power2.out", delay: 0.05 }
      );
    }
  }, [open]);

  // Guest State: Show Sign in & Create an account buttons
  if (!user) {
    return (
      <div className="flex items-center gap-2.5">
        <Link
          to="/login"
          className={`text-xs font-medium px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            light
              ? 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100'
              : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
        >
          Sign in
        </Link>
        <Link
          to="/register"
          className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs ${
            light
              ? 'bg-zinc-900 text-white hover:bg-zinc-800'
              : 'bg-white text-zinc-900 hover:bg-white/90'
          }`}
        >
          Create an account
        </Link>
      </div>
    );
  }

  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all ${
          light
            ? 'border-zinc-200 bg-white/80 hover:bg-zinc-100 text-zinc-800 backdrop-blur-md shadow-xs'
            : 'border-white/15 bg-black/30 hover:bg-black/45 text-white backdrop-blur-xl shadow-md'
        }`}
        title="Account Settings"
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
            light
              ? 'bg-zinc-900 text-white'
              : 'bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-sm'
          }`}
        >
          {initials}
        </div>
        <span className="text-xs font-medium max-w-28 truncate">{user.name}</span>
        <ChevronDownIcon size={12} className={`opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div 
          ref={dropdownRef} 
          className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl py-1.5 z-50 text-xs ${
            light
              ? 'bg-white/95 backdrop-blur-2xl border border-zinc-200/90 text-zinc-700'
              : 'glass-modal border border-white/15 text-zinc-200 shadow-[0_20px_50px_rgba(0,0,0,0.65)]'
          }`}
        >
          <div className={`px-3 py-2.5 border-b ${light ? 'border-zinc-100' : 'border-white/10'}`}>
            <p className={`font-semibold truncate ${light ? 'text-zinc-900' : 'text-white'}`}>{user.name}</p>
            <p className={`text-[11px] truncate mt-0.5 ${light ? 'text-zinc-400' : 'text-white/60'}`}>{user.email}</p>
          </div>

          <div className="py-1 px-1 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openSettings('profile');
              }}
              className={`gsap-user-menu-item w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-left ${
                light ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950' : 'text-zinc-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <UserIcon size={14} className={light ? "text-zinc-400" : "text-white/60"} />
              <span>Profile & Account</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openSettings('models');
              }}
              className={`gsap-user-menu-item w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-left ${
                light ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950' : 'text-zinc-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <CpuIcon size={14} className={light ? "text-zinc-400" : "text-white/60"} />
              <span>AI Models & API Keys</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openSettings('security');
              }}
              className={`gsap-user-menu-item w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-left ${
                light ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950' : 'text-zinc-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <LockIcon size={14} className={light ? "text-zinc-400" : "text-white/60"} />
              <span>Password & Security</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openSettings('terms');
              }}
              className={`gsap-user-menu-item w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-left ${
                light ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950' : 'text-zinc-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FileTextIcon size={14} className={light ? "text-zinc-400" : "text-white/60"} />
              <span>Terms of Service</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openSettings('privacy');
              }}
              className={`gsap-user-menu-item w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-left ${
                light ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950' : 'text-zinc-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ShieldCheckIcon size={14} className={light ? "text-zinc-400" : "text-white/60"} />
              <span>Privacy Policy</span>
            </button>
          </div>

          <div className={`pt-1 px-1 border-t ${light ? 'border-zinc-100' : 'border-white/10'}`}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className={`gsap-user-menu-item w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-left font-medium ${
                light ? 'text-red-600 hover:bg-red-50' : 'text-rose-400 hover:bg-rose-500/20 hover:text-rose-200'
              }`}
            >
              <LogOutIcon size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
