import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  BrainCircuit,
  ArrowRight,
  Sparkles,
  Zap,
  ShieldCheck,
  BarChart3,
  Bot,
  FlaskConical,
  MessageSquare,
  TrendingUp,
  Layers,
  CheckCircle2,
  Lock,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/common/Button';

export function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 text-white selection:bg-brand-500 selection:text-white">
      {/* ── TOP NAVIGATION BAR ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-gray-950/75 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-2.5 bg-gradient-to-tr from-brand-600 to-indigo-600 rounded-2xl shadow-lg shadow-brand-500/30">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-brand-300 bg-clip-text text-transparent">
              EngageAI
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-gray-300">
            <a href="#features" className="hover:text-brand-400 transition-colors">
              Features
            </a>
            <a href="#pipeline" className="hover:text-brand-400 transition-colors">
              ML Pipeline
            </a>
            <a href="#metrics" className="hover:text-brand-400 transition-colors">
              Impact
            </a>
          </nav>

          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <Button
                variant="primary"
                onClick={() => navigate('/dashboard')}
                className="bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/30"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Button
                  variant="primary"
                  onClick={() => navigate('/signup')}
                  className="bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-lg shadow-brand-500/30"
                >
                  Get Started Free <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ───────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-8 overflow-hidden">
        {/* Glowing backdrop blur */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-600/20 blur-[130px] rounded-full pointer-events-none -z-10" />

        {/* Badge */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-brand-300 backdrop-blur-md shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
          <span>Next-Generation Customer Feedback Intelligence & Triage</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.15]">
          Turn Customer Feedback Into{' '}
          <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
            Instant Product Clarity
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto font-normal leading-relaxed">
          EngageAI automatically ingests, analyzes, and categorizes multi-modal customer feedback with deep NLP sentiment scoring, priority routing, and AI-driven recommendations.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button
            size="lg"
            variant="primary"
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/signup')}
            className="w-full sm:w-auto px-8 py-4 text-base font-bold bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-xl shadow-brand-500/40 rounded-2xl"
          >
            {isAuthenticated ? 'Enter Workspace' : 'Start Analyzing Feedback'} <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-4 text-base font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 rounded-2xl"
          >
            Explore Sign In
          </Button>
        </div>

        {/* ── LIVE INTERACTIVE CAPABILITY PREVIEW ───────────────────── */}
        <div className="pt-12 max-w-5xl mx-auto">
          <div className="p-4 sm:p-6 bg-slate-900/80 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-2xl text-left space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono text-gray-400 ml-2">EngageAI v1.0 — Real-Time Inference Stream</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1.5" /> Pipeline Online
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1 */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold uppercase text-[10px]">
                    Very High Priority
                  </span>
                  <span className="text-gray-400 font-mono">REQ-83920B</span>
                </div>
                <p className="text-xs text-gray-200 font-medium line-clamp-2">
                  "Payment gateway is returning 500 error code on checkout."
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-gray-400 border-t border-white/5">
                  <span className="text-brand-300 font-semibold">Category: Bug Triage</span>
                  <span className="text-emerald-400 font-mono">98% Conf</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase text-[10px]">
                    Positive NPS (+0.84)
                  </span>
                  <span className="text-gray-400 font-mono">REQ-83919C</span>
                </div>
                <p className="text-xs text-gray-200 font-medium line-clamp-2">
                  "The new dashboard telemetry and fast exports saved our team 10 hours!"
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-gray-400 border-t border-white/5">
                  <span className="text-indigo-300 font-semibold">Category: Praise</span>
                  <span className="text-emerald-400 font-mono">96% Conf</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase text-[10px]">
                    High Priority (SLA: 4h)
                  </span>
                  <span className="text-gray-400 font-mono">REQ-83921A</span>
                </div>
                <p className="text-xs text-gray-200 font-medium line-clamp-2">
                  "API response latency spiked above 2.5 seconds on batch upload."
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-gray-400 border-t border-white/5">
                  <span className="text-amber-300 font-semibold">Category: Performance</span>
                  <span className="text-emerald-400 font-mono">94% Conf</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CORE PLATFORM FEATURES ─────────────────────────────────── */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 border-t border-white/10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <h2 className="text-xs uppercase font-extrabold tracking-widest text-brand-400">Platform Capabilities</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white">
            Engineered for Modern Product & Customer Experience Teams
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Feature 1 */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-brand-500/40 transition-all space-y-3">
            <div className="p-3 bg-brand-500/20 text-brand-400 rounded-xl w-fit">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">Executive Usage Dashboard</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Real-time telemetry, aggregate sentiment polarity trends, priority distribution, and latest submission digests.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-brand-500/40 transition-all space-y-3">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl w-fit">
              <FlaskConical className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">ML Pipeline Studio</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Multi-modal feedback processing supporting Text, CSV datasets, Excel workbooks, images, and structured JSON with deep content analysis.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-brand-500/40 transition-all space-y-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl w-fit">
              <Bot className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">AI Assistant Chatbot</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Conversational intelligence answering complex questions about customer pain points, SLA risks, and thematic trends.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-brand-500/40 transition-all space-y-3">
            <div className="p-3 bg-violet-500/20 text-violet-400 rounded-xl w-fit">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">Historical Usage Explorer</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Chronological ledger of past inference sessions, categorization parameters, and a flexible two-tier export system.
            </p>
          </div>
        </div>
      </section>

      {/* ── METRICS & IMPACT ───────────────────────────────────────── */}
      <section id="metrics" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <div className="p-8 sm:p-12 bg-gradient-to-r from-brand-950/40 via-slate-900 to-indigo-950/40 border border-brand-500/20 rounded-3xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-4xl sm:text-5xl font-extrabold text-white">4.8x</p>
            <p className="text-xs text-gray-400 uppercase font-semibold mt-1">Faster Triage & Resolution</p>
          </div>
          <div>
            <p className="text-4xl sm:text-5xl font-extrabold text-emerald-400">99.2%</p>
            <p className="text-xs text-gray-400 uppercase font-semibold mt-1">Classification Accuracy</p>
          </div>
          <div>
            <p className="text-4xl sm:text-5xl font-extrabold text-brand-300">50K+</p>
            <p className="text-xs text-gray-400 uppercase font-semibold mt-1">Feedback Items Processed</p>
          </div>
          <div>
            <p className="text-4xl sm:text-5xl font-extrabold text-indigo-300">&lt;150ms</p>
            <p className="text-xs text-gray-400 uppercase font-semibold mt-1">Real-Time Inference Latency</p>
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION ─────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
          Ready to Elevate Your Customer Intelligence?
        </h2>
        <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
          Join leading teams transforming customer feedback into actionable engineering and product impact.
        </p>
        <Button
          size="lg"
          variant="primary"
          onClick={() => navigate(isAuthenticated ? '/dashboard' : '/signup')}
          className="px-8 py-4 bg-brand-600 hover:bg-brand-500 shadow-xl shadow-brand-500/40 rounded-2xl font-bold"
        >
          {isAuthenticated ? 'Enter Workspace' : 'Get Started with EngageAI'} <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          <BrainCircuit className="w-4 h-4 text-brand-400" />
          <span className="font-bold text-gray-300">EngageAI</span>
          <span>© 2026 EngageAI Inc. All rights reserved.</span>
        </div>
        <div className="flex items-center space-x-6">
          <Link to="/login" className="hover:text-gray-300 transition-colors">
            Sign In
          </Link>
          <Link to="/signup" className="hover:text-gray-300 transition-colors">
            Create Account
          </Link>
          <a href="#features" className="hover:text-gray-300 transition-colors">
            Features
          </a>
        </div>
      </footer>
    </div>
  );
}
