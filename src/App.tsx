/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Coins, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Wrench, 
  Gauge, 
  Home, 
  RotateCcw, 
  Award, 
  Flame, 
  Compass, 
  ShieldAlert, 
  ChevronLeft,
  Wrench as GarageIcon 
} from 'lucide-react';
import MainMenu from './components/MainMenu';
import GarageMenu from './components/GarageMenu';
import CareerMenu from './components/CareerMenu';
import GameCanvas from './components/GameCanvas';
import { Car, Track, CareerRace, GameMode } from './types';
import { audioSynth } from './audio';

// Detailed Track specs matching Prompts 11, 12, 13
const TRACKS_PRESET: Track[] = [
  {
    id: 'city-night',
    name: 'City Night Showcase',
    location: 'China',
    lengthKm: 2.5,
    difficulty: 'Medium',
    backgroundColors: ['#04081c', '#03082a'],
    skyColor: '#0c021f',
    roadColor: '#1f2035',
    stripeColor: '#00ffff',
    fogColor: '#080112',
    environmentType: 'city',
  },
  {
    id: 'desert-highway',
    name: 'Sonoran Sunset Route',
    location: 'USA',
    lengthKm: 3.0,
    difficulty: 'Easy',
    backgroundColors: ['#c2410c', '#312e81'],
    skyColor: '#ff7e39',
    roadColor: '#2c2522',
    stripeColor: '#ff7a22',
    fogColor: '#df3c15',
    environmentType: 'desert',
  },
  {
    id: 'snow-mountain',
    name: 'Alpine Blizzard Pass',
    location: 'New Zealand',
    lengthKm: 2.8,
    difficulty: 'Hard',
    backgroundColors: ['#0369a1', '#1e293b'],
    skyColor: '#0284c7',
    roadColor: '#182435',
    stripeColor: '#ffffff',
    fogColor: '#e0f2fe',
    environmentType: 'snow',
  },
];

