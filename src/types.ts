/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CarStats {
  speed: number;        // Base speed in km/h
  acceleration: number; // Stat out of 100
  handling: number;     // Stat out of 100
}

export type CarClass = 'Supercar' | 'Hypercar' | 'Muscle' | 'Exotic' | 'Tuner';

export interface Car {
  id: string;
  name: string;
  class: CarClass;
  baseMaxSpeed: number; // in km/h
  acceleration: number; // 1-10 scale
  handling: number;     // 1-10 scale
  color: string;        // Hex representation or preset name
  upgradeStars: number; // 0 to 5
  cost: number;         // Credit cost (0 for starter car)
  purchased: boolean;
  isCustomColor?: boolean;
}

export interface Track {
  id: string;
  name: string;
  location: string;
  lengthKm: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  backgroundColors: string[]; // Gradient representation
  skyColor: string;
  roadColor: string;
  stripeColor: string;
  fogColor: string;
  environmentType: 'city' | 'desert' | 'snow';
  ambientTracks?: number;
}

export interface CareerRace {
  id: number;
  title: string;
  trackId: string;
  mode: GameMode;
  objective: string;
  targetCount?: number; // e.g., 3 knockdowns, 500m drift, etc.
  creditsReward: number;
  completed: boolean;
}

export type GameMode = 'Career' | 'TimeTrial' | 'Knockdown' | 'GateDrift' | 'Multiplayer' | 'PoliceChase';

export interface LeaderboardEntry {
  name: string;
  car: string;
  time: string;
  credits: number;
  rank: number;
}
