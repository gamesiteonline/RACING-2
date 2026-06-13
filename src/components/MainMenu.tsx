/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Play, 
  Clock, 
  Zap, 
  Sparkles, 
  Users, 
  Car as CarIcon, 
  Settings as SettingsIcon, 
  Volume2, 
  VolumeX, 
  Coins, 
  ShieldAlert
} from 'lucide-react';
import { GameMode, Car } from '../types';
import { audioSynth } from '../audio';

interface MainMenuProps {
  activeCar: Car;
  creditsBalance: number;
  onSelectMode: (mode: GameMode) => void;
  onOpenGarage: () => void;
  onOpenSettings: () => void;
  onClaimDailyBonus: () => void;
  hasClaimedDaily: boolean;
}

export default function MainMenu({
  activeCar,
  creditsBalance,
  onSelectMode,
  onOpenGarage,
  onOpenSettings,
  onClaimDailyBonus,
  hasClaimedDaily,
}: MainMenuProps) {

  const [isAudioMuted, setIsAudioMuted] = React.useState(audioSynth.getMutedState());

  const handleAudioToggle = () => {
    audioSynth.playClick();
    const isMuted = audioSynth.toggleMute();
    setIsAudioMuted(isMuted);
  };

  const handleSelect = (mode: GameMode) => {
    audioSynth.playClick();
    onSelectMode(mode);
  };

  return (
    <div className="relative w-full min-h-screen bg-transparent text-white flex flex-col justify-between overflow-x-hidden z-10">
      
      {/* TOP STATUS BAR CONTAINER */}
      <header className="relative z-10 w-full px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-b from-black/90 to-transparent border-b border-white/5 backdrop-blur-sm">
        
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.6)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-widest font-display uppercase italic text-white leading-none">
                STREET <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">NITRO</span>
              </h1>
              <p className="text-[9px] font-mono tracking-widest text-[#a855f7] uppercase leading-none mt-0.5">ARCADE 3D RACING SYSTEM</p>
            </div>
          </div>

          <div className="hidden sm:block h-8 w-[1px] bg-white/10"></div>

          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-[0.2em] text-gray-500 font-bold">Driver Profile</span>
            <span className="text-sm font-black italic tracking-tighter uppercase text-slate-300">STREET_NITRO_X</span>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
            <span className="text-[10px] font-black tracking-widest uppercase text-slate-350">Online</span>
          </div>
        </div>

        {/* Balance Credit bar */}
        <div className="flex items-center gap-6">
          
          {/* Claim daily gift */}
          {!hasClaimedDaily && (
            <button 
              onClick={() => {
                audioSynth.playUpgradeDing();
                onClaimDailyBonus();
              }}
              className="px-4 py-2 text-xs font-black tracking-widest text-black bg-gradient-to-r from-[#ffea00] to-yellow-500 hover:shadow-[0_0_15px_rgba(234,179,8,0.4)] border-b-2 border-yellow-600 rounded-lg transition-all active:translate-y-0.5 animate-pulse cursor-pointer"
            >
              ★ DRIFT BONUS
            </button>
          )}

          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold italic">Credits</span>
            <span className="text-2xl font-black text-white font-mono leading-none flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-[#ffea00]" />
              {creditsBalance.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-[#a855f7] font-bold italic">FLEET</span>
            <span className="text-2xl font-black text-white font-mono leading-none">
              21 Cars
            </span>
          </div>

          <button
            onClick={handleAudioToggle}
            className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-slate-300 transition-all cursor-pointer"
          >
            {isAudioMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-blue-400" />}
          </button>
        </div>
      </header>

      {/* COMPACT ACTIVE CAR DISPLAY DECORATOR - SHOWROOM VIEWER */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-8 py-6 flex flex-col lg:flex-row items-stretch justify-center gap-8">
        
        {/* Left Side Column: Car Specs and Tuning Selector */}
        <div className="w-full lg:w-[320px] z-10 flex flex-col justify-center gap-6">
          <div className="space-y-1">
            <h2 className="text-xs uppercase tracking-[0.3em] text-blue-500 font-extrabold font-mono">Class {activeCar.class} Racer</h2>
            <h1 className="text-4xl lg:text-5xl font-black italic tracking-tighter leading-none uppercase font-display text-white">{activeCar.name}</h1>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-400">
                <span>Top Speed</span>
                <span className="text-blue-400">{activeCar.baseMaxSpeed + (activeCar.upgradeStars * 10)} KM/H</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400" style={{ width: `${Math.min(100, ((activeCar.baseMaxSpeed + (activeCar.upgradeStars * 10)) / 400) * 100)}%` }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-400">
                <span>Acceleration</span>
                <span className="text-blue-400">{(activeCar.acceleration * 10 + (activeCar.upgradeStars * 8)) / 10}s</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400" style={{ width: `${activeCar.acceleration * 10 + (activeCar.upgradeStars * 8)}%` }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-400">
                <span>Handling</span>
                <span className="text-blue-400">{activeCar.handling * 10 + (activeCar.upgradeStars * 6)} pts</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400" style={{ width: `${activeCar.handling * 10 + (activeCar.upgradeStars * 6)}%` }}></div>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">Nitro Efficiency</span>
              <div className="flex gap-1 h-3">
                <div className="flex-1 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)] rounded-sm"></div>
                <div className="flex-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] rounded-sm"></div>
                <div className="flex-1 bg-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.5)] rounded-sm"></div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={onOpenGarage} className="flex-1 py-4 bg-white text-black font-black uppercase italic tracking-tighter text-lg hover:bg-blue-400 active:translate-y-0.5 transition-all cursor-pointer">Customize</button>
            <button onClick={onOpenSettings} className="w-16 h-16 border-2 border-white flex items-center justify-center text-white hover:bg-white hover:text-black active:translate-y-0.5 transition-all cursor-pointer">
              <span className="text-2xl">★</span>
            </button>
          </div>
        </div>

        {/* Center Column: Interactive 3D Car Vector Showcase */}
        <div className="flex-1 relative flex items-center justify-center min-h-[300px] lg:min-h-[auto]">
          <div className="w-[85%] max-w-[500px] lg:max-w-[600px] aspect-[2/1] bg-gradient-to-br from-blue-900/10 to-purple-900/10 border border-white/5 rounded-[40px] rotate-[-6deg] flex items-center justify-center relative overflow-hidden group shadow-2xl">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.03)_50%,transparent_75%)] bg-[length:200%_200%]"></div>
            <span className="text-white/[0.03] text-6xl md:text-8xl font-black italic select-none absolute uppercase tracking-widest font-display">
              {activeCar.name.split(' ').pop()}
            </span>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 h-2 bg-blue-500/30 blur-xl"></div>
            
            {/* Draw Car Chassis Outline */}
            <svg className="w-11/12 max-w-[380px] drop-shadow-[0_0_25px_rgba(59,130,246,0.4)] transition-transform duration-500 group-hover:scale-105 z-10" viewBox="0 0 400 200">
              {/* Back spoilers */}
              <rect x="50" y="45" width="20" height="40" fill="#0f172a" rx="2" />
              <line x1="60" y1="50" x2="60" y2="90" stroke="#a855f7" strokeWidth="4" />
              <rect x="40" y="35" width="10" height="60" fill="#0f172a" rx="1" />

              {/* Main Body paint */}
              <path d="M 60 90 L 100 50 L 260 50 L 330 90 L 350 110 L 350 140 L 60 140 Z" fill={activeCar.color} />
              <path d="M 120 50 L 160 10 L 250 10 L 280 50 Z" fill="#090d16" />

              {/* Wheels */}
              <circle cx="110" cy="140" r="28" fill="#1e293b" stroke="#00ffff" strokeWidth="3" />
              <circle cx="110" cy="140" r="14" fill="#64748b" />
              <circle cx="290" cy="140" r="28" fill="#1e293b" stroke="#00ffff" strokeWidth="3" />
              <circle cx="290" cy="140" r="14" fill="#64748b" />

              {/* Underglow */}
              <line x1="110" y1="168" x2="290" y2="168" stroke="#00ffff" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
            </svg>
          </div>
        </div>

        {/* Right Side Column: Modern interactive list of Game Modes */}
        <div className="w-full lg:w-[360px] z-10 flex flex-col justify-center gap-4">
          
          {/* Featured Campaign Event */}
          <div className="p-5 bg-gradient-to-br from-white/10 to-transparent border-l-4 border-blue-500 rounded-r-lg shadow-lg relative overflow-hidden group text-left">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">FEATURED CAMPAIGN</h3>
            <p className="text-xl font-extrabold uppercase italic tracking-tight text-white mb-2 font-display">Tokyo Night Run</p>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-2 py-0.5 bg-white/10 rounded font-bold">GATE DRIFT</span>
              <span className="text-gray-400 font-bold">2.5 KM Track</span>
            </div>
            <button onClick={() => handleSelect('Career')} className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 font-black uppercase italic tracking-tighter text-md shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] active:translate-y-0.5 transition-all text-white cursor-pointer select-none">
              Race Now
            </button>
          </div>

          {/* Quick-play Action Options Grid */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              id="btn-timetrial"
              onClick={() => handleSelect('TimeTrial')}
              className="p-3 bg-white/5 hover:bg-[#111] hover:border-white/20 border border-white/10 flex flex-col items-center justify-center gap-1 rounded transition-all cursor-pointer select-none text-center"
            >
              <Clock className="w-5 h-5 text-yellow-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Time Trial</span>
            </button>
            <button 
              id="btn-knockdown"
              onClick={() => handleSelect('Knockdown')}
              className="p-3 bg-white/5 hover:bg-[#111] hover:border-white/20 border border-white/10 flex flex-col items-center justify-center gap-1 rounded transition-all cursor-pointer select-none text-center"
            >
              <Zap className="w-5 h-5 text-red-500" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Knockdown</span>
            </button>
            <button 
              id="btn-gatedrift"
              onClick={() => handleSelect('GateDrift')}
              className="p-3 bg-white/5 hover:bg-[#111] hover:border-white/20 border border-white/10 flex flex-col items-center justify-center gap-1 rounded transition-all cursor-pointer select-none text-center"
            >
              <Sparkles className="w-5 h-5 text-pink-500" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Gate Drift</span>
            </button>
            <button 
              id="btn-multiplayer"
              onClick={() => handleSelect('Multiplayer')}
              className="p-3 bg-white/5 hover:bg-[#111] hover:border-white/20 border border-white/10 flex flex-col items-center justify-center gap-1 rounded transition-all cursor-pointer select-none text-center"
            >
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Multiplayer</span>
            </button>
            <button 
              id="btn-police"
              onClick={() => handleSelect('PoliceChase')}
              className="col-span-2 p-3 bg-red-950/10 hover:bg-red-950/20 hover:border-red-500/30 border border-red-500/10 flex items-center justify-center gap-2 rounded transition-all cursor-pointer select-none text-center"
            >
              <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-350">Police Evasion Mode</span>
            </button>
          </div>

        </div>
      </main>

      {/* FOOTER NAV BAR */}
      <footer className="relative z-10 px-8 py-6 bg-black flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-white/5">
        <div className="flex gap-8 md:gap-12">
          <button className="group flex flex-col items-center gap-1 cursor-pointer">
            <span className="text-[10px] uppercase font-black tracking-widest text-blue-500">Home</span>
            <div className="w-10 h-0.5 bg-blue-500"></div>
          </button>
          <button 
            onClick={() => {
              audioSynth.playClick();
              onOpenGarage();
            }}
            className="group flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors cursor-pointer"
          >
            <span className="text-[10px] uppercase font-black tracking-widest">Garage</span>
            <div className="w-10 h-0.5 bg-transparent group-hover:bg-white/20"></div>
          </button>
          <button 
            onClick={() => {
              audioSynth.playClick();
              onOpenSettings();
            }}
            className="group flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors cursor-pointer"
          >
            <span className="text-[10px] uppercase font-black tracking-widest">Settings</span>
            <div className="w-10 h-0.5 bg-transparent group-hover:bg-white/20"></div>
          </button>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 px-5 py-2.5 rounded-full border border-white/10">
          <div className="text-right">
            <div className="text-[9px] uppercase font-bold text-gray-500 tracking-[0.2em] leading-none mb-0.5">Next Level</div>
            <div className="text-xs font-black text-white">3,500 XP</div>
          </div>
          <div className="w-24 md:w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-[#3b82f6] rounded-full animate-pulse"></div>
          </div>
          <div className="w-7 h-7 rounded-full border border-white flex items-center justify-center font-black text-[11px] italic text-white bg-white/5">
            24
          </div>
        </div>
      </footer>
    </div>
  );
}
