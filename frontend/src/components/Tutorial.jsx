import { useState, useCallback } from 'react';
import {
  Plus, Link as LinkIcon, Sparkles, Search, MessageCircle,
  Share2, Compass, ArrowRight, ArrowLeft, FileText, Film,
  Music, Lock, Move, Star, ChevronRight,
} from 'lucide-react';

const STEPS = [
  {
    title: 'Welcome to Lattice',
    description: 'Your collaborative document workspace. Upload documents, discover connections with AI, and explore your knowledge visually on an interactive canvas.',
    sub: "Let's walk through the key features — this only takes a minute.",
  },
  {
    title: 'Upload Documents',
    description: 'Click the + button at the bottom-right to upload PDFs, audio files, or videos. You can upload multiple files at once (up to 300 MB per upload). Each document appears as a thumbnail on your canvas.',
    sub: 'Audio and video files are automatically transcribed so you can search their content too.',
  },
  {
    title: 'Interactive Canvas',
    description: 'Your documents live on an infinite canvas. Drag them anywhere to organize your workspace. Lock documents in place so they don\'t move accidentally.',
    sub: 'Use the Organize button in the toolbar to auto-arrange everything neatly.',
  },
  {
    title: 'Connect Documents',
    description: 'Click the link button at the bottom-right to enter connect mode. Then click two documents to create a connection. Click the diamond on any connection line to add or edit its description.',
    sub: 'Multiple connections between the same pair are supported — each with its own description and visual style.',
  },
  {
    title: 'AI Auto-Link',
    description: 'Select documents and click Auto-Link in the toolbar. Our AI reads your documents and discovers meaningful connections with strength scores from 1-10.',
    sub: 'You can set anchor documents, add guiding prompts, and define specific connection rules.',
  },
  {
    title: 'Search & Highlights',
    description: 'Use the search bar to find text across all your PDFs and audio/video transcripts. Click any result to jump straight to the matching page or section.',
    sub: 'Add persistent colour-coded highlights to mark important terms in your documents.',
  },
  {
    title: 'AI Chat Assistant',
    description: 'Open the chat panel on the right side of the screen. Ask questions about your documents and get answers with clickable citations that take you to the source.',
    sub: 'The assistant has access to all your uploaded documents and their transcripts.',
  },
  {
    title: 'Share & Explore',
    description: 'Click Share to publish a snapshot of your canvas for others to see. Browse the Explore page to view canvases shared by other users — read-only, with full document viewing.',
    sub: 'You\'re all set! Click below to start building your workspace.',
  },
];

function WelcomeIllustration() {
  return (
    <div className="relative w-56 h-40 animate-tutorial-float">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-5xl font-black tracking-tighter lattice-logo">Lattice</div>
      </div>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 224 160">
        <line x1="30" y1="40" x2="100" y2="80" stroke="#f97316" strokeWidth="1.5" opacity="0.3" className="animate-line-draw" />
        <line x1="194" y1="35" x2="130" y2="80" stroke="#eab308" strokeWidth="1.5" opacity="0.3" className="animate-line-draw" />
        <line x1="60" y1="130" x2="112" y2="90" stroke="#ef4444" strokeWidth="1.5" opacity="0.3" className="animate-line-draw" />
        <line x1="170" y1="125" x2="120" y2="85" stroke="#84cc16" strokeWidth="1.5" opacity="0.3" className="animate-line-draw" />
        <circle cx="30" cy="40" r="4" fill="#f97316" opacity="0.5" />
        <circle cx="194" cy="35" r="4" fill="#eab308" opacity="0.5" />
        <circle cx="60" cy="130" r="4" fill="#ef4444" opacity="0.5" />
        <circle cx="170" cy="125" r="4" fill="#84cc16" opacity="0.5" />
      </svg>
    </div>
  );
}

