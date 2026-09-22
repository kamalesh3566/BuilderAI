import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import PromptInput from '../components/PromptInput';
import UserMenu from '../components/UserMenu';
import SettingsModal from '../components/SettingsModal';
import { homeTags } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, ClockIcon, SparklesIcon, Trash2Icon } from 'lucide-react';
import moment from "moment";
import gsap from 'gsap';

/**
 * HomePage Component
 * 
 * Features:
 * - GSAP-powered staggered hero reveals, ambient floating effects, and spring hover physics.
 * - Deep multi-layered frosted glassmorphism with specular inner highlights.
 * - Harmonious rose/coral accents tailored for the dark crimson background.
 * - Real-time project list with quick launch and delete actions.
 */
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const projectsRef = useRef<HTMLDivElement | null>(null);

  const {
    projects, 
    loadingProjects, 
    generatingProject, 
    loadProjects, 
    handleGenerate, 
    handleDelete,
    settingsModalOpen,
    settingsTab,
    openSettings,
    closeSettings
  } = useAppContext();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // GSAP Entrance Animations & Ambient Glow Loop
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      // 1. Navigation Slide-Down with subtle fade
      gsap.from(".gsap-nav", {
        y: -30,
        opacity: 0,
        duration: 0.9,
        ease: "power4.out"
      });

      // 2. Hero Elements Staggered Reveal
      gsap.from(".gsap-hero-item", {
        y: 35,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: "power4.out",
        delay: 0.15
      });

      // 3. Prompt Input Box Spring Pop with scale
      gsap.from(".gsap-prompt-box", {
        scale: 0.94,
        y: 20,
        opacity: 0,
        duration: 1.1,
        ease: "back.out(1.4)",
        delay: 0.4
      });

      // 4. Subtle ambient breathing glow animation behind the prompt input
      gsap.to(".gsap-ambient-glow", {
        opacity: 0.7,
        scale: 1.08,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // GSAP Staggered Entrance for Project Cards (with clearProps to guarantee 100% crispness)
  useEffect(() => {
    if (!loadingProjects && projects.length > 0 && projectsRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".gsap-project-card",
          { y: 18, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.45,
            stagger: 0.05,
            ease: "power2.out",
            clearProps: "all"
          }
        );
      }, projectsRef);

      return () => ctx.revert();
    }
  }, [loadingProjects, projects.length]);

  return (
    <div ref={containerRef} className="min-h-screen text-white font-sans flex flex-col justify-between selection:bg-rose-500/30 selection:text-white relative">
        {/* GPU Hardware-Accelerated Fixed Background Layer (Zero Repaint Lag) */}
        <div className="fixed inset-0 -z-10 bg-[url('/bg-img.webp')] bg-cover bg-center bg-no-repeat pointer-events-none transform-gpu will-change-transform" />

        {/* Top Navigation Bar with Frosted Glass Header */}
        <nav className="gsap-nav sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-black/10 backdrop-blur-xl border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate("/")}>
              <div className="p-1 rounded-lg bg-white/[0.08] border border-white/[0.15] shadow-sm group-hover:border-rose-400/40 group-hover:bg-white/[0.12] transition-all">
                <img src="/logo.svg" alt="logo" className='size-5.5'/>
              </div>
              <span className='text-xl font-semibold tracking-tight text-white group-hover:text-rose-100 transition-colors'>BuilderAI</span>
          </div>
          <div className='flex items-center gap-4 text-sm font-medium'>
            <UserMenu />
          </div>
        </nav>

        {/* Hero Section */}
        <div ref={heroRef} className="flex-1 flex flex-col items-center justify-center px-6 pb-20 mt-6 xl:mt-20">
          <div className="w-full max-w-2xl flex flex-col items-center relative">
              
              {/* Ambient Glow Orb */}
              <div className="gsap-ambient-glow absolute -top-12 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl pointer-events-none -z-10" />

              {/* Promo Badge */}
              <div className='gsap-hero-item flex items-center gap-2.5 p-1.5 pr-4 bg-white/[0.08] backdrop-blur-2xl rounded-full border border-white/[0.16] text-[13px] text-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]'>
                <span className='px-2.5 py-0.5 text-[11px] bg-gradient-to-r from-rose-500 to-red-600 rounded-full font-bold tracking-wider shadow-[0_0_12px_rgba(244,63,94,0.5)]'>PROMO</span>
                <span className="font-medium text-white/90">Create your first project for free.</span>
              </div>

              {/* Headline */}
              <h1 className='gsap-hero-item text-center text-4xl sm:text-5xl md:text-6xl font-medium mt-5 max-w-2xl text-white tracking-tight leading-[1.12] drop-shadow-sm'>
                Let's build your app together
              </h1>
              <p className='gsap-hero-item text-center text-sm md:text-base max-w-xl mt-3 text-white/75 leading-relaxed font-normal'> 
                Describe your idea and watch AI design, structure and launch your website instantly. No coding required.
              </p>

              {/* Prompt Input Box with Glassmorphic Styling */}
              <div className='gsap-prompt-box w-full mt-6'>
                <PromptInput 
                  onSubmit={handleGenerate}
                  loading={generatingProject}
                  placeholder='Create a portfolio website...'
                  variant='glass'
                  autoFocus
                />
              </div>

              {/* Infinite Continuous Marquee Tags */}
              <div className="gsap-hero-item masked-marquee w-full mt-5 max-w-2xl overflow-hidden py-1 select-none">
                  <div className="animate-marquee gap-2.5">
                      {[...homeTags, ...homeTags].map((tag, i)=>(
                        <button key={i}
                        onClick={() => handleGenerate(tag)}
                        disabled={generatingProject}
                        className='glass-pill px-4 py-1.5 rounded-full text-xs sm:text-sm text-white/90 cursor-pointer shrink-0 font-medium'>
                          {tag}
                        </button>
                      ))}
                  </div>
              </div>

              {/* All Projects Grid */}
              {!loadingProjects && projects.length > 0 && (
                <div ref={projectsRef} className="mt-12 w-full">

                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-rose-200/90 tracking-widest">
                        <SparklesIcon size={14} className="text-rose-400" />
                        <span>All Projects</span>
                      </div>
                      <span className='text-xs text-white/60 font-normal px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08]'>
                        {projects.length} {projects.length === 1 ? "project" : "projects"}
                      </span>
                    </div>

                    <div className="space-y-3 pr-1">
                      {projects.map((p)=>(
                        <div 
                          key={p._id} 
                          className='gsap-project-card glass-card group rounded-2xl p-4 flex items-center justify-between cursor-pointer' 
                          onClick={() => navigate(`/builder/${p._id}`)}
                        >
                            <div className="flex-1 min-w-0 pr-4">
                               <p className="text-sm font-semibold text-white truncate group-hover:text-rose-200 transition-colors duration-200">
                                 {p.name}
                               </p>
                               <div className="flex items-center gap-3 mt-1.5">
                                  <span className="text-xs text-zinc-300 flex items-center gap-1 font-normal">
                                    <ClockIcon size={12} className="text-rose-400"/>
                                    {moment(p.updatedAt || p.createdAt).fromNow()}
                                  </span>
                                  <span className="text-[11px] text-zinc-200 font-medium px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                                    v{p.version}
                                  </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(p._id);
                                }}
                                className='p-2 rounded-xl text-zinc-400 hover:text-rose-300 hover:bg-rose-500/20 opacity-0 group-hover:opacity-100 transition-all cursor-pointer'
                                title="Delete project">
                                  <Trash2Icon size={14}/>
                                </button>
                                <div className="p-2 rounded-xl bg-white/10 border border-white/10 group-hover:bg-rose-500/30 group-hover:border-rose-400/40 group-hover:text-rose-100 transition-all duration-200 shadow-sm">
                                  <ArrowRightIcon size={14} className="text-white group-hover:translate-x-0.5 transition-transform"/>
                                </div>
                            </div>
                        </div>
                      ))}
                    </div>
                </div>
              )}
          </div>
        </div>

        {/* Footer with Legal & Settings Links */}
        <footer className="w-full py-4 px-6 bg-black/10 backdrop-blur-xl border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between text-xs text-white/60 gap-2 shrink-0">
          <p>© {new Date().getFullYear()} BuilderAI. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => openSettings('terms')} 
              className="hover:text-white hover:underline transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <button 
              type="button"
              onClick={() => openSettings('privacy')} 
              className="hover:text-white hover:underline transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button 
              type="button"
              onClick={() => openSettings('profile')} 
              className="hover:text-white hover:underline transition-colors cursor-pointer"
            >
              Settings
            </button>
          </div>
        </footer>

        {/* Account Settings & Legal Modal */}
        <SettingsModal 
          isOpen={settingsModalOpen} 
          initialTab={settingsTab} 
          onClose={closeSettings} 
        />
    </div>
  );
};

export default HomePage;
