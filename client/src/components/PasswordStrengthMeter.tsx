import React from 'react';
import { CheckIcon } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password?: string;
}

export default function PasswordStrengthMeter({ password = '' }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const hasMinLength = password.length >= 8;
  const hasUpperAndLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const score = [hasMinLength, hasUpperAndLower, hasNumber, hasSpecial].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (score === 0) return { label: 'Too Weak', color: 'bg-red-500', text: 'text-red-600' };
    if (score === 1) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-600' };
    if (score === 2) return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600' };
    if (score === 3) return { label: 'Good', color: 'bg-blue-500', text: 'text-blue-600' };
    return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' };
  };

  const strength = getStrengthLabel();

  return (
    <div className="mt-2 space-y-2 animate-in fade-in duration-200">
      {/* 4-Segment Progress Bar */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              level <= score ? strength.color : 'bg-zinc-200'
            }`}
          />
        ))}
        <span className={`text-[10px] font-semibold pl-1.5 shrink-0 ${strength.text}`}>
          {strength.label}
        </span>
      </div>

      {/* Checklist Chips */}
      <div className="grid grid-cols-2 gap-1 text-[10px] pt-1">
        <div className={`flex items-center gap-1 transition-colors ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-zinc-400'}`}>
          <div className={`size-3 rounded-full flex items-center justify-center ${hasMinLength ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100'}`}>
            {hasMinLength ? <CheckIcon size={8} strokeWidth={3} /> : <span className="size-1 rounded-full bg-zinc-300" />}
          </div>
          <span>8+ characters</span>
        </div>

        <div className={`flex items-center gap-1 transition-colors ${hasUpperAndLower ? 'text-emerald-600 font-medium' : 'text-zinc-400'}`}>
          <div className={`size-3 rounded-full flex items-center justify-center ${hasUpperAndLower ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100'}`}>
            {hasUpperAndLower ? <CheckIcon size={8} strokeWidth={3} /> : <span className="size-1 rounded-full bg-zinc-300" />}
          </div>
          <span>Upper & lower case</span>
        </div>

        <div className={`flex items-center gap-1 transition-colors ${hasNumber ? 'text-emerald-600 font-medium' : 'text-zinc-400'}`}>
          <div className={`size-3 rounded-full flex items-center justify-center ${hasNumber ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100'}`}>
            {hasNumber ? <CheckIcon size={8} strokeWidth={3} /> : <span className="size-1 rounded-full bg-zinc-300" />}
          </div>
          <span>At least 1 number</span>
        </div>

        <div className={`flex items-center gap-1 transition-colors ${hasSpecial ? 'text-emerald-600 font-medium' : 'text-zinc-400'}`}>
          <div className={`size-3 rounded-full flex items-center justify-center ${hasSpecial ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100'}`}>
            {hasSpecial ? <CheckIcon size={8} strokeWidth={3} /> : <span className="size-1 rounded-full bg-zinc-300" />}
          </div>
          <span>Special character</span>
        </div>
      </div>
    </div>
  );
}