function UploadIllustration() {
  return (
    <div className="flex items-center gap-5 animate-tutorial-float">
      <div className="flex flex-col items-center gap-2">
        {[
          { Icon: FileText, color: 'text-magma-400', bg: 'bg-magma-500/10', label: 'PDF' },
          { Icon: Film, color: 'text-lava-400', bg: 'bg-lava-500/10', label: 'Video' },
          { Icon: Music, color: 'text-ember-400', bg: 'bg-ember-500/10', label: 'Audio' },
        ].map(({ Icon, color, bg, label }) => (
          <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${bg} border border-surface-600`}>
            <Icon size={16} className={color} />
            <span className="text-xs text-gray-300">{label}</span>
          </div>
        ))}
      </div>
      <ArrowRight size={20} className="text-lava-400 animate-pulse" />
      <div className="w-14 h-14 rounded-full bg-lava-600 flex items-center justify-center shadow-lg shadow-lava-600/30">
        <Plus size={24} className="text-white" />
      </div>
    </div>
  );
}

function CanvasIllustration() {
  return (
    <div className="relative w-64 h-36 animate-tutorial-float">
      {[
        { x: 10, y: 8, name: 'Research.pdf', moving: true },
        { x: 140, y: 5, name: 'Notes.pdf', locked: true },
        { x: 70, y: 70, name: 'Interview.mp3' },
      ].map((doc, i) => (
        <div
          key={i}
          className="absolute rounded-lg border border-surface-500 bg-surface-700 px-2.5 py-1.5 flex items-center gap-1.5 shadow-md"
          style={{ left: doc.x, top: doc.y }}
        >
          <FileText size={12} className="text-lava-400 shrink-0" />
          <span className="text-[10px] text-gray-300 whitespace-nowrap">{doc.name}</span>
          {doc.locked && <Lock size={9} className="text-ember-400" />}
          {doc.moving && <Move size={9} className="text-gray-500" />}
        </div>
      ))}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 256 144">
        <rect x="0" y="0" width="256" height="144" rx="8" fill="none" stroke="#3d332b" strokeWidth="1" strokeDasharray="4 3" />
      </svg>
    </div>
  );
}

function ConnectIllustration() {
  return (
    <div className="relative w-64 h-32 animate-tutorial-float">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 256 128">
        <path d="M 60 45 Q 128 20 196 45" fill="none" stroke="#fb923c" strokeWidth="2" opacity="0.7" className="animate-line-draw" />
        <rect x="123" y="26" width="10" height="10" rx="2" fill="#f97316" transform="rotate(45 128 31)" />
      </svg>
      <div className="absolute left-2 top-7 rounded-lg border border-surface-500 bg-surface-700 px-2.5 py-1.5 flex items-center gap-1.5">
        <FileText size={12} className="text-magma-400" />
        <span className="text-[10px] text-gray-300">Doc A</span>
      </div>
      <div className="absolute right-2 top-7 rounded-lg border border-surface-500 bg-surface-700 px-2.5 py-1.5 flex items-center gap-1.5">
        <FileText size={12} className="text-magma-400" />
        <span className="text-[10px] text-gray-300">Doc B</span>
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-3 rounded-lg border border-surface-600 bg-surface-800 px-3 py-1.5 shadow-lg">
        <p className="text-[9px] text-gray-400 text-center">Both discuss reinforcement learning<br />approaches to policy optimization</p>
      </div>
    </div>
  );
}

function AutoLinkIllustration() {
  return (
    <div className="flex flex-col items-center gap-3 animate-tutorial-float">
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-lava-500/15 border border-lava-500/30">
        <Sparkles size={18} className="text-lava-400" />
        <span className="text-sm font-medium text-lava-400">Auto-Link</span>
      </div>
      <div className="relative w-48 h-20">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 192 80">
          <line x1="36" y1="40" x2="96" y2="15" stroke="#22c55e" strokeWidth="1.5" opacity="0.6" className="animate-line-draw" />
          <line x1="36" y1="40" x2="96" y2="65" stroke="#eab308" strokeWidth="1.5" opacity="0.6" className="animate-line-draw" />
          <line x1="156" y1="40" x2="96" y2="15" stroke="#f97316" strokeWidth="1.5" opacity="0.6" className="animate-line-draw" />
          <line x1="156" y1="40" x2="96" y2="65" stroke="#ef4444" strokeWidth="1.5" opacity="0.6" className="animate-line-draw" />
          <circle cx="36" cy="40" r="5" fill="#3d332b" stroke="#f97316" strokeWidth="1.5" />
          <circle cx="156" cy="40" r="5" fill="#3d332b" stroke="#f97316" strokeWidth="1.5" />
          <circle cx="96" cy="15" r="5" fill="#3d332b" stroke="#eab308" strokeWidth="1.5" />
          <circle cx="96" cy="65" r="5" fill="#3d332b" stroke="#ef4444" strokeWidth="1.5" />
        </svg>
        <div className="absolute left-12 top-1/2 -translate-y-1/2 -translate-x-1/2">
          <span className="text-[8px] text-green-400 font-bold bg-surface-800 px-1 rounded">9.2</span>
        </div>
        <div className="absolute right-12 top-1/2 -translate-y-1/2 translate-x-1/2">
          <span className="text-[8px] text-lava-400 font-bold bg-surface-800 px-1 rounded">6.4</span>
        </div>
      </div>
    </div>
  );
}

function SearchIllustration() {
  return (
    <div className="flex flex-col items-center gap-3 animate-tutorial-float">
      <div className="relative w-52">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <div className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-surface-700 border border-lava-500/50 ring-2 ring-lava-500/20 text-lava-400">
          neural networks
        </div>
      </div>
      <div className="w-52 rounded-lg border border-surface-600 bg-surface-800 overflow-hidden">
        {['Research.pdf — Page 4', 'Interview.mp3 — Transcript'].map((r, i) => (
          <div key={i} className="px-3 py-1.5 border-b border-surface-600/50 last:border-0">
            <p className="text-[10px] text-gray-300">{r}</p>
            <p className="text-[9px] text-gray-500 mt-0.5">
              …the <mark className="bg-lava-500/30 text-lava-400 rounded px-0.5">neural networks</mark> approach…
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatIllustration() {
  return (
    <div className="w-56 rounded-xl border border-surface-600 bg-surface-800 overflow-hidden animate-tutorial-float shadow-lg">
      <div className="px-3 py-2 border-b border-surface-600 flex items-center gap-2">
        <MessageCircle size={14} className="text-lava-400" />
        <span className="text-[11px] font-medium text-gray-300">Chat</span>
      </div>
      <div className="px-3 py-2 space-y-2">
        <div className="flex justify-end">
          <div className="bg-lava-600/20 border border-lava-500/20 rounded-lg px-2.5 py-1.5 max-w-[80%]">
            <p className="text-[10px] text-gray-200">What are the key findings?</p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-surface-700 border border-surface-600 rounded-lg px-2.5 py-1.5 max-w-[90%]">
            <p className="text-[10px] text-gray-300">The study found that <span className="text-lava-400 underline cursor-pointer">transformer models outperform CNNs</span> in long-range tasks…</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareIllustration() {
  return (
    <div className="flex items-center gap-4 animate-tutorial-float">
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-10 h-10 rounded-full bg-lava-600/20 flex items-center justify-center">
          <Share2 size={18} className="text-lava-400" />
        </div>
        <span className="text-[9px] text-gray-500">Share</span>
      </div>
      <ChevronRight size={16} className="text-gray-600" />
      <div className="w-36 rounded-lg border border-surface-600 bg-surface-800 p-2.5 shadow-md">
        <div className="flex items-center gap-1.5 mb-1">
          <Compass size={12} className="text-lava-400" />
          <span className="text-[10px] font-medium text-gray-200">My Research</span>
        </div>
        <p className="text-[8px] text-gray-500">5 docs · 8 connections</p>
        <p className="text-[8px] text-gray-600 mt-0.5">user@example.com</p>
      </div>
    </div>
  );
}

const ILLUSTRATIONS = [
  WelcomeIllustration,
  UploadIllustration,
  CanvasIllustration,
  ConnectIllustration,
  AutoLinkIllustration,
  SearchIllustration,
  ChatIllustration,
  ShareIllustration,
];

export default function Tutorial({ onComplete }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState('right');
  const [animKey, setAnimKey] = useState(0);

  const goNext = useCallback(() => {
    if (step >= STEPS.length - 1) {
      onComplete();
      return;
    }
    setDirection('right');
    setAnimKey(k => k + 1);
    setStep(s => s + 1);
  }, [step, onComplete]);

  const goBack = useCallback(() => {
    if (step <= 0) return;
    setDirection('left');
    setAnimKey(k => k + 1);
    setStep(s => s - 1);
  }, [step]);

  const current = STEPS[step];
  const Illustration = ILLUSTRATIONS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[300] bg-surface-900/95 backdrop-blur-md flex items-center justify-center">
      {/* Background lattice pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="w-full h-full opacity-[0.04]" viewBox="0 0 800 600">
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 50} x2="800" y2={i * 50} stroke="#f97316" strokeWidth="0.5" />
          ))}
          {Array.from({ length: 16 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="600" stroke="#f97316" strokeWidth="0.5" />
          ))}
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-lg mx-4">
        {/* Skip button */}
        <div className="absolute -top-12 right-0">
          <button
            onClick={onComplete}
            className="text-xs text-gray-500 hover:text-gray-300 transition cursor-pointer"
          >
            Skip tutorial
          </button>
        </div>

        {/* Step counter */}
        <div className="text-center mb-6">
          <span className="text-[10px] uppercase tracking-widest text-gray-600 font-medium">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>

        {/* Card */}
        <div
          key={animKey}
          className={`bg-surface-800/80 border border-surface-600 rounded-2xl p-8 shadow-2xl shadow-black/40 backdrop-blur-sm ${
            direction === 'right' ? 'animate-tutorial-slide-right' : 'animate-tutorial-slide-left'
          }`}
        >
          {/* Illustration */}
          <div className="flex justify-center mb-7 min-h-[140px] items-center">
            <Illustration />
          </div>

          {/* Text */}
          <h2 className="text-xl font-bold text-white text-center mb-3">{current.title}</h2>
          <p className="text-sm text-gray-300 text-center leading-relaxed mb-2">{current.description}</p>
          {current.sub && (
            <p className="text-xs text-gray-500 text-center leading-relaxed">{current.sub}</p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={goBack}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > step ? 'right' : 'left'); setAnimKey(k => k + 1); setStep(i); }}
                className={`rounded-full transition-all cursor-pointer ${
                  i === step
                    ? 'w-6 h-2 bg-lava-500 animate-tutorial-dot-pulse'
                    : i < step
                      ? 'w-2 h-2 bg-lava-500/40'
                      : 'w-2 h-2 bg-surface-600'
                }`}
              />
            ))}
          </div>

          <button
            onClick={goNext}
            className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer ${
              isLast
                ? 'bg-lava-600 hover:bg-lava-500 text-white shadow-lg shadow-lava-600/20'
                : 'text-lava-400 hover:text-lava-300'
            }`}
          >
            {isLast ? 'Get Started' : 'Next'}
            {isLast ? <Star size={16} /> : <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
