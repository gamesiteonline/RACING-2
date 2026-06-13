/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronLeft, Key, Sparkles, Star, Paintbrush, ArrowUpRight, Check, Coins } from 'lucide-react';
import { Car, CarClass } from '../types';
import { audioSynth } from '../audio';

interface GarageMenuProps {
  cars: Car[];
  activeCarId: string;
  creditsBalance: number;
  onSelectCar: (carId: string) => void;
  onUpgradeCar: (carId: string, cost: number) => void;
  onPaintCar: (carId: string, color: string) => void;
  onPurchaseCar: (carId: string, cost: number) => void;
  onClose: () => void;
}

const PAINT_COLORS = [
  { name: 'Ferrari Crimson', hex: '#ef4444' }, // Red
  { name: 'Veneno Sapphire', hex: '#3b82f6' },  // Blue
  { name: 'Cyber Lime', hex: '#10b981' },       // Green
  { name: 'Matte Obsidian', hex: '#18181b' },  // Black
  { name: 'Sterling Chrome', hex: '#94a3b8' },  // Silver
  { name: 'Alpine Frost', hex: '#f8fafc' },    // White
  { name: 'Volcanic Ochre', hex: '#f97316' },   // Orange
  { name: 'Aurora Velvet', hex: '#a855f7' },    // Purple
  { name: 'Agera Yellow', hex: '#fbbf24' },     // Yellow
];

