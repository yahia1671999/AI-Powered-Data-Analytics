import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, Cpu, Database, Fingerprint, Network, Scan, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WelcomeScreenProps {
  onEnter: (name: string) => void;
}

export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  const [name, setName] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'analyzing' | 'granted'>('idle');

  // Convert Google Drive view link to direct link for <img> tags
  const logoUrl = "https://lh3.googleusercontent.com/d/1N_tf1_gIky9eCPxyp8YP7nNfQVNBJXma";

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setIsTransitioning(true);
      startAnimationSequence();
    }
  };

  const startAnimationSequence = async () => {
    setStatus('scanning');
    await new Promise(r => setTimeout(r, 1500));
    setStatus('analyzing');
    await new Promise(r => setTimeout(r, 2000));
    setStatus('granted');
    await new Promise(r => setTimeout(r, 1000));
    onEnter(name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#020617] text-slate-50 font-sans">
      {/* Neural Cells & Synapses Background */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <svg className="w-full h-full">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Neural Connections */}
          {[...Array(20)].map((_, i) => {
            const x1 = Math.random() * 100 + "%";
            const y1 = Math.random() * 100 + "%";
            const x2 = Math.random() * 100 + "%";
            const y2 = Math.random() * 100 + "%";
            return (
              <motion.line
                key={`line-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(37, 99, 235, 0.15)"
                strokeWidth="0.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: [0, 1, 0], 
                  opacity: [0, 0.3, 0],
                  stroke: ["rgba(37, 99, 235, 0.1)", "rgba(6, 182, 212, 0.3)", "rgba(37, 99, 235, 0.1)"]
                }}
                transition={{ 
                  duration: 4 + Math.random() * 4, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: Math.random() * 5
                }}
              />
            );
          })}
          {/* Neural Nodes (Cells) */}
          {[...Array(30)].map((_, i) => (
            <motion.circle
              key={`node-${i}`}
              cx={Math.random() * 100 + "%"}
              cy={Math.random() * 100 + "%"}
              r={Math.random() * 2 + 1}
              fill="rgba(6, 182, 212, 0.5)"
              filter="url(#glow)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [1, 1.5, 1], 
                opacity: [0.1, 0.8, 0.1],
                fill: ["#2563eb", "#06b6d4", "#2563eb"]
              }}
              transition={{ 
                duration: 2 + Math.random() * 3, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: Math.random() * 5
              }}
            />
          ))}
        </svg>
      </div>

      {/* HUD Backdrop */}
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      {/* Animated Orbitals */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-blue-500/10 rounded-full animate-ping [animation-duration:8s]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-cyan-500/10 rounded-full animate-pulse [animation-duration:4s]" />

      <AnimatePresence mode="wait">
        {!isTransitioning ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            className="relative z-10 w-full max-w-md px-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8 flex justify-center"
            >
              <div className="relative p-1.5 overflow-hidden rounded-2xl bg-white shadow-[0_0_60px_rgba(255,255,255,0.4)]">
                <div className="bg-white rounded-xl p-2">
                  <img 
                    src={logoUrl} 
                    alt="MMK Logo" 
                    className="w-32 h-32 object-contain brightness-110 contrast-125"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/mmk/200/200';
                    }}
                  />
                </div>
              </div>
            </motion.div>

            <motion.h1 
              className="text-5xl font-black mb-2 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-cyan-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              MMK ANALYTICS
            </motion.h1>
            <motion.p 
              className="text-slate-400 mb-12 font-medium tracking-widest text-xs uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Next Gen Data Processing Unit
            </motion.p>

            <form onSubmit={handleStart} className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-500/10 blur-xl group-focus-within:bg-blue-500/20 transition-all rounded-full" />
                <Input
                  type="text"
                  placeholder="IDENTIFY YOURSELF..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="relative bg-slate-900/50 border-slate-800 text-center text-lg h-14 rounded-full tracking-widest uppercase focus-visible:ring-blue-500 focus-visible:border-blue-500 placeholder:text-slate-600"
                />
              </div>
              <Button 
                type="submit" 
                disabled={!name.trim()}
                className="w-full h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-[0.2em] shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all active:scale-95"
              >
                INITIALIZE CORE
              </Button>
            </form>

            <div className="mt-12 grid grid-cols-3 gap-4 opacity-30">
              <div className="flex flex-col items-center gap-2">
                <ShieldCheck size={16} />
                <span className="text-[10px] tracking-widest uppercase font-mono">Secured</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Cpu size={16} />
                <span className="text-[10px] tracking-widest uppercase font-mono">Quantum</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Network size={16} />
                <span className="text-[10px] tracking-widest uppercase font-mono">Neural</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 flex flex-col items-center justify-center space-y-12"
          >
            {/* Visualizer Circle */}
            <div className="relative w-64 h-64">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
                className="absolute inset-0 border-2 border-dashed border-blue-500/50 rounded-full"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
                className="absolute inset-4 border border-cyan-500/30 rounded-full border-t-2 border-t-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.2)]"
              />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <AnimatePresence mode="wait">
                  {status === 'scanning' && (
                    <motion.div
                      key="scanning"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.2 }}
                      className="flex flex-col items-center gap-4 text-blue-400"
                    >
                      <Scan size={48} className="animate-pulse" />
                      <div className="space-y-1">
                        <p className="text-xs font-mono tracking-tighter opacity-70">SUBJECT IDENTIFIED</p>
                        <p className="text-xl font-bold tracking-widest uppercase">{name}</p>
                      </div>
                    </motion.div>
                  )}

                  {status === 'analyzing' && (
                    <motion.div
                      key="analyzing"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.2 }}
                      className="flex flex-col items-center gap-4 text-cyan-400"
                    >
                      <BrainCircuit size={48} className="animate-bounce" />
                      <div className="space-y-1">
                        <p className="text-xs font-mono tracking-tighter opacity-70">ANALYZING PARAMETERS</p>
                        <motion.p 
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="text-xs font-mono"
                        >
                          {Math.floor(Math.random() * 10000000).toString(16)}...
                        </motion.p>
                      </div>
                    </motion.div>
                  )}

                  {status === 'granted' && (
                    <motion.div
                      key="granted"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center gap-4 text-green-400"
                    >
                      <ShieldCheck size={64} className="drop-shadow-[0_0_20px_rgba(74,222,128,0.5)]" />
                      <p className="text-2xl font-black tracking-[0.4em] uppercase shadow-green-500">ACCESS GRANTED</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Binary Rain Effect inside the Circle */}
            <div className="flex gap-1 h-8 opacity-40">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    height: [2, 12, 4, 30, 8],
                    backgroundColor: ['#3b82f6', '#06b6d4', '#4ade80']
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 0.5 + Math.random(),
                    ease: 'easeInOut'
                  }}
                  className="w-[2px] bg-blue-500 rounded-full"
                />
              ))}
            </div>
            
            <p className="text-[10px] font-mono tracking-[0.5em] text-blue-300 uppercase opacity-50">
              Initializing Core Modules...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight 
            }}
            animate={{ 
              y: [null, Math.random() * -100, Math.random() * 100],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 5 + Math.random() * 5,
              ease: 'linear'
            }}
            className="absolute w-1 h-1 bg-blue-400 rounded-full blur-[1px]"
          />
        ))}
      </div>
    </div>
  );
}
