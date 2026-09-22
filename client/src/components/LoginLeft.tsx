import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * LoginLeft Component
 * 
 * Visual branding sidebar with GSAP entrance reveal for logo, title, and descriptive feature copy.
 */
const LoginLeft: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".gsap-login-brand", {
        x: -30,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
      });

      gsap.from(".gsap-login-copy", {
        y: 20,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out",
        delay: 0.2
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="hidden lg:flex lg:w-2/5 bg-[url('/bg-img.webp')] bg-cover bg-center bg-no-repeat flex-col justify-between p-12 shrink-0 select-none">
        <div className='gsap-login-brand flex items-center gap-3'>
           <img src="/logo.svg" alt="Logo" className="size-9.5 drop-shadow-md"/>
           <span className="text-4xl font-medium text-white tracking-tight">Builder AI</span>
        </div>
        <div>
            <h2 className='gsap-login-copy text-3xl text-white font-medium leading-snug mb-3 tracking-tight'>Build your presence on web</h2>
            <p className="gsap-login-copy text-zinc-300 leading-relaxed font-normal">
                Describe what you need, preview instantly, and customize your site in real-time. React with clean JSX, verified layouts, and instant code exports.
            </p>
            <p className='gsap-login-copy text-zinc-400 text-sm mt-12'>© {new Date().getFullYear()} BuilderAI. All rights reserved.</p>
        </div>
    </div>
  );
};

export default LoginLeft;