export default function GarageMenu({
  cars,
  activeCarId,
  creditsBalance,
  onSelectCar,
  onUpgradeCar,
  onPaintCar,
  onPurchaseCar,
  onClose,
}: GarageMenuProps) {
  const [selectedCarId, setSelectedCarId] = useState<string>(activeCarId);

  const selectedCar = cars.find((c) => c.id === selectedCarId) || cars[0];

  // Map stars cost
  const getUpgradeCost = (currentStars: number) => {
    return (currentStars + 1) * 1200; // e.g. 1st star = 1200, 2nd = 2400, etc.
  };

  const handleSelect = () => {
    if (!selectedCar.purchased) return;
    audioSynth.playClick();
    onSelectCar(selectedCar.id);
  };

  const handlePurchase = () => {
    if (creditsBalance < selectedCar.cost) return;
    audioSynth.playUpgradeDing();
    onPurchaseCar(selectedCar.id, selectedCar.cost);
  };

  const handleUpgrade = () => {
    if (selectedCar.upgradeStars >= 5) return;
    const cost = getUpgradeCost(selectedCar.upgradeStars);
    if (creditsBalance < cost) return;
    audioSynth.playUpgradeDing();
    onUpgradeCar(selectedCar.id, cost);
  };

  const handlePaint = (hex: string) => {
    audioSynth.playClick();
    onPaintCar(selectedCar.id, hex);
  };

  // Compute stats bars based on upgrades
  const currentSpeed = selectedCar.baseMaxSpeed + (selectedCar.upgradeStars * 10);
  const maxPotentialSpeed = selectedCar.baseMaxSpeed + 50;

  const currentAccel = selectedCar.acceleration * 10 + (selectedCar.upgradeStars * 8);
  const currentHandling = selectedCar.handling * 10 + (selectedCar.upgradeStars * 6);

  return (
    <div className="relative w-full min-h-screen bg-transparent text-white flex flex-col justify-between overflow-x-hidden z-10">
      
      {/* Background aesthetics */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-40 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* HEADER CONTROLS bar */}
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
            <h1 className="text-xl font-black tracking-widest uppercase">GARAGE SHOWROOM</h1>
            <p className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">UPGRADE &PAINT TUNING AREA</p>
          </div>
        </div>

        {/* Current budget bar */}
        <div className="flex items-center gap-2 bg-slate-900 border border-yellow-500/30 px-4 py-2 rounded-lg">
          <Coins className="w-4 h-4 text-[#ffea00]" />
          <span className="text-sm font-black font-mono text-yellow-400">
            {creditsBalance.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">CREDITS</span>
          </span>
        </div>
      </header>

      {/* CENTRAL SPLIT VIEW: Grid of cars left, detailed editor panel right */}
      <div className="relative z-10 flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* LEFT COLUMN: Scrollable list of 21 Cars (lg:col-span-4) */}
        <div className="lg:col-span-5 bg-black/45 border border-white/5 rounded-2xl p-4 flex flex-col h-[520px] overflow-hidden">
          <div className="mb-3">
            <h3 className="text-xs font-mono text-slate-400 tracking-wider uppercase">SELECT VEHICLE ({cars.length})</h3>
          </div>

          <div id="cars-grid" className="flex-1 overflow-y-auto pr-2 space-y-2.5 custom-scrollbar">
            {cars.map((car) => {
              const isActive = car.id === activeCarId;
              const isSelected = car.id === selectedCarId;
              
              return (
                <div
                  key={car.id}
                  onClick={() => {
                    audioSynth.playClick();
                    setSelectedCarId(car.id);
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'border-white/5 bg-slate-900/35 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Small color indicator */}
                    <div 
                      className="w-3 h-8 rounded" 
                      style={{ backgroundColor: car.color }}
                    />
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wide leading-none mb-1">
                        {car.name}
                      </h4>
                      <div className="flex gap-1">
                        <span className="text-[9px] font-mono uppercase bg-slate-800 px-1.5 py-0.5 rounded text-purple-400">
                          {car.class}
                        </span>
                        {/* Rating stars display count */}
                        <div className="flex items-center gap-0.5 text-yellow-500">
                          {Array.from({ length: car.upgradeStars }).map((_, i) => (
                            <Star key={i} className="w-2.5 h-2.5 fill-yellow-500" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {car.purchased ? (
                      isActive ? (
                        <span className="text-[10px] font-sans font-bold text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-2 py-1 rounded">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400">
                          OWNED
                        </span>
                      )
                    ) : (
                      <span className="text-xs font-black font-mono text-[#ffea00] flex items-center gap-1 justify-end">
                        <Coins className="w-3.5 h-3.5" />
                        {car.cost.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive tuning module (lg:col-span-8) */}
        <div className="lg:col-span-7 bg-slate-900/30 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
          
          {/* Main Visual showcase car */}
          <div className="flex-1 flex flex-col items-center justify-center py-4">
            
            <span className="text-xs font-mono text-purple-400 tracking-widest uppercase mb-1">{selectedCar.class} RACER</span>
            <h2 className="text-2xl md:text-3xl font-black font-sans uppercase tracking-wide leading-none text-white text-center mb-6">
              {selectedCar.name}
            </h2>

            {/* Stylized custom SVG display representing vehicle */}
            <div className="w-80 h-32 flex items-center justify-center relative">
              <svg className="w-full h-full drop-shadow-[0_0_35px_rgba(168,85,247,0.3)] transition-transform duration-300" viewBox="0 0 400 200">
                <rect x="50" y="45" width="20" height="40" fill="#0f172a" rx="2" />
                <line x1="60" y1="50" x2="60" y2="90" stroke="#00ffff" strokeWidth="4" />
                <rect x="40" y="35" width="10" height="60" fill="#0f172a" rx="1" />
                
                {/* Paint layer dynamic fill */}
                <path d="M 60 90 L 100 50 L 260 50 L 330 90 L 350 110 L 350 140 L 60 140 Z" fill={selectedCar.color} />
                <path d="M 120 50 L 160 10 L 250 10 L 280 50 Z" fill="#090d16" />
                
                <circle cx="110" cy="140" r="28" fill="#1e293b" stroke="#a855f7" strokeWidth="3" />
                <circle cx="110" cy="140" r="14" fill="#64748b" />
                <circle cx="290" cy="140" r="28" fill="#1e293b" stroke="#a855f7" strokeWidth="3" />
                <circle cx="290" cy="140" r="14" fill="#64748b" />

                {/* Underglow bar lights matching selected color */}
                <line x1="110" y1="168" x2="290" y2="168" stroke={selectedCar.color} strokeWidth="6" strokeLinecap="round" opacity="0.65" />
              </svg>
            </div>

            {/* Rating Stars indicators */}
            <div className="flex items-center gap-1.5 mt-2 bg-slate-900 border border-white/5 py-1.5 px-4 rounded-full">
              <span className="text-[10px] font-mono text-slate-400 mr-2">TUNING RANGE:</span>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < selectedCar.upgradeStars ? 'fill-yellow-500 text-yellow-500' : 'text-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Core performance variables adjustments stats indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-6 mb-6">
            
            {/* Speed bar */}
            <div>
              <div className="flex justify-between items-baseline text-xs font-mono text-slate-400 mb-1.5">
                <span>TOP SPEED</span>
                <span className="text-white font-bold">{currentSpeed} KM/H</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="bg-cyan-400 h-full transition-all duration-300"
                  style={{ width: `${(currentSpeed / maxPotentialSpeed) * 100}%` }}
                />
              </div>
            </div>

            {/* Acceleration bar */}
            <div>
              <div className="flex justify-between items-baseline text-xs font-mono text-slate-400 mb-1.5">
                <span>ACCELERATION</span>
                <span className="text-white font-bold">{currentAccel}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-500 h-full transition-all duration-300"
                  style={{ width: `${currentAccel}%` }}
                />
              </div>
            </div>

            {/* Handling bar */}
            <div>
              <div className="flex justify-between items-baseline text-xs font-mono text-slate-400 mb-1.5">
                <span>HANDLING</span>
                <span className="text-white font-bold">{currentHandling}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="bg-[#ffea00] h-full transition-all duration-300"
                  style={{ width: `${currentHandling}%` }}
                />
              </div>
            </div>

          </div>

          {/* LOWER INTERACTIVE ACTIONS: Color spray selector & action buttons */}
          <div className="space-y-4">
            
            {/* Paint Spray Picker panel */}
            {selectedCar.purchased && (
              <div className="bg-black/45 border border-white/5 p-4 rounded-xl">
                <div className="flex items-center gap-1.5 mb-2.5 text-xs font-mono text-slate-400">
                  <Paintbrush className="w-3.5 h-3.5 text-pink-400" />
                  <span>SELECT METALLIC BODY PAINT TONES</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PAINT_COLORS.map((paint) => (
                    <button
                      key={paint.hex}
                      onClick={() => handlePaint(paint.hex)}
                      className={`w-9 h-9 rounded-lg border-2 transition-all relative ${
                        selectedCar.color === paint.hex ? 'border-cyan-400 scale-110 shadow-lg' : 'border-black'
                      }`}
                      style={{ backgroundColor: paint.hex }}
                      title={paint.name}
                    >
                      {selectedCar.color === paint.hex && (
                        <div className="absolute inset-0 m-auto w-4 h-4 bg-black/60 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-cyan-400 font-bold" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Primary selection buy updates validation action triggers */}
            <div className="flex flex-col sm:flex-row gap-3">
              
              {selectedCar.purchased ? (
                <>
                  {/* Select car */}
                  <button
                    onClick={handleSelect}
                    disabled={selectedCar.id === activeCarId}
                    className={`flex-1 py-4 text-xs font-black tracking-widest rounded-lg border-b-4 transition-all uppercase whitespace-nowrap px-4 ${
                      selectedCar.id === activeCarId
                        ? 'bg-slate-800 border-slate-950 text-slate-500 cursor-not-allowed'
                        : 'bg-cyan-500 border-cyan-700 text-black active:translate-y-1 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    }`}
                  >
                    {selectedCar.id === activeCarId ? 'VEHICLE ENGAGED' : 'ENGAGE VEHICLE'}
                  </button>

                  {/* Buy upgrade star */}
                  {selectedCar.upgradeStars < 5 ? (
                    <button
                      onClick={handleUpgrade}
                      disabled={creditsBalance < getUpgradeCost(selectedCar.upgradeStars)}
                      className={`flex-1 py-4 text-xs font-black tracking-widest rounded-lg border-b-4 transition-all uppercase flex items-center justify-center gap-2 px-4 ${
                        creditsBalance >= getUpgradeCost(selectedCar.upgradeStars)
                          ? 'bg-purple-600 border-purple-800 text-white active:translate-y-1'
                          : 'bg-slate-800 border-slate-950 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      UPGRADE GEAR (★{selectedCar.upgradeStars + 1} - {getUpgradeCost(selectedCar.upgradeStars).toLocaleString()} CR)
                    </button>
                  ) : (
                    <div className="flex-1 py-4 text-xs font-black font-sans text-center bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg">
                      TUNING OPTIMIZED (★5 MAX RATING)
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={creditsBalance < selectedCar.cost}
                  className={`w-full py-4 text-sm font-black tracking-widest rounded-lg border-b-4 transition-all uppercase flex items-center justify-center gap-3 ${
                    creditsBalance >= selectedCar.cost
                      ? 'bg-yellow-500 border-yellow-700 text-black active:translate-y-1 shadow-[0_0_15px_rgba(234,179,8,0.25)]'
                      : 'bg-slate-800 border-slate-950 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Key className="w-5 h-5 text-black" />
                  ACQUIRE RACER FOR {selectedCar.cost.toLocaleString()} CREDITS
                </button>
              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