// 25 customizable cars exactly matching PROMPTS 4-8 across 5 classes
const CARS_PRESET: Car[] = [
  // Class 1 (Prompt 4): Supercars
  { id: 'ferrari-laferrari', name: 'Ferrari LaFerrari', class: 'Supercar', baseMaxSpeed: 320, acceleration: 8, handling: 8, color: '#ef4444', upgradeStars: 0, cost: 25000, purchased: false },
  { id: 'lamborghini-veneno', name: 'Lamborghini Veneno', class: 'Supercar', baseMaxSpeed: 325, acceleration: 9, handling: 8, color: '#3b82f6', upgradeStars: 0, cost: 28000, purchased: false },
  { id: 'aston-martin-vulcan', name: 'Aston Martin Vulcan', class: 'Supercar', baseMaxSpeed: 310, acceleration: 7, handling: 9, color: '#10b981', upgradeStars: 0, cost: 22000, purchased: false },
  { id: 'mclaren-p1', name: 'McLaren P1', class: 'Supercar', baseMaxSpeed: 322, acceleration: 8, handling: 8, color: '#f97316', upgradeStars: 0, cost: 24000, purchased: false },
  { id: 'porsche-918-spyder', name: 'Porsche 918 Spyder', class: 'Supercar', baseMaxSpeed: 315, acceleration: 7, handling: 8, color: '#fbbf24', upgradeStars: 0, cost: 23000, purchased: false },

  // Class 2 (Prompt 5): Hypercars
  { id: 'koenigsegg-agera', name: 'Koenigsegg Agera RS', class: 'Hypercar', baseMaxSpeed: 350, acceleration: 10, handling: 9, color: '#f97316', upgradeStars: 0, cost: 32000, purchased: false },
  { id: 'pagani-huayra', name: 'Pagani Huayra', class: 'Hypercar', baseMaxSpeed: 345, acceleration: 9, handling: 9, color: '#a855f7', upgradeStars: 0, cost: 30000, purchased: false },
  { id: 'bugatti-veyron', name: 'Bugatti Veyron', class: 'Hypercar', baseMaxSpeed: 355, acceleration: 10, handling: 7, color: '#10b981', upgradeStars: 0, cost: 35000, purchased: false },
  { id: 'bmw-m1', name: 'BMW M1 Classic', class: 'Hypercar', baseMaxSpeed: 280, acceleration: 6, handling: 7, color: '#3b82f6', upgradeStars: 0, cost: 12000, purchased: false },
  { id: 'ford-shelby', name: 'Ford Shelby GT350R', class: 'Hypercar', baseMaxSpeed: 290, acceleration: 7, handling: 7, color: '#ef4444', upgradeStars: 0, cost: 0, purchased: true }, // STARTER CAR!

  // Class 3 (Prompt 6): Muscle Cars
  { id: 'dodge-challenger', name: 'Dodge Challenger SRT', class: 'Muscle', baseMaxSpeed: 285, acceleration: 7, handling: 6, color: '#18181b', upgradeStars: 0, cost: 8000, purchased: false },
  { id: 'chevrolet-camaro', name: 'Chevrolet Camaro Z28', class: 'Muscle', baseMaxSpeed: 280, acceleration: 6, handling: 6, color: '#ffffff', upgradeStars: 0, cost: 7500, purchased: false },
  { id: 'ford-mustang', name: 'Ford Mustang GT', class: 'Muscle', baseMaxSpeed: 282, acceleration: 6, handling: 6, color: '#ef4444', upgradeStars: 0, cost: 8200, purchased: false },
  { id: 'bullet-police', name: 'Bullet Interceptor', class: 'Muscle', baseMaxSpeed: 290, acceleration: 8, handling: 7, color: '#3b82f6', upgradeStars: 0, cost: 15000, purchased: false },
  { id: 'dodge-viper', name: 'Dodge Viper V10', class: 'Muscle', baseMaxSpeed: 295, acceleration: 8, handling: 7, color: '#fbbf24', upgradeStars: 0, cost: 16500, purchased: false },

  // Class 4 (Prompt 7): Exotic Class
  { id: 'lotus-evora', name: 'Lotus Evora White', class: 'Exotic', baseMaxSpeed: 290, acceleration: 6, handling: 8, color: '#f8fafc', upgradeStars: 0, cost: 10000, purchased: false },
  { id: 'mercedes-sls', name: 'Mercedes SLS Coupe', class: 'Exotic', baseMaxSpeed: 300, acceleration: 7, handling: 8, color: '#18181b', upgradeStars: 0, cost: 14500, purchased: false },
  { id: 'ferrari-458', name: 'Ferrari 458 Italia', class: 'Exotic', baseMaxSpeed: 305, acceleration: 8, handling: 8, color: '#ef4444', upgradeStars: 0, cost: 18000, purchased: false },
  { id: 'lamborghini-huracan', name: 'Lamborghini Huracan', class: 'Exotic', baseMaxSpeed: 310, acceleration: 8, handling: 8, color: '#3b82f6', upgradeStars: 0, cost: 19500, purchased: false },
  { id: 'audi-r8', name: 'Audi R8 V10 Plus', class: 'Exotic', baseMaxSpeed: 308, acceleration: 7, handling: 9, color: '#94a3b8', upgradeStars: 0, cost: 16000, purchased: false },

  // Class 5 (Prompt 8): Tuner Class
  { id: 'nissan-gtr', name: 'Nissan GT-R Nismo', class: 'Tuner', baseMaxSpeed: 295, acceleration: 8, handling: 8, color: '#f97316', upgradeStars: 0, cost: 12500, purchased: false },
  { id: 'mazda-rx7', name: 'Mazda RX-7 Tuning', class: 'Tuner', baseMaxSpeed: 285, acceleration: 6, handling: 9, color: '#a855f7', upgradeStars: 0, cost: 9000, purchased: false },
  { id: 'subaru-impreza', name: 'Subaru Impreza WRX', class: 'Tuner', baseMaxSpeed: 290, acceleration: 7, handling: 8, color: '#10b981', upgradeStars: 0, cost: 9500, purchased: false },
  { id: 'honda-civic', name: 'Honda Civic Type R', class: 'Tuner', baseMaxSpeed: 280, acceleration: 6, handling: 7, color: '#fbbf24', upgradeStars: 0, cost: 5000, purchased: false },
  { id: 'mitsubishi-lancer', name: 'Mitsubishi Lancer Evo', class: 'Tuner', baseMaxSpeed: 288, acceleration: 7, handling: 8, color: '#18181b', upgradeStars: 0, cost: 8500, purchased: false },
];

