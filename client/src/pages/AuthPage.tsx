import React, { useState, useEffect, useRef } from 'react';
import LoginLeft from '../components/LoginLeft';
import { Link, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeOffIcon, Loader2Icon, ArrowRightIcon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import gsap from 'gsap';

interface AuthPageProps {
  mode: 'login' | 'register';
}

/**
 * AuthPage Component
 * 
 * Handles User Sign In and Account Registration with:
 * - GSAP-animated form entrance and transition.
 * - Tab switcher between "Sign in" and "Create account".
 * - Live dynamic password strength progress meter on registration.
 * - Solid high-contrast CTA buttons.
 * - HTTP-only session cookie management.
 */
const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const formContainerRef = useRef<HTMLDivElement | null>(null);
  const { login, register } = useAppContext();
  const navigate = useNavigate();

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const isLogin = mode === "login";

  useEffect(() => {
    setError("");
  }, [mode]);

  // GSAP Entrance animation when switching between Login & Register modes
  useEffect(() => {
    if (!formContainerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".gsap-auth-card",
        { y: 15, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
      );

      gsap.fromTo(
        ".gsap-form-field",
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: "power2.out", delay: 0.1 }
      );
    }, formContainerRef);

    return () => ctx.revert();
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (mode === "login" ? "Invalid email or password" : "Registration failed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex text-zinc-900 font-sans">
      {/* Left Panel - Branding */}
      <LoginLeft />

      {/* Right Panel - Form */}
      <div ref={formContainerRef} className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="gsap-auth-card w-full max-w-sm">
          
          {/* Top Mode Segmented Switcher */}
          <div className="flex items-center p-1 bg-zinc-100 rounded-xl mb-8 border border-zinc-200/80">
            <Link
              to="/login"
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-center transition-all ${
                isLogin
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-center transition-all ${
                !isLogin
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Create an account
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-1.5 font-sans">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-zinc-500">
              {isLogin ? "Enter your credentials to access BuilderAI workspace." : "Get started with free AI-powered website building."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 border border-red-200 bg-red-50 text-red-700 text-xs rounded-xl animate-in fade-in">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="gsap-form-field">
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 text-sm text-zinc-900 bg-white placeholder:text-zinc-300 transition-all"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div className="gsap-form-field">
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 text-sm text-zinc-900 bg-white placeholder:text-zinc-300 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div className="gsap-form-field">
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 text-sm text-zinc-900 bg-white placeholder:text-zinc-300 font-mono transition-all" 
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 flex items-center justify-center p-1 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                </button>
              </div>
              {!isLogin && <PasswordStrengthMeter password={password} />}
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading} 
              className="gsap-form-field w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all mt-3"
            >
              {loading ? (
                <>
                  <Loader2Icon className="animate-spin h-4 w-4" />
                  <span>{isLogin ? "Signing in..." : "Creating account..."}</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? "Sign in to BuilderAI" : "Create an account"}</span>
                  <ArrowRightIcon size={15} />
                </>
              )}
            </button>
          </form>

          <p className="gsap-form-field text-xs text-zinc-500 mt-8 pt-6 border-t border-zinc-100 text-center font-sans">
            {isLogin ? (
              <>
                New to BuilderAI?{" "}
                <Link to="/register" className="text-zinc-900 font-semibold hover:underline">
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link to="/login" className="text-zinc-900 font-semibold hover:underline">
                  Sign in here
                </Link>
              </>
            )}
          </p>

        </div>
      </div>
    </div>
  );
};

export default AuthPage;
