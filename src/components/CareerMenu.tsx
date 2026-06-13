/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronLeft, Trophy, Lock, Flag, Coins, Target } from 'lucide-react';
import { CareerRace, Track } from '../types';
import { audioSynth } from '../audio';

interface CareerMenuProps {
  races: CareerRace[];
  tracks: Track[];
  creditsBalance: number;
  onSelectRace: (race: CareerRace) => void;
  onClose: () => void;
}

export default function CareerMenu({
  races,
  tracks,
  creditsBalance,
  onSelectRace,
  onClose,
}: CareerMenuProps) {

  const handleSelect = (race: CareerRace, indexNum: number) => {
    // A race is locked if the previous index races have not been completed
    if (indexNum > 0 && !races[indexNum - 1].completed) {
      audioSynth.playCrash(false); // Locked alarm thud
      return;
    }
    audioSynth.playClick();
    onSelectRace(race);
  };

  return (
    <div className="relative w-full min-h-screen bg-transparent text-white flex flex-col justify-between overflow-x-hidden z-10">
      
      {/* Dynamic graphic backdrops */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-40 left-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header toolbar */}
      <header className="relative z-10 w-full p-6 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              audioSynth.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-900 border border-white/5 hover:border-white/10 text-slate-300 active:translate-x-[-2px] transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-widest uppercase">STREET NITRO CAREER</h1>
            <p className="text-[10px] font-mono tracking-widest text-[#a855f7] uppercase">15 EXTREME MISSIONS WORLD TOUR</p>
          </div>
        </div>

        {/* Info stats */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span>PROGRESS: {races.filter((r) => r.completed).length} / {races.length} RESOLVED</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 border border-yellow-500/30 px-4 py-2 rounded-lg">
            <Coins className="w-4 h-4 text-[#ffea00]" />
            <span className="text-sm font-black text-yellow-400">
              {creditsBalance.toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      {/* CENTRAL TIMELINE CONTAINER */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full p-6 flex flex-col justify-center">
        
        {/* Missions flow list wrapper */}
        <div className="mb-4 text-center max-w-md mx-auto">
          <p className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">OFFLINE RACING CAMPAIGN</p>
          <h2 className="text-2xl font-black uppercase tracking-wide leading-none mt-1">SELECT DEPLOYMENT ZONE</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">Complete each street event sequentially to unlock rewards, purchase exotic models, and rule the leaderboards.</p>
        </div>

        {/* Horizontal or Vertical scroll timeline */}
        <div id="timeline-list" className="h-[430px] overflow-y-auto pr-3 space-y-3.5 custom-scrollbar bg-black/25 border border-white/5 p-4 rounded-2xl">
          {races.map((race, idx) => {
            const tr = tracks.find((t) => t.id === race.trackId) || tracks[0];
            const isCompleted = race.completed;
            const isLocked = idx > 0 && !races[idx - 1].completed;

            return (
              <div
                key={race.id}
                onClick={() => handleSelect(race, idx)}
                className={`relative group p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                  isLocked 
                    ? 'border-slate-800/60 bg-slate-950/20 opacity-55 cursor-not-allowed' 
                    : isCompleted
                      ? 'border-emerald-500/30 bg-emerald-950/5 hover:bg-emerald-950/10 cursor-pointer'
                      : 'border-white/10 bg-slate-905/45 hover:border-cyan-500/30 hover:bg-slate-900/60 cursor-pointer shadow-[0_2px_15px_rgba(0,0,0,0.2)]'
                }`}
              >
                
                {/* Indicators / Index bullet */}
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black font-sans text-sm ${
                    isLocked 
                      ? 'bg-slate-900 text-slate-600'
                      : isCompleted
                        ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : 'bg-cyan-950 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                  }`}>
                    {isLocked ? <Lock className="w-4 h-4 text-slate-500" /> : `${idx + 1}`}
                  </div>

                  <div>
                    <h3 className="text-md font-black tracking-wide uppercase leading-tight mb-0.5 flex items-center gap-2">
                      {race.title}
                      {isCompleted && (
                        <span className="text-[9px] font-bold font-mono tracking-widest text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          COMPLETED
                        </span>
                      )}
                    </h3>
                    
                    {/* Zone parameters metrics details */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 items-center mt-1">
                      <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <Flag className="w-3.5 h-3.5 text-[#a855f7]" />
                        {tr.name} ({tr.location})
                      </span>
                      <span className="text-[10px] uppercase font-bold text-cyan-500 bg-cyan-950/20 px-1.5 py-0.5 rounded">
                        {race.mode}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        tr.difficulty === 'Easy' ? 'text-emerald-400 bg-emerald-950/10' :
                        tr.difficulty === 'Medium' ? 'text-yellow-400 bg-yellow-950/10' : 'text-red-400 bg-red-950/10'
                      }`}>
                        {tr.difficulty}
                      </span>
                    </div>

                    {/* Mission specific target indicator */}
                    <p className="text-xs text-slate-350 font-sans mt-2 flex items-center gap-1.5 bg-black/30 p-1.5 px-3 rounded-md border border-white/5">
                      <Target className="w-3.5 h-3.5 text-pink-500" />
                      <span>MISSION GOAL: <strong className="text-white font-medium uppercase">{race.objective}</strong></span>
                    </p>
                  </div>
                </div>

                {/* Right side bounty credits card */}
                <div className="flex items-center sm:flex-col justify-end gap-3 sm:gap-1.5 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase sm:text-right w-full block">BOUNTY</span>
                  <div className="flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-500/20 px-3 py-1.5 rounded-lg text-[#ffea00] font-black font-mono">
                    <Coins className="w-4 h-4" />
                    {race.creditsReward.toLocaleString()}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </main>

      <footer className="relative z-10 w-full p-4 border-t border-white/5 bg-black/35 text-center text-xs text-slate-500 font-mono leading-none">
        STREET NITRO CHAMPIONSHIP CAMPAIGN PROTOCOL
      </footer>

    </div>
  );
}