// 15 Races across 3 tracks matching PROMPT 14
const CAREER_RACES_PRESET: CareerRace[] = [
  // Track 1: City Night (Races 1-5)
  { id: 1, title: 'Beijing Neon Chase', trackId: 'city-night', mode: 'Career', objective: 'Finish in Top 3 positions', creditsReward: 1000, completed: false },
  { id: 2, title: 'Shanghai Underglow Storm', trackId: 'city-night', mode: 'Knockdown', objective: 'Secure at least 1 crash knockdown', creditsReward: 1200, completed: false },
  { id: 3, title: 'Guangzhou Gate Slip', trackId: 'city-night', mode: 'GateDrift', objective: 'Accumulate 1000 drift points', creditsReward: 1400, completed: false },
  { id: 4, title: 'Urban Speed Bullet', trackId: 'city-night', mode: 'TimeTrial', objective: 'Lap track in under 1m 15s', creditsReward: 1600, completed: false },
  { id: 5, title: 'Metropolis Finals', trackId: 'city-night', mode: 'Multiplayer', objective: 'Claim 1st place vector victory', creditsReward: 2000, completed: false },

  // Track 2: Desert Highway (Races 6-10)
  { id: 6, title: 'Nevada Fuel Run', trackId: 'desert-highway', mode: 'Career', objective: 'Finish in Top 3 with any vehicle', creditsReward: 2000, completed: false },
  { id: 7, title: 'Arizona Dust Hazard', trackId: 'desert-highway', mode: 'Knockdown', objective: 'Perform 2 explosive knockdowns', creditsReward: 2200, completed: false },
  { id: 8, title: 'Canyon Curve Slide', trackId: 'desert-highway', mode: 'GateDrift', objective: 'Score 1800 score points', creditsReward: 2400, completed: false },
  { id: 9, title: 'Mojave Sunset Sprint', trackId: 'desert-highway', mode: 'TimeTrial', objective: 'Beat ghost lap time of 1m 30s', creditsReward: 2600, completed: false },
  { id: 10, title: 'Outback Dustbowl Finals', trackId: 'desert-highway', mode: 'Multiplayer', objective: 'Claim total leaderboard top spot', creditsReward: 3500, completed: false },

  // Track 3: Snow Mountain (Races 11-15)
  { id: 11, title: 'Frozen Heights Ascent', trackId: 'snow-mountain', mode: 'Career', objective: 'Secure 1st or 2nd placement', creditsReward: 3500, completed: false },
  { id: 12, title: 'Avanlanche Crash Course', trackId: 'snow-mountain', mode: 'Knockdown', objective: 'Perform 3 knockdowns back to back', creditsReward: 4000, completed: false },
  { id: 13, title: 'Blizzard Slide Drifters', trackId: 'snow-mountain', mode: 'GateDrift', objective: 'Score 3000 gate drift points', creditsReward: 4200, completed: false },
  { id: 14, title: 'Slippery Glacier Run', trackId: 'snow-mountain', mode: 'TimeTrial', objective: 'Complete lap inside 1m 24s', creditsReward: 4500, completed: false },
  { id: 15, title: 'Southern Cross Grand Prix', trackId: 'snow-mountain', mode: 'Multiplayer', objective: 'Championship gold 1st placement', creditsReward: 6000, completed: false },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'mainMenu' | 'garage' | 'career' | 'racing' | 'results' | 'settings'>('mainMenu');
  
  // Game balances
  const [creditsBalance, setCreditsBalance] = useState<number>(3000); // Starter allowance (Prompt 10)
  const [hasClaimedDaily, setHasClaimedDaily] = useState<boolean>(false);

  // States
  const [cars, setCars] = useState<Car[]>(CARS_PRESET);
  const [activeCarId, setActiveCarId] = useState<string>('ford-shelby');
  const [races, setRaces] = useState<CareerRace[]>(CAREER_RACES_PRESET);
  const [activeRace, setActiveRace] = useState<CareerRace | null>(null);
  const [selectedModeType, setSelectedModeType] = useState<GameMode>('Career');
  
  // Track parameters
  const [activeTrack, setActiveTrack] = useState<Track>(TRACKS_PRESET[0]);

  // Settings
  const [isHiresQuality, setIsHiresQuality] = useState<boolean>(true);

  // Active race outputs
  const [raceResults, setRaceResults] = useState<{
    position: number;
    creditsEarned: number;
    driftDistance: number;
    knockdowns: number;
    tokensCollected: number;
    bestTimeMs: number;
    objectiveMet: boolean;
  } | null>(null);

  const activeCar = cars.find((c) => c.id === activeCarId) || cars[0];

  // Helper local storage restoration if supported
  useEffect(() => {
    try {
      const savedCredits = localStorage.getItem('street_nitro_credits');
      if (savedCredits) setCreditsBalance(parseInt(savedCredits));

      const savedActiveCar = localStorage.getItem('street_nitro_active_car');
      if (savedActiveCar) setActiveCarId(savedActiveCar);

      const savedCars = localStorage.getItem('street_nitro_owned_cars');
      if (savedCars) {
        setCars(JSON.parse(savedCars));
      }

      const savedRaces = localStorage.getItem('street_nitro_completed_races');
      if (savedRaces) {
        setRaces(JSON.parse(savedRaces));
      }
    } catch (e) {
      console.warn("Storage restoral missed.", e);
    }
  }, []);

  // Sync balances back safely
  const persistState = (newCredits: number, newCarsList: Car[], newRacesList?: CareerRace[]) => {
    try {
      localStorage.setItem('street_nitro_credits', newCredits.toString());
      localStorage.setItem('street_nitro_active_car', activeCarId);
      localStorage.setItem('street_nitro_owned_cars', JSON.stringify(newCarsList));
      if (newRacesList) {
        localStorage.setItem('street_nitro_completed_races', JSON.stringify(newRacesList));
      }
    } catch (e) {}
  };

  // 2000 Free Credits Daily bonus (Prompt 37)
  const claimDailyBonus = () => {
    setHasClaimedDaily(true);
    const added = creditsBalance + 2000;
    setCreditsBalance(added);
    persistState(added, cars);
  };

  const handlePurchaseCar = (carId: string, cost: number) => {
    const updated = cars.map((c) => (c.id === carId ? { ...c, purchased: true } : c));
    const nextBalance = creditsBalance - cost;
    setCars(updated);
    setCreditsBalance(nextBalance);
    persistState(nextBalance, updated);
  };

  const handleUpgradeCar = (carId: string, cost: number) => {
    const updated = cars.map((c) => {
      if (c.id === carId) {
        return {
          ...c,
          upgradeStars: Math.min(5, c.upgradeStars + 1),
        };
      }
      return c;
    });
    const nextBalance = creditsBalance - cost;
    setCars(updated);
    setCreditsBalance(nextBalance);
    persistState(nextBalance, updated);
  };

  const handlePaintCar = (carId: string, color: string) => {
    const updated = cars.map((c) => (c.id === carId ? { ...c, color } : c));
    setCars(updated);
    persistState(creditsBalance, updated);
  };

  const handleSelectCar = (carId: string) => {
    setActiveCarId(carId);
    try {
      localStorage.setItem('street_nitro_active_car', carId);
    } catch (e) {}
  };

  // Launch Race stage
  const handleSelectMode = (mode: GameMode) => {
    setSelectedModeType(mode);
    if (mode === 'Career') {
      setCurrentScreen('career');
    } else {
      // Pick random track parameters and start immediately for Quick Play styles!
      const randomTrack = TRACKS_PRESET[Math.floor(Math.random() * TRACKS_PRESET.length)];
      setActiveTrack(randomTrack);
      setActiveRace(null);
      setCurrentScreen('racing');
    }
  };

  const handleSelectCareerRace = (race: CareerRace) => {
    setActiveRace(race);
    const targetTrack = TRACKS_PRESET.find((t) => t.id === race.trackId) || TRACKS_PRESET[0];
    setActiveTrack(targetTrack);
    setCurrentScreen('racing');
  };

  const handleRaceFinish = (results: {
    position: number;
    creditsEarned: number;
    driftDistance: number;
    knockdowns: number;
    tokensCollected: number;
    bestTimeMs: number;
  }) => {
    let met = true;

    // Evaluate goals match
    if (activeRace) {
      if (activeRace.mode === 'Career' && results.position > 3) met = false;
      if (activeRace.mode === 'Knockdown' && results.knockdowns < 1) met = false;
      if (activeRace.mode === 'GateDrift' && results.driftDistance < 1000) met = false;
      if (activeRace.mode === 'TimeTrial' && results.bestTimeMs > 75000) met = false; // 1m 15s limit
      if (activeRace.id === 5 && results.position !== 1) met = false; // 1st spot constraint

      if (activeRace.id > 5 && activeRace.id <= 10) {
        if (activeRace.mode === 'Knockdown' && results.knockdowns < 2) met = false;
        if (activeRace.mode === 'GateDrift' && results.driftDistance < 1800) met = false;
        if (activeRace.mode === 'TimeTrial' && results.bestTimeMs > 90000) met = false; // 1m 30s
      }

      if (activeRace.id > 10) {
        if (activeRace.mode === 'Career' && results.position > 2) met = false;
        if (activeRace.mode === 'Knockdown' && results.knockdowns < 3) met = false;
        if (activeRace.mode === 'GateDrift' && results.driftDistance < 3000) met = false;
        if (activeRace.mode === 'TimeTrial' && results.bestTimeMs > 84000) met = false; // 1m 24s
      }
    }

    // Accumulate budget and progress
    let ultimateReward = results.creditsEarned;
    let nextRacesList = [...races];

    if (activeRace && met) {
      ultimateReward += activeRace.creditsReward;
      nextRacesList = races.map((r) => (r.id === activeRace.id ? { ...r, completed: true } : r));
      setRaces(nextRacesList);
    }

    const nextBalance = creditsBalance + ultimateReward;
    setCreditsBalance(nextBalance);
    persistState(nextBalance, cars, nextRacesList);

    setRaceResults({
      ...results,
      creditsEarned: ultimateReward,
      objectiveMet: met,
    });

    setCurrentScreen('results');
  };

  return (
    <div className="w-full min-h-screen bg-[#050505] elegant-ambient-glow text-white flex flex-col font-sans select-none overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#1a1a2e_0%,transparent_70%)] opacity-50 pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-purple-600/5 blur-[100px] pointer-events-none z-0" />
      
      {/* 1. MAIN MENU SCREEN */}
      {currentScreen === 'mainMenu' && (
        <MainMenu
          activeCar={activeCar}
          creditsBalance={creditsBalance}
          onSelectMode={handleSelectMode}
          onOpenGarage={() => setCurrentScreen('garage')}
          onOpenSettings={() => setCurrentScreen('settings')}
          onClaimDailyBonus={claimDailyBonus}
          hasClaimedDaily={hasClaimedDaily}
        />
      )}

      {/* 2. GARAGE SCREEN */}
      {currentScreen === 'garage' && (
        <GarageMenu
          cars={cars}
          activeCarId={activeCarId}
          creditsBalance={creditsBalance}
          onSelectCar={handleSelectCar}
          onUpgradeCar={handleUpgradeCar}
          onPaintCar={handlePaintCar}
          onPurchaseCar={handlePurchaseCar}
          onClose={() => setCurrentScreen('mainMenu')}
        />
      )}

      {/* 3. CAREER MAP SELECT SCREEN */}
      {currentScreen === 'career' && (
        <CareerMenu
          races={races}
          tracks={TRACKS_PRESET}
          creditsBalance={creditsBalance}
          onSelectRace={handleSelectCareerRace}
          onClose={() => setCurrentScreen('mainMenu')}
        />
      )}

      {/* 4. ACTIVE GAMEPLAY SCREEN */}
      {currentScreen === 'racing' && (
        <div className="relative w-full h-screen">
          <GameCanvas
            activeCar={activeCar}
            activeTrack={activeTrack}
            gameMode={activeRace ? activeRace.mode : selectedModeType}
            isPaused={false}
            onRaceFinish={handleRaceFinish}
            onExitRace={() => {
              audioSynth.playClick();
              audioSynth.stopEngine();
              setCurrentScreen('mainMenu');
            }}
            creditsBalance={creditsBalance}
          />
          
          {/* Virtual ESC Trigger inside corner */}
          <button 
            onClick={() => {
              audioSynth.playClick();
              audioSynth.stopEngine();
              setCurrentScreen('mainMenu');
            }}
            className="absolute top-4 left-4 p-2 px-3 bg-red-600/80 hover:bg-red-700/80 hover:shadow-lg border border-red-500 rounded text-xs font-mono font-bold text-white z-45 pointer-events-auto shadow-md"
          >
            QUIT RACE
          </button>
        </div>
      )}

      {/* 5. RACE COMPLETED CEREMONY RESULTS VIEWER (Prompt 37) */}
      {currentScreen === 'results' && raceResults && (
        <div className="relative w-full h-screen bg-black/90 flex items-center justify-center p-6 z-50">
          {/* Spotlight decorations */}
          <div className="absolute inset-0 bg-radial-gradient from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

          <div id="results-ceremony" className="w-full max-w-lg bg-slate-900 border border-cyan-500/30 p-8 rounded-2xl text-center backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-cyan-500/10 rounded-full blur-2xl" />

            {/* Victory banner */}
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-pulse">
                <Trophy className="w-12 h-12" />
              </div>
            </div>

            <span className="text-[10px] font-mono tracking-widest text-[#a855f7] uppercase">STREET NITRO CHAMPIONSHIP</span>
            
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white uppercase leading-none mt-1 mb-2">
              {raceResults.position === 7 ? 'VEHICLE WRECKED' : 'RACE RESOLVED!'}
            </h1>

            {/* Placement banner */}
            {raceResults.position !== 7 && (
              <div className="inline-block px-4 py-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 font-black font-sans text-xs tracking-wider uppercase mb-6">
                OBTAINED: {raceResults.position === 1 ? '🥇 1st PLACE GOLD' : raceResults.position === 2 ? '🥈 2nd PLACE SILVER' : raceResults.position === 3 ? '🥉 3rd PLACE BRONZE' : `RANKING: #${raceResults.position}`}
              </div>
            )}

            {/* Main objectives outcome box */}
            {activeRace && (
              <div className={`p-3.5 rounded-lg mb-6 border text-xs font-mono uppercase tracking-wide flex items-center justify-center gap-2 ${
                raceResults.objectiveMet 
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                  : 'bg-red-950/20 border-red-500/30 text-red-400'
              }`}>
                <span>{raceResults.objectiveMet ? '★ MISSION OBJECTIVE ACCOMPLISHED!' : '⚠ MISSION TARGET NOT ATTAINED'}</span>
              </div>
            )}

            {/* Metric summaries lists */}
            <div className="grid grid-cols-2 gap-3 text-left font-mono text-xs mb-8 border-y border-white/5 py-4">
              <div className="bg-slate-900 border border-white/5 p-2 px-3 rounded">
                <span className="text-slate-400 block uppercase">Tokens Claimed</span>
                <strong className="text-yellow-400 text-sm font-black">{raceResults.tokensCollected} Stars</strong>
              </div>
              <div className="bg-slate-900 border border-white/5 p-2 px-3 rounded">
                <span className="text-slate-400 block uppercase">Drift segments</span>
                <strong className="text-cyan-400 text-sm font-black">{raceResults.driftDistance} pts</strong>
              </div>
              <div className="bg-slate-900 border border-white/5 p-2 px-3 rounded">
                <span className="text-slate-400 block uppercase">AI Knockdowns</span>
                <strong className="text-red-400 text-sm font-black">{raceResults.knockdowns} CRASHES</strong>
              </div>
              <div className="bg-slate-900 border border-white/5 p-2 px-3 rounded">
                <span className="text-slate-400 block uppercase">Best Lap Duration</span>
                <strong className="text-slate-200 text-sm font-black">
                  {Math.floor(raceResults.bestTimeMs / 60000)}:
                  {Math.floor((raceResults.bestTimeMs % 60000) / 1000).toString().padStart(2, '0')}.
                  {Math.floor((raceResults.bestTimeMs % 1000) / 10).toString().padStart(2, '0')}
                </strong>
              </div>
            </div>

            {/* Winnings reward box */}
            <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 border border-yellow-500/30 p-4 rounded-xl flex items-center justify-between mb-8">
              <div>
                <span className="text-xs text-slate-400 font-mono block text-left">CREDITS REWARD AWARDED</span>
                <span className="text-sm text-slate-300 font-bold font-sans text-left block">Career and race bounty totals</span>
              </div>
              <div className="flex items-center gap-1.5 text-2xl font-black font-mono text-[#ffea00]">
                <Coins className="w-6 h-6" />
                +{raceResults.creditsEarned.toLocaleString()}
              </div>
            </div>

            {/* Action buttons */}
            <button
              onClick={() => {
                audioSynth.playClick();
                setCurrentScreen('mainMenu');
              }}
              className="w-full py-4 text-xs font-black tracking-widest text-[#08090f] bg-cyan-400 border-b-4 border-cyan-700 hover:shadow-lg rounded-xl transition-all active:translate-y-1 uppercase"
            >
              CONTINUE TO GARAGE HUB
            </button>
          </div>
        </div>
      )}

      {/* 6. SETTINGS DETAILS MENU MODAL SCREEN */}
      {currentScreen === 'settings' && (
        <div className="w-full min-h-screen bg-transparent text-white flex flex-col justify-between overflow-x-hidden relative z-10">
          <header className="w-full p-6 flex items-center gap-3 border-b border-white/5 bg-black/40 backdrop-blur-md">
            <button 
              onClick={() => {
                audioSynth.playClick();
                setCurrentScreen('mainMenu');
              }}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 hover:border-white/10 text-slate-300 active:translate-x-[-2px] transition-all cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-widest uppercase">CONFIGURATION SETTINGS</h1>
              <p className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">SYSTEM OPTIMIZATION PORTS</p>
            </div>
          </header>

          <main className="flex-1 max-w-xl mx-auto w-full p-6 flex flex-col justify-center gap-6">
            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl space-y-6">
              
              <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest font-mono border-b border-white/5 pb-2">GUIDELINES & KEYBOARD CONTROLS</h3>
              
              <div className="space-y-2.5 text-xs text-slate-400 leading-relaxed font-sans">
                <p>🚦 Use the <strong className="text-white">A, D</strong> or <strong className="text-white">Left / Right Arrows</strong> to steer with high precision drift sliders.</p>
                <p>⚡ Press <strong className="text-white">SPACEBAR / Shift</strong> to engage Nitro boost multipliers.</p>
                <p>💫 Launch over Ramps and trigger stunt flippy cards inside the airborne HUD zone.</p>
                <p>🛡 Avoid Police Patrol units on Snow Mountaineer track to maintain health.</p>
              </div>

              <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest font-mono border-b border-white/5 pb-2 pt-2">FRAMEWORK OPTIMIZATIONS</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold block text-white">Renderer Particle Cap (Limit 50)</span>
                  <span className="text-xs text-slate-400 block">Ensures smooth 60 FPS on mobile browsers</span>
                </div>
                <div className="w-12 h-6 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-end px-1 cursor-not-allowed">
                  <div className="w-4 h-4 rounded-full bg-cyan-400" />
                </div>
              </div>

              {/* Reset memory button */}
              <button 
                onClick={() => {
                  audioSynth.playClick();
                  try {
                    localStorage.clear();
                    window.location.reload();
                  } catch (e) {}
                }}
                className="w-full py-2.5 text-xs font-mono font-bold tracking-wider text-red-400 bg-red-950/20 border border-red-500/30 rounded-lg hover:bg-red-950/45 transition-all text-center"
              >
                ⚠ HARD RESET ALL GARAGE MEMORY &SCORES
              </button>

            </div>
          </main>

          <footer className="p-6 text-center text-xs text-slate-600 font-mono border-t border-white/5">
            STREET NITRO CHIP CONTROL SYSTEM v2.4.0
          </footer>
        </div>
      )}

    </div>
  );
}
