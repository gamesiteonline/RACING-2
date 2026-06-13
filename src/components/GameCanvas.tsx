/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { audioSynth } from '../audio';
import { Car, Track, GameMode } from '../types';

interface GameCanvasProps {
  activeCar: Car;
  activeTrack: Track;
  gameMode: GameMode;
  isPaused: boolean;
  onRaceFinish: (results: {
    position: number;
    creditsEarned: number;
    driftDistance: number;
    knockdowns: number;
    tokensCollected: number;
    bestTimeMs: number;
  }) => void;
  onExitRace: () => void;
  creditsBalance: number;
}

// Pseudo-3D segment definition
interface RoadSegment {
  index: number;
  p1: { x: number; y: number; z: number; screenX: number; screenY: number; screenW: number };
  p2: { x: number; y: number; z: number; screenX: number; screenY: number; screenW: number };
  curve: number;   // lateral curvature
  hill: number;    // vertical elevation derivative
  color: {
    road: string;
    grass: string;
    rumble: string;
    stripe: string;
  };
  hasRamp: boolean;
  hasToken: boolean;
  tokenX: number;   // -1 to 1 offset from center
  hasGate: boolean; // Gateway Drift targets
  gateColor: string;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface AICar {
  id: string;
  name: string;
  className: string;
  color: string;
  z: number;
  x: number; // offset -1 to 1
  speedKmh: number;
  baseSpeed: number;
  activeNitro: boolean;
  eliminated: boolean;
  width: number;
}

export default function GameCanvas({
  activeCar,
  activeTrack,
  gameMode,
  isPaused,
  onRaceFinish,
  onExitRace,
  creditsBalance,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keyboard, UI State, and Physics Inputs
  const [gameState, setGameState] = useState<'countdown' | 'racing' | 'finished'>('countdown');
  const [countdownNum, setCountdownNum] = useState<number | string>(3);
  const [playerSpeed, setPlayerSpeed] = useState<number>(0);
  const [playerPosition, setPlayerPosition] = useState<number>(6); // 1st to 6th rank
  const [activeNitroLevel, setActiveNitroLevel] = useState<number>(0); // 0 (off), 1 (orange), 2 (blue), 3 (purple)
  const [nitroCapacity, setNitroCapacity] = useState<number>(85); // 0 to 100
  const [stuntMessage, setStuntMessage] = useState<string>('');
  const [showStuntAlert, setShowStuntAlert] = useState<boolean>(false);
  const [driftMeter, setDriftMeter] = useState<number>(0); // active drift indicator
  const [knockdownCount, setKnockdownCount] = useState<number>(0);
  const [tokensCollectedCount, setTokensCollectedCount] = useState<number>(0);
  const [lapProgress, setLapProgress] = useState<string>('0%');
  const [policeChaseHealth, setPoliceChaseHealth] = useState<number>(100);

  // Time records
  const [lapTimeMs, setLapTimeMs] = useState<number>(0);
  const [bestTimeMs, setBestTimeMs] = useState<number>(0);

  // Controls triggers
  const steerLeftRef = useRef(false);
  const steerRightRef = useRef(false);
  const nitroActiveRef = useRef(false);
  const driftActiveRef = useRef(false);

  // 3D Pre-rendered Assets transparent caches
  const playerSpriteRef = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const aiSpriteRef = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const policeSpriteRef = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const coinSpriteRef = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);

  // Preload and chroma-key 3D JPG assets to transparent sprites
  useEffect(() => {
    const makeTransparent = (src: string, ref: React.MutableRefObject<HTMLCanvasElement | HTMLImageElement | null>) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(img, 0, 0);
          try {
            const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
            const data = imgData.data;
            // Traverse pixels to convert dark tones into transparent ones
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              // Chroma key out dark shadow & black backing
              if (r < 25 && g < 25 && b < 25) {
                data[i + 3] = 0;
              } else {
                const brightness = (r + g + b) / 3;
                if (brightness < 60) {
                  // smooth alpha ramp for gradient edges
                  data[i + 3] = Math.max(0, Math.floor((brightness - 25) * (255 / (60 - 25))));
                }
              }
            }
            tempCtx.putImageData(imgData, 0, 0);
            ref.current = tempCanvas;
          } catch (e) {
            ref.current = img; // cross-origin fallback
          }
        } else {
          ref.current = img;
        }
      };
      img.onerror = () => {
        console.warn("Failed to load 3D asset image:", src);
      };
    };

    makeTransparent("/src/assets/images/lambo_rear_1781393590903.jpg", playerSpriteRef);
    makeTransparent("/src/assets/images/ai_racer_rear_1781393605281.jpg", aiSpriteRef);
    makeTransparent("/src/assets/images/police_unit_rear_1781393619705.jpg", policeSpriteRef);
    makeTransparent("/src/assets/images/arcade_coin_1781393634691.jpg", coinSpriteRef);
  }, []);

  // Inside references for continuous rAF loop
  const playerZRef = useRef(0);
  const playerXRef = useRef(0); // lateral offset (-1 to 1)
  const speedRef = useRef(0); // target speed in scale
  const isAirborne = useRef(false);
  const playerYRef = useRef(0); // height from floor
  const jumpVelocityY = useRef(0);
  const airRotation = useRef(0); // stunt spin indicator
  const stuntTriggered = useRef<'spiral' | 'barrel' | 'backflip' | null>(null);
  const currentStuntProgress = useRef(0);

  const particlesRef = useRef<Particle[]>([]);
  const screenShakeRef = useRef(0);
  const distanceCovered = useRef(0);
  const tokensCollected = useRef(0);
  const driftAccumulator = useRef(0);
  const loopStartTime = useRef(Date.now());
  const policeChaseDamageRef = useRef(0);

  // Track settings
  const segmentLength = 200; // how long is each road division in space
  const roadWidth = 2000;    // nominal boundaries
  const totalSegments = useRef(750); // size of track (length in segments)
  const segments = useRef<RoadSegment[]>([]);
  const aiCars = useRef<AICar[]>([]);

  // Sound Synth hooks
  useEffect(() => {
    // Initialise and start audio synth
    audioSynth.startEngine();
    audioSynth.startMusic();
    return () => {
      audioSynth.stopEngine();
      audioSynth.stopMusic();
    };
  }, []);

  // Set keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'racing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') steerLeftRef.current = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') steerRightRef.current = true;
      if (e.key === ' ' || e.key === 'Shift') {
        e.preventDefault();
        triggerNitroToggle();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') steerLeftRef.current = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') steerRightRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, nitroCapacity, activeNitroLevel]);

  // Builds segments based on track theme
  const setupTrack = (track: Track) => {
    const size = track.environmentType === 'city' ? 650 : track.environmentType === 'snow' ? 700 : 800;
    totalSegments.current = size;
    const items: RoadSegment[] = [];

    let currentCurve = 0;
    let currentHill = 0;

    for (let i = 0; i < size; i++) {
      // Dynamic curves generation
      if (i > 80 && i < 150) currentCurve = 2.5; // slow left
      else if (i > 150 && i < 220) currentCurve = -3.5; // sharp right
      else if (i > 280 && i < 340) currentCurve = track.environmentType === 'snow' ? 5.0 : 4.0; // severe curves
      else if (i > 420 && i < 500) currentCurve = -2.0;
      else if (i > 520 && i < 580) currentCurve = 1.5;
      else currentCurve = 0;

      // Dynamic hills generation
      if (i > 50 && i < 110) currentHill = Math.sin((i - 50) / 10) * 12; // wave hills
      else if (i > 250 && i < 320) currentHill = -25; // downhill pass
      else if (i > 380 && i < 440) currentHill = 30;  // uphill climbs
      else currentHill = 0;

      // Distinct road palettes dynamically
      let grass = i % 2 === 0 ? '#1b1c2e' : '#141525';
      let road = '#1f2035';
      let rumble = i % 2 === 0 ? '#ffea00' : '#ff4400';
      let stripe = i % 2 === 0 ? '#00ffff' : '#1f2035';

      if (track.environmentType === 'desert') {
        grass = i % 2 === 0 ? '#c75f1b' : '#b24e12';
        road = '#2c2522';
        rumble = i % 2 === 0 ? '#fff5eb' : '#ff7a22';
        stripe = i % 2 === 0 ? '#ffe3b5' : '#2c2522';
      } else if (track.environmentType === 'snow') {
        grass = i % 2 === 0 ? '#e0f2fe' : '#bae6fd';
        road = '#182435';
        rumble = i % 2 === 0 ? '#0284c7' : '#0369a1';
        stripe = i % 2 === 0 ? '#ffffff' : '#182435';
      }

      // Procedural ramps placement
      const hasRamp = i > 0 && i % (track.environmentType === 'snow' ? 100 : 130) === 0;
      // Stars / Coins token collection
      const hasToken = i % 14 === 0 && !hasRamp;
      const tokenX = Math.sin(i / 1.5) * 0.7;

      // Gate drift zones
      const hasGate = i % 45 === 0 && !hasRamp && !hasToken;

      items.push({
        index: i,
        p1: { x: 0, y: 0, z: i * segmentLength, screenX: 0, screenY: 0, screenW: 0 },
        p2: { x: 0, y: 0, z: (i + 1) * segmentLength, screenX: 0, screenY: 0, screenW: 0 },
        curve: currentCurve,
        hill: currentHill,
        color: { road, grass, rumble, stripe },
        hasRamp,
        hasToken,
        tokenX,
        hasGate,
        gateColor: i % 2 === 0 ? '#06b6d4' : '#a855f7',
      });
    }

    // Set elevation heights on segments
    let accumulatorY = 0;
    for (let i = 0; i < size; i++) {
      items[i].p1.y = accumulatorY;
      accumulatorY += items[i].hill;
      items[i].p2.y = accumulatorY;
    }

    segments.current = items;
  };

  // Generate 6 Competitor AI drivers
  const setupAICars = () => {
    const names = ['K. Raikkonen', 'M. Verstappen', 'L. Hamilton', 'C. Leclerc', 'S. Vettel', 'Police Unit C1'];
    const paintColors = ['#ff003c', '#0099ff', '#8b00ff', '#00ff66', '#ffaa00', '#222222'];
    const classes = ['Supercar', 'Hypercar', 'Muscle', 'Exotic', 'Tuner', 'Police'];

    aiCars.current = names.map((name, index) => {
      const isPolice = gameMode === 'PoliceChase' && index % 2 === 0;
      return {
        id: `ai-${index}`,
        name: isPolice ? `CHASE UNIT #${index + 1}` : name,
        className: isPolice ? 'Police-SUV' : classes[index % classes.length],
        color: isPolice ? '#ffffff' : paintColors[index],
        z: (index + 1) * segmentLength * 2 + 50,
        x: (index % 3) * 0.45 - 0.45,
        speedKmh: 120 + index * 10,
        baseSpeed: 230 + index * 15,
        activeNitro: false,
        eliminated: false,
        width: 1550,
      };
    });
  };

  // 3-seconds count controller
  useEffect(() => {
    setupTrack(activeTrack);
    setupAICars();

    setCountdownNum(3);
    gameStateRef.current = 'countdown';
    setGameState('countdown');

    const countdownTimeline = [
      () => { audioSynth.playBeep(false); setCountdownNum(3); },
      () => { audioSynth.playBeep(false); setCountdownNum(2); },
      () => { audioSynth.playBeep(false); setCountdownNum(1); },
      () => {
        audioSynth.playBeep(true);
        setCountdownNum('NITRO!');
        gameStateRef.current = 'racing';
        setGameState('racing');
        loopStartTime.current = Date.now();
      },
      () => setCountdownNum(''),
    ];

    let t = 0;
    const interval = setInterval(() => {
      if (t < countdownTimeline.length) {
        countdownTimeline[t]();
        t++;
      } else {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTrack, gameMode]);

  // Handle Nitro System Toggling
  const triggerNitroToggle = () => {
    if (nitroCapacity < 25) {
      setActiveNitroLevel(0);
      return;
    }

    if (activeNitroLevel === 0) {
      setActiveNitroLevel(1);
      audioSynth.playNitroBoost(1);
      spawnParticles('#f97316', 20);
    } else if (activeNitroLevel === 1) {
      setActiveNitroLevel(2);
      audioSynth.playNitroBoost(2);
      spawnParticles('#3b82f6', 25);
    } else if (activeNitroLevel === 2) {
      setActiveNitroLevel(3);
      audioSynth.playNitroBoost(3);
      spawnParticles('#a855f7', 35);
    } else {
      setActiveNitroLevel(0);
    }
  };

  // Particle Generation for sparks, speed lines, custom effects
  const spawnParticles = (color: string, count: number, velocityMag: number = 5) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: playerXRef.current * roadWidth + (Math.random() * 30 - 15),
        y: playerYRef.current + (Math.random() * 20 - 10),
        z: playerZRef.current - 120,
        vx: (Math.random() * 2 - 1) * velocityMag,
        vy: (Math.random() * 2 - 1) * velocityMag + 4,
        vz: -speedRef.current * 0.1 - (Math.random() * 8 + 4),
        color,
        size: Math.random() * 5 + 3,
        life: 0,
        maxLife: Math.random() * 25 + 15,
      });
    }
  };

  const executeAirStunt = (type: 'spiral' | 'barrel' | 'backflip') => {
    if (!isAirborne.current || stuntTriggered.current) return;

    stuntTriggered.current = type;
    currentStuntProgress.current = 0;
    audioSynth.playStuntDing();

    let bonus = 100;
    let label = '360° SPIRAL!';
    if (type === 'barrel') {
      bonus = 150;
      label = 'BARREL FLIP!';
    } else if (type === 'backflip') {
      bonus = 200;
      label = 'BACKFLIP stunt!';
    }

    setStuntMessage(`+${bonus} CREDITS: ${label}`);
    setShowStuntAlert(true);
    setTimeout(() => {
      setShowStuntAlert(false);
    }, 2000);

    // Give real credits reward instantly
    setDriftMeter((prev) => prev + bonus);
  };

  // State reference tracking for Animation Frame Loops
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Dynamic 3D perspective Canvas projection mathematics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // 1. Resize Canvas appropriately
      if (canvas.width !== canvas.parentElement?.clientWidth || canvas.height !== canvas.parentElement?.clientHeight) {
        canvas.width = canvas.parentElement?.clientWidth || 800;
        canvas.height = canvas.parentElement?.clientHeight || 500;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isPaused) {
        animId = requestAnimationFrame(render);
        return;
      }

      const screenWidth = canvas.width;
      const screenHeight = canvas.height;

      // Draw Parallax Sky Background and mountains based on current track environment
      drawBackground(ctx, screenWidth, screenHeight);

      // --- GAME LAWS PHYSICS SEGMENT ---
      if (gameStateRef.current === 'racing') {
        updatePhysicsAndLogic();
      }

      // --- CAMERA PROJECTIONS ---
      const cameraDepth = 0.85; // Perspective parameter
      const cameraHeight = 1250;
      const maxViewSegs = 180;

      // Find current starting track segment
      const currentSegmentIndex = Math.floor(playerZRef.current / segmentLength) % totalSegments.current;
      const startSegment = segments.current[currentSegmentIndex];
      if (!startSegment) {
        animId = requestAnimationFrame(render);
        return;
      }

      let elevationOfSegment = startSegment.p1.y;
      let dx = - (startSegment.curve * (playerZRef.current % segmentLength) / segmentLength);
      let cumulativeCurve = 0;

      let drawQueue: {
        index: number;
        p1: any;
        p2: any;
        color: any;
        segment: RoadSegment;
      }[] = [];

      for (let n = 0; n < maxViewSegs; n++) {
        const idx = (currentSegmentIndex + n) % totalSegments.current;
        const segment = segments.current[idx];
        if (!segment) continue;

        // Loop dynamic wraps
        const segmentZOffset = (idx < currentSegmentIndex) ? (totalSegments.current * segmentLength) : 0;

        // Translate points mathematically to camera space coordinates
        const relativeZ1 = segment.p1.z + segmentZOffset - playerZRef.current;
        const relativeZ2 = segment.p2.z + segmentZOffset - playerZRef.current;

        if (relativeZ1 <= 0) continue;

        // Curve shift computation
        segment.p1.screenX = 0;
        segment.p1.screenY = 0;

        // Project Point 1
        const scale1 = cameraDepth / (relativeZ1 / 1000);
        const relativeX1 = (playerXRef.current * roadWidth) + cumulativeCurve;
        const screenX1 = (screenWidth / 2) + ((segment.p1.x - relativeX1) * scale1 * (screenWidth / roadWidth));
        const screenY1 = (screenHeight / 2) - (((cameraHeight + playerYRef.current) - (segment.p1.y - elevationOfSegment)) * scale1 * (screenHeight / cameraHeight));
        const roadW1 = scale1 * screenWidth;

        // Project Point 2
        cumulativeCurve += dx;
        dx += segment.curve;

        const scale2 = cameraDepth / (relativeZ2 / 1000);
        const relativeX2 = (playerXRef.current * roadWidth) + cumulativeCurve;
        const screenX2 = (screenWidth / 2) + ((segment.p2.x - relativeX2) * scale2 * (screenWidth / roadWidth));
        const screenY2 = (screenHeight / 2) - (((cameraHeight + playerYRef.current) - (segment.p2.y - elevationOfSegment)) * scale2 * (screenHeight / cameraHeight));
        const roadW2 = scale2 * screenWidth;

        segment.p1.screenX = screenX1;
        segment.p1.screenY = screenY1;
        segment.p1.screenW = roadW1;

        segment.p2.screenX = screenX2;
        segment.p2.screenY = screenY2;
        segment.p2.screenW = roadW2;

        drawQueue.push({
          index: n,
          p1: { screenX: screenX1, screenY: screenY1, screenW: roadW1 },
          p2: { screenX: screenX2, screenY: screenY2, screenW: roadW2 },
          color: segment.color,
          segment,
        });
      }

      // Render the segments back-to-front
      for (let i = drawQueue.length - 1; i >= 0; i--) {
        const item = drawQueue[i];
        const p1 = item.p1;
        const p2 = item.p2;

        // Grass/Horizon Ground
        ctx.fillStyle = item.color.grass;
        ctx.beginPath();
        ctx.moveTo(0, p2.screenY);
        ctx.lineTo(screenWidth, p2.screenY);
        ctx.lineTo(screenWidth, p1.screenY);
        ctx.lineTo(0, p1.screenY);
        ctx.fill();

        // High contrast rumble strips on sides
        const rumbleWidth1 = p1.screenW * 0.12;
        const rumbleWidth2 = p2.screenW * 0.12;

        ctx.fillStyle = item.color.rumble;
        // Left rumble
        ctx.beginPath();
        ctx.moveTo(p1.screenX - p1.screenW * 0.5 - rumbleWidth1, p1.screenY);
        ctx.lineTo(p1.screenX - p1.screenW * 0.5, p1.screenY);
        ctx.lineTo(p2.screenX - p2.screenW * 0.5, p2.screenY);
        ctx.lineTo(p2.screenX - p2.screenW * 0.5 - rumbleWidth2, p2.screenY);
        ctx.fill();
        // Right rumble
        ctx.beginPath();
        ctx.moveTo(p1.screenX + p1.screenW * 0.5, p1.screenY);
        ctx.lineTo(p1.screenX + p1.screenW * 0.5 + rumbleWidth1, p1.screenY);
        ctx.lineTo(p2.screenX + p2.screenW * 0.5 + rumbleWidth2, p2.screenY);
        ctx.lineTo(p2.screenX + p2.screenW * 0.5, p2.screenY);
        ctx.fill();

        // Main Roadway lane
        ctx.fillStyle = item.color.road;
        ctx.beginPath();
        ctx.moveTo(p1.screenX - p1.screenW * 0.5, p1.screenY);
        ctx.lineTo(p1.screenX + p1.screenW * 0.5, p1.screenY);
        ctx.lineTo(p2.screenX + p2.screenW * 0.5, p2.screenY);
        ctx.lineTo(p2.screenX - p2.screenW * 0.5, p2.screenY);
        ctx.fill();

        // Tech stripe lines
        ctx.fillStyle = item.color.stripe;
        ctx.beginPath();
        ctx.moveTo(p1.screenX - 10, p1.screenY);
        ctx.lineTo(p1.screenX + 10, p1.screenY);
        ctx.lineTo(p2.screenX + 10, p2.screenY);
        ctx.lineTo(p2.screenX - 10, p2.screenY);
        ctx.fill();

        // --- DRAW INTERMEDIATE SCENERY: Ramps, Neon Gates and Tokens ---
        const segment = item.segment;
        const distanceToItem = segment.p1.z - playerZRef.current;

        // Draw Ramps for Air Stunts
        if (segment.hasRamp) {
          ctx.fillStyle = '#f97316';
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 3;

          const rx1 = p1.screenX - p1.screenW * 0.2;
          const rx2 = p1.screenX + p1.screenW * 0.2;
          const ry1 = p1.screenY;

          const rx3 = p2.screenX - p2.screenW * 0.18;
          const rx4 = p2.screenX + p2.screenW * 0.18;
          const ry2 = p2.screenY - p2.screenW * 0.22; // Lifted ramp perspective

          ctx.beginPath();
          ctx.moveTo(rx1, ry1);
          ctx.lineTo(rx2, ry1);
          ctx.lineTo(rx4, ry2);
          ctx.lineTo(rx3, ry2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Draw neon glowing arrows on the ramp surface
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(p1.screenX - p1.screenW * 0.05, ry1 - 10);
          ctx.lineTo(p1.screenX, ry1 - p2.screenW * 0.15);
          ctx.lineTo(p1.screenX + p1.screenW * 0.05, ry1 - 10);
          ctx.stroke();
        }

        // Draw Stars/Tokens to Collect
        if (segment.hasToken) {
          const tScale = p1.screenW * 0.045;
          const tokenXScreen = p1.screenX + (segment.tokenX * p1.screenW * 0.5);
          const tokenYScreen = p1.screenY - tScale * 1.5;

          if (coinSpriteRef.current) {
            ctx.save();
            ctx.translate(tokenXScreen, tokenYScreen);
            
            // 3D-feeling spin rotation by scaling depth
            const rotationScaleX = Math.sin(Date.now() / 150);
            ctx.scale(rotationScaleX, 1.0);
            
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 12;
            ctx.drawImage(coinSpriteRef.current, -tScale, -tScale, tScale * 2, tScale * 2);
            ctx.restore();
          } else {
            // Draw a spinning gold coin star fallback
            const angle = (Date.now() / 200) % (Math.PI * 2);
            ctx.save();
            ctx.translate(tokenXScreen, tokenYScreen);
            ctx.rotate(angle);
            ctx.fillStyle = '#facc15';
            ctx.shadowColor = '#eab308';
            ctx.shadowBlur = 15;

            ctx.beginPath();
            for (let s = 0; s < 5; s++) {
              ctx.lineTo(Math.cos((s * 2 * Math.PI) / 5) * tScale, Math.sin((s * 2 * Math.PI) / 5) * tScale);
              ctx.lineTo(
                Math.cos(((s * 2 + 1) * Math.PI) / 5) * (tScale * 0.4),
                Math.sin(((s * 2 + 1) * Math.PI) / 5) * (tScale * 0.4)
              );
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }

        // Draw Glowing Gate Drifts
        if (segment.hasGate) {
          const gw = p1.screenW * 1.3;
          const gh = p1.screenH || gw * 0.45;
          const gx = p1.screenX;
          const gy = p1.screenY;

          ctx.strokeStyle = segment.gateColor;
          ctx.lineWidth = Math.max(3, p1.screenW * 0.02);
          ctx.shadowColor = segment.gateColor;
          ctx.shadowBlur = 20;

          // Drawing Arch
          ctx.beginPath();
          ctx.ellipse(gx, gy, gw * 0.5, gh, 0, Math.PI, Math.PI * 2);
          ctx.stroke();

          // Gate neon panel text description
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(10, p1.screenW * 0.04)}px "Space Grotesk", sans-serif`;
          ctx.textAlign = 'center';
          ctx.shadowBlur = 0;
          ctx.fillText('DRIFT ZONE', gx, gy - gh - 10);
        }
      }

      // --- RENDERING AI CARS SPRITES ---
      aiCars.current.forEach((ai) => {
        const relativeZ = ai.z - playerZRef.current;
        if (relativeZ > 0 && relativeZ < maxViewSegs * segmentLength) {
          const indexOffset = Math.floor(ai.z / segmentLength) % totalSegments.current;
          const segModel = segments.current[indexOffset];
          if (segModel) {
            const scale = cameraDepth / (relativeZ / 1000);
            const relativeX = (playerXRef.current * roadWidth);
            const ax = (screenWidth / 2) + (((ai.x * roadWidth) - relativeX) * scale * (screenWidth / roadWidth));
            const ay = (screenHeight / 2) - (((cameraHeight + playerYRef.current) - (segModel.p1.y - elevationOfSegment)) * scale * (screenHeight / cameraHeight));

            drawAICarSprite(ctx, ax, ay, scale * screenWidth * 0.09, ai);
          }
        }
      });

      // --- STUNTING PLAYER CAR CAR ENGINE RENDERER ---
      drawPlayerCar(ctx, screenWidth, screenHeight);

      // --- RENDER CURRENT ACTIVE PARTICLE BLURS ---
      drawParticles(ctx, screenWidth, screenHeight, cameraDepth, cameraHeight, elevationOfSegment);

      // Dynamic cinematic camera shaking feedback
      if (screenShakeRef.current > 0) {
        ctx.save();
        const dx = (Math.random() - 0.5) * screenShakeRef.current * 10;
        const dy = (Math.random() - 0.5) * screenShakeRef.current * 10;
        ctx.translate(dx, dy);
        screenShakeRef.current -= 0.1;
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [gameState, activeTrack, gameMode, isPaused]);

  // Physics engine logic updates loops
  const updatePhysicsAndLogic = () => {
    // 1. Speeds modifiers based on NITRO triggers
    let targetTopSpeed = activeCar.baseMaxSpeed + (activeCar.upgradeStars * 10);
    let accelRate = 1.2 + (activeCar.acceleration * 0.15) + (activeCar.upgradeStars * 0.3);

    if (activeNitroLevel === 1) {
      targetTopSpeed += 30;
      accelRate *= 2.0;
      setNitroCapacity((n) => Math.max(0, n - 0.28));
    } else if (activeNitroLevel === 2) {
      targetTopSpeed += 55;
      accelRate *= 3.2;
      setNitroCapacity((n) => Math.max(0, n - 0.45));
    } else if (activeNitroLevel === 3) {
      targetTopSpeed += 80;
      accelRate *= 4.5;
      setNitroCapacity((n) => Math.max(0, n - 0.65));
    }

    if (activeNitroLevel > 0 && nitroCapacity <= 0) {
      setActiveNitroLevel(0);
    }

    // Drags on terrain bounds
    const isOffroad = Math.abs(playerXRef.current) > 0.85;
    if (isOffroad) {
      targetTopSpeed = Math.min(targetTopSpeed, 110); // slow down heavily
    }

    // Slippery Mountain roads modifier
    if (activeTrack.environmentType === 'snow' && isOffroad) {
      targetTopSpeed = Math.min(targetTopSpeed, 80);
    }

    // Core speed update controls
    if (speedRef.current < targetTopSpeed) {
      speedRef.current += accelRate;
    } else if (speedRef.current > targetTopSpeed) {
      speedRef.current -= 2.0;
    }

    // Steer mapping
    let sideSteer = 0.015 + (activeCar.handling * 0.001) + (activeCar.upgradeStars * 0.002);
    if (isAirborne.current) {
      sideSteer *= 0.3; // low steer in air
    }

    // Drift physics
    let isCurrentlyDrifting = false;
    if ((steerLeftRef.current || steerRightRef.current) && speedRef.current > 150) {
      // If drifting is activated by quick turn or high side G-forces
      if (activeTrack.environmentType === 'snow' || isOffroad) {
        isCurrentlyDrifting = true;
      } else {
        isCurrentlyDrifting = true;
      }
    }

    if (isCurrentlyDrifting) {
      driftAccumulator.current += speedRef.current / 400;
      setDriftMeter(Math.floor(driftAccumulator.current));
      if (Math.random() < 0.35) {
        audioSynth.playDriftSqueal();
      }
      // Generate sparks particles
      spawnParticles(activeNitroLevel > 0 ? '#3b82f6' : '#9ca3af', 4, 3);
    }

    // Handle direction steers
    if (steerLeftRef.current) {
      playerXRef.current -= sideSteer * (isCurrentlyDrifting ? 1.4 : 1.0);
      airRotation.current -= 0.1;
    }
    if (steerRightRef.current) {
      playerXRef.current += sideSteer * (isCurrentlyDrifting ? 1.4 : 1.0);
      airRotation.current += 0.1;
    }

    // Constrain player drift bounds
    if (playerXRef.current < -1.5) playerXRef.current = -1.5;
    if (playerXRef.current > 1.5) playerXRef.current = 1.5;

    // Apply speed distance
    playerZRef.current += speedRef.current * 0.22;
    distanceCovered.current = playerZRef.current;

    setPlayerSpeed(Math.floor(speedRef.current));

    // Handle timer
    const diff = Date.now() - loopStartTime.current;
    setLapTimeMs(diff);

    // Track total percentage finish bounds
    const goalZ = totalSegments.current * segmentLength;
    const progressPerc = Math.min(100, Math.floor((playerZRef.current / goalZ) * 100));
    setLapProgress(`${progressPerc}%`);

    if (playerZRef.current >= goalZ) {
      handleFinishedRace();
    }

    // Airborne physics
    const currentSegIdx = Math.floor(playerZRef.current / segmentLength) % totalSegments.current;
    const currentSeg = segments.current[currentSegIdx];

    if (currentSeg && currentSeg.hasRamp && !isAirborne.current) {
      isAirborne.current = true;
      jumpVelocityY.current = speedRef.current * 0.28; // Air speed jump factors
      audioSynth.playNitroBoost(3); // extra pop rocket sound
    }

    if (isAirborne.current) {
      playerYRef.current += jumpVelocityY.current;
      jumpVelocityY.current -= 12; // simulated gravity

      // Handle custom active stunt animation progresses
      if (stuntTriggered.current) {
        currentStuntProgress.current += 0.08;
        if (currentStuntProgress.current >= 1.0) {
          stuntTriggered.current = null;
          currentStuntProgress.current = 0;
        }
      }

      if (playerYRef.current <= 0) {
        playerYRef.current = 0;
        isAirborne.current = false;
        jumpVelocityY.current = 0;
        audioSynth.playCrash(false); // impact landed thump
        screenShakeRef.current = 2.5;
      }
    }

    // Tokens harvesting updates
    if (currentSeg && currentSeg.hasToken) {
      const pX = playerXRef.current;
      if (Math.abs(pX - currentSeg.tokenX) < 0.28 && playerYRef.current < 250) {
        currentSeg.hasToken = false;
        tokensCollected.current += 1;
        setTokensCollectedCount(tokensCollected.current);
        audioSynth.playStuntDing();
        // Give bonus nitro capacity
        setNitroCapacity((n) => Math.min(100, n + 15));
      }
    }

    // Gate drift zones matching score multipliers
    if (currentSeg && currentSeg.hasGate) {
      if (playerYRef.current < 450) {
        currentSeg.hasGate = false;
        // score multiplier ding!
        audioSynth.playUpgradeDing();
        setDriftMeter((prev) => prev + 500);
      }
    }

    // Dynamic Police Chase patrol attackers
    if (gameMode === 'PoliceChase') {
      policeChaseDamageRef.current += 0.02;
      setPoliceChaseHealth(Math.max(0, Math.floor(100 - policeChaseDamageRef.current)));

      if (policeChaseDamageRef.current >= 100) {
        handleFinishedRace(true); // Wrecked / Busted down termination
      }
    }

    // Update AI Opponent Positions
    updateAICarsPhysics(currentSegIdx);

    // Update Particle life sizes
    particlesRef.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.life++;
    });
    particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);
  };

  const updateAICarsPhysics = (playerSegIdx: number) => {
    let playerRank = 6;

    aiCars.current.forEach((ai, index) => {
      if (ai.eliminated) return;

      // Base moves
      ai.z += ai.speedKmh * 0.22;

      // Make AI adjust speed strategically
      if (ai.activeNitro) {
        ai.speedKmh = ai.baseSpeed + 45;
        if (Math.random() < 0.05) {
          ai.activeNitro = false;
        }
      } else {
        ai.speedKmh = ai.baseSpeed;
        if (Math.random() < 0.02) {
          ai.activeNitro = true;
          audioSynth.playNitroBoost(1);
        }
      }

      // Keep them within track length bounds
      const goalZ = totalSegments.current * segmentLength;
      if (ai.z >= goalZ) {
        ai.z = goalZ - 200; // Cap
      }

      // Handle simple lane curves adjustments
      const aiSegIdx = Math.floor(ai.z / segmentLength) % totalSegments.current;
      const aiSeg = segments.current[aiSegIdx];
      if (aiSeg) {
        // adjust lateral offset on curves
        ai.x -= aiSeg.curve * 0.015;
        if (ai.x < -0.85) ai.x = -0.8;
        if (ai.x > 0.85) ai.x = 0.8;
      }

      // Collisions check with player
      const dist = Math.abs(ai.z - playerZRef.current);
      if (dist < 150) {
        const xDist = Math.abs(ai.x - playerXRef.current);
        if (xDist < 0.25) {
          // Check if player has active NITRO (Level 1,2, or 3) -> KNOCKDOWN!
          if (activeNitroLevel > 0) {
            ai.eliminated = true;
            ai.z -= 1000; // Knock AI backwards
            setKnockdownCount((k) => k + 1);
            audioSynth.playCrash(true); // Huge metal boom sound
            screenShakeRef.current = 6.0;
            spawnParticles('#ef4444', 40, 15);
          } else {
            // Standard bump collision bounce
            playerXRef.current += (playerXRef.current > ai.x ? 0.25 : -0.25);
            speedRef.current = Math.max(120, speedRef.current - 50);
            audioSynth.playCrash(false);
            screenShakeRef.current = 3.0;
            spawnParticles('#9ca3af', 15);
          }
        }
      }

      // Compute ranking
      if (playerZRef.current > ai.z) {
        playerRank = Math.max(1, playerRank - 1);
      }
    });

    setPlayerPosition(playerRank);
  };

  const handleFinishedRace = (wrecked: boolean = false) => {
    gameStateRef.current = 'finished';
    setGameState('finished');
    audioSynth.stopEngine();

    // Reward calculations based on rankings and collector metrics
    const rankBonus = playerPosition === 1 ? 5000 : playerPosition === 2 ? 3000 : playerPosition === 3 ? 1500 : 500;
    const itemsValue = tokensCollected.current * 100;
    const driftsValue = Math.floor(driftAccumulator.current * 0.5);
    const knockdownsValue = knockdownCount * 300;

    let totalCredits = rankBonus + itemsValue + driftsValue + knockdownsValue;
    if (wrecked) {
      totalCredits = 200; // participation fee if busted/wrecked
    }

    onRaceFinish({
      position: wrecked ? 7 : playerPosition,
      creditsEarned: totalCredits,
      driftDistance: Math.floor(driftAccumulator.current),
      knockdowns: knockdownCount,
      tokensCollected: tokensCollected.current,
      bestTimeMs: lapTimeMs,
    });
  };

  // --- DRAWING GRAPHICAL SPRITES ---

  const drawBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const pShift = (playerZRef.current / 40) % w;

    // Sky colors based on track settings
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, activeTrack.skyColor);
    grad.addColorStop(0.5, activeTrack.fogColor);
    grad.addColorStop(1, '#0c0d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Draw parallax elements (stars, glowing grids or sun mountain outlines)
    if (activeTrack.environmentType === 'city') {
      // Neon tall futuristic skyscraper boxes
      ctx.fillStyle = 'rgba(20, 24, 45, 0.75)';
      for (let j = 0; j < 5; j++) {
        const xOffset = ((j * 320) - pShift) % (w + 320);
        ctx.fillRect(xOffset, h * 0.15, 180, h * 0.35);

        // draw tiny windows glow
        ctx.fillStyle = '#06b6d4';
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 3; c++) {
            if ((r + c) % 2 === 0) {
              ctx.fillRect(xOffset + 25 + c * 40, h * 0.18 + r * 30, 20, 15);
            }
          }
        }
        ctx.fillStyle = 'rgba(20, 24, 45, 0.75)';
      }
    } else if (activeTrack.environmentType === 'desert') {
      // Sunset plateau mountains
      ctx.fillStyle = '#b24e12';
      ctx.beginPath();
      for (let j = 0; j < 4; j++) {
        const xOffset = ((j * 400) - pShift) % (w + 400);
        ctx.lineTo(xOffset, h * 0.5);
        ctx.lineTo(xOffset + 150, h * 0.35);
        ctx.lineTo(xOffset + 300, h * 0.5);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      // Snow mountains spikes
      ctx.fillStyle = '#bae6fd';
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const xOffset = ((j * 350) - pShift) % (w + 350);
        ctx.lineTo(xOffset, h * 0.5);
        ctx.lineTo(xOffset + 120, h * 0.25);
        ctx.lineTo(xOffset + 240, h * 0.5);
      }
      ctx.closePath();
      ctx.fill();
    }
  };

  const drawPlayerCar = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const carWidth = 320;
    const carHeight = 150;
    // Position car lower third, with offset responsive steering curves
    const cx = w * 0.5 + (steerLeftRef.current ? -12 : steerRightRef.current ? 12 : 0);
    const cy = h * 0.88 - playerYRef.current * 0.6;

    ctx.save();
    // Apply mid-air extreme tricks tilt rotations
    if (stuntTriggered.current) {
      const prog = currentStuntProgress.current;
      const rotationAngle = prog * Math.PI * 2;
      ctx.translate(cx, cy);
      ctx.rotate(stuntTriggered.current === 'spiral' ? rotationAngle : -rotationAngle);
      ctx.translate(-cx, -cy);
    }

    // Car shadow
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + carHeight * 0.38, carWidth * 0.45, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    if (playerSpriteRef.current) {
      ctx.save();
      ctx.translate(cx, cy);
      
      // Dynamic steering visual lean/tilt
      let tilt = 0;
      if (steerLeftRef.current) tilt = -0.04;
      if (steerRightRef.current) tilt = 0.04;
      ctx.rotate(tilt);

      // Draw high-fidelity pre-rendered grayscale 3D chassis
      ctx.drawImage(
        playerSpriteRef.current,
        -carWidth * 0.5,
        -carHeight * 0.55,
        carWidth,
        carHeight * 1.1
      );

      // Apply dynamic custom paint tinting using source-atop
      if (activeCar.color && activeCar.color !== '#ffffff') {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = activeCar.color;
        ctx.globalAlpha = 0.32; // preserves metallic shading layers, decals, specular highlights!
        ctx.fillRect(-carWidth * 0.5, -carHeight * 0.55, carWidth, carHeight * 1.1);
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.restore();
    } else {
      // Custom Car Paint tinting from picker fallback
      ctx.fillStyle = activeCar.color;
      ctx.shadowColor = activeCar.color;

      // Draw body chassis panel shapes
      ctx.beginPath();
      ctx.moveTo(cx - carWidth * 0.5, cy + carHeight * 0.2);
      ctx.lineTo(cx - carWidth * 0.45, cy - carHeight * 0.1);
      ctx.lineTo(cx - carWidth * 0.25, cy - carHeight * 0.4);
      ctx.lineTo(cx + carWidth * 0.25, cy - carHeight * 0.4);
      ctx.lineTo(cx + carWidth * 0.45, cy - carHeight * 0.1);
      ctx.lineTo(cx + carWidth * 0.5, cy + carHeight * 0.2);
      ctx.closePath();
      ctx.fill();

      // Cyber cockpit screen
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(cx - carWidth * 0.2, cy - carHeight * 0.2);
      ctx.lineTo(cx - carWidth * 0.15, cy - carHeight * 0.35);
      ctx.lineTo(cx + carWidth * 0.15, cy - carHeight * 0.35);
      ctx.lineTo(cx + carWidth * 0.2, cy - carHeight * 0.2);
      ctx.closePath();
      ctx.fill();

      // Red cyber rear brake panels
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - carWidth * 0.45, cy - carHeight * 0.05, 45, 20);
      ctx.fillRect(cx + carWidth * 0.35, cy - carHeight * 0.05, 45, 20);
    }

    // Always draw dynamic dual exhaust nitro flames! Overlay perfectly aligned
    if (activeNitroLevel > 0) {
      const fWidth = activeNitroLevel === 3 ? 90 : activeNitroLevel === 2 ? 65 : 40;
      const fColor = activeNitroLevel === 3 ? '#c084fc' : activeNitroLevel === 2 ? '#60a5fa' : '#fb923c';

      ctx.save();
      ctx.fillStyle = fColor;
      ctx.shadowColor = fColor;
      ctx.shadowBlur = 30;

      // Exhaust 1
      ctx.beginPath();
      ctx.moveTo(cx - carWidth * 0.3, cy + carHeight * 0.1);
      ctx.lineTo(cx - carWidth * 0.35, cy + carHeight * 0.1);
      ctx.lineTo(cx - carWidth * 0.32, cy + carHeight * 0.1 + fWidth);
      ctx.closePath();
      ctx.fill();

      // Exhaust 2
      ctx.beginPath();
      ctx.moveTo(cx + carWidth * 0.25, cy + carHeight * 0.1);
      ctx.lineTo(cx + carWidth * 0.3, cy + carHeight * 0.1);
      ctx.lineTo(cx + carWidth * 0.27, cy + carHeight * 0.1 + fWidth);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // Spoiler wings - only draw fallback spoiler if we aren't using the advanced 3D sprite which already has a high-res integrated carbon spoiler!
    if (!playerSpriteRef.current) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - carWidth * 0.48, cy - carHeight * 0.32, carWidth * 0.96, 15);
      // struts
      ctx.fillRect(cx - carWidth * 0.35, cy - carHeight * 0.3, 15, carHeight * 0.25);
      ctx.fillRect(cx + carWidth * 0.3, cy - carHeight * 0.3, 15, carHeight * 0.25);
    }

    // Speed lines trails behind car edges
    if (speedRef.current > 200) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - carWidth * 0.4, cy);
      ctx.lineTo(cx - carWidth * 0.4, cy + 200);
      ctx.moveTo(cx + carWidth * 0.4, cy);
      ctx.lineTo(cx + carWidth * 0.4, cy + 200);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawAICarSprite = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ai: AICar) => {
    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x - size * 0.5, y + size * 0.2, size, size * 0.2);

    // Check if tactical Police Unit vs Standard competitor Racer
    const isPolice = ai.name.includes('Police') || ai.name.includes('CHASE') || ai.className === 'Police-SUV';
    const sprite = isPolice ? policeSpriteRef.current : aiSpriteRef.current;

    if (sprite) {
      ctx.save();
      // Draw 3D pre-rendered model
      ctx.drawImage(
        sprite,
        x - size * 0.65,
        y - size * 0.65,
        size * 1.3,
        size * 1.3
      );

      // Color tint non-police racers to match their competitor paint designations!
      if (!isPolice && ai.color && ai.color !== '#ffffff') {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = ai.color;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x - size * 0.65, y - size * 0.65, size * 1.3, size * 1.3);
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
    } else {
      // Fallback
      ctx.fillStyle = ai.color;
      ctx.fillRect(x - size * 0.5, y - size * 0.2, size, size * 0.4);

      // Windshield
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - size * 0.3, y - size * 0.35, size * 0.6, size * 0.15);

      // Spoiler
      ctx.fillStyle = '#000000';
      ctx.fillRect(x - size * 0.55, y - size * 0.45, size * 1.1, size * 0.08);

      // Red taillights
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x - size * 0.48, y - size * 0.15, size * 0.15, size * 0.08);
      ctx.fillRect(x + size * 0.33, y - size * 0.15, size * 0.15, size * 0.08);
    }

    // Name and class tag overhead
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 10px "JetBrains Mono", Courier, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(ai.name, x, y - size * 0.7);

    ctx.restore();
  };

  const drawParticles = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    depth: number,
    camH: number,
    elevation: number
  ) => {
    ctx.save();
    particlesRef.current.forEach((p) => {
      const relZ = p.z - playerZRef.current;
      if (relZ <= 0) return;

      const scale = depth / (relZ / 1000);
      const pxScreen = (w / 2) + ((p.x - (playerXRef.current * roadWidth)) * scale * (w / roadWidth));
      const pyScreen = (h / 2) - (((camH + playerYRef.current) - (p.y - elevation)) * scale * (h / camH));

      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(pxScreen, pyScreen, Math.max(1, p.size * scale), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  };

  return (
    <div className="relative w-full h-full bg-[#08090f] overflow-hidden select-none flex flex-col items-center justify-center">
      
      {/* 3D Canvas element overlay */}
      <div className="w-full h-full relative" id="game-stage">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      </div>

      {/* Countdown overlay banner */}
      {countdownNum !== '' && (
        <div 
          id="countdown"
          className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-sm z-30 transition-all"
        >
          <div className="text-center animate-pulse scale-up">
            <h1 className="text-7xl md:text-9xl font-extrabold tracking-widest text-[#06b6d4] drop-shadow-[0_0_25px_rgba(6,182,212,0.8)] font-sans">
              {countdownNum}
            </h1>
            <p className="text-sm md:text-md text-[#a855f7] tracking-wider uppercase font-mono mt-4">
              Rev your engines &prepare boost!
            </p>
          </div>
        </div>
      )}

      {/* HUD OVERLAYS */}
      <div className="absolute inset-x-0 top-0 p-4 md:p-6 flex justify-between items-start pointer-events-none z-10">
        
        {/* Top Left: Rankings Indicators */}
        <div className="flex flex-col gap-1 items-start bg-black/50 border border-cyan-500/30 p-3 rounded-lg backdrop-blur-md">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl md:text-5xl font-extrabold text-cyan-400 font-sans tracking-tighter">
              {playerPosition}
            </span>
            <span className="text-xs uppercase font-mono text-cyan-500">
              {playerPosition === 1 ? 'st' : playerPosition === 2 ? 'nd' : playerPosition === 3 ? 'rd' : 'th'} / 6
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">POSITION</p>
        </div>

        {/* Top Center: Objective Target */}
        <div className="hidden md:flex flex-col items-center bg-black/75 border border-purple-500/30 px-6 py-2 rounded-full backdrop-blur-md">
          <p className="text-xs font-mono text-[#a855f7] tracking-widest uppercase">MISSION GOAL</p>
          <p className="text-sm font-sans font-bold text-white tracking-wide uppercase">
            {gameMode === 'PoliceChase' ? 'EVADE THE TARGET COPS SURVIVORS' : activeTrack.name}
          </p>
        </div>

        {/* Top Right: Lap Progress & Timing metrics */}
        <div className="flex flex-col gap-1 items-end bg-black/50 border border-cyan-500/30 p-3 rounded-lg backdrop-blur-md">
          <div className="text-right">
            <p className="text-md md:text-xl font-mono text-cyan-400 tracking-wider">
              {Math.floor(lapTimeMs / 60000)}:
              {Math.floor((lapTimeMs % 60000) / 1000).toString().padStart(2, '0')}.
              {Math.floor((lapTimeMs % 1000) / 10).toString().padStart(2, '0')}
            </p>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">LAP TIMER</p>
          </div>
          {gameMode === 'PoliceChase' && (
            <div className="w-24 bg-slate-800 h-2.5 rounded-full overflow-hidden border border-red-500/30 mt-1">
              <div 
                className="bg-gradient-to-r from-red-600 to-red-400 h-full transition-all duration-100"
                style={{ width: `${policeChaseHealth}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* AIR STUNTS HOVER PROMPTERS BUTTONS BAR (appears ONLY when Airborne) */}
      {isAirborne.current && (
        <div id="stunts-box" className="absolute bottom-1/3 inset-x-0 mx-auto flex flex-col items-center gap-3 bg-black/40 p-4 border border-cyan-500/20 rounded-xl max-w-sm backdrop-blur-lg animate-bounce z-20">
          <p className="text-xs text-[#06b6d4] font-mono tracking-widest uppercase animate-pulse">
            ★ DETECTED AIRTIME: PERFORM TRICK!
          </p>
          <div className="flex justify-center gap-2 w-full">
            <button 
              onClick={() => executeAirStunt('spiral')}
              className="flex-1 py-2 text-xs font-sans font-black tracking-wider text-black bg-[#ffea00] border-b-4 border-[#c2aa00] rounded-lg active:translate-y-1 hover:animate-pulse transition-all px-2"
            >
              1. SPIRAL
            </button>
            <button 
              onClick={() => executeAirStunt('barrel')}
              className="flex-1 py-2 text-xs font-sans font-black tracking-wider text-white bg-[#06b6d4] border-b-4 border-cyan-700 rounded-lg active:translate-y-1 hover:animate-pulse transition-all px-2"
            >
              2. BARREL
            </button>
            <button 
              onClick={() => executeAirStunt('backflip')}
              className="flex-1 py-2 text-xs font-sans font-black tracking-wider text-white bg-[#a855f7] border-b-4 border-purple-800 rounded-lg active:translate-y-1 hover:animate-pulse transition-all px-2"
            >
              3. FLIP
            </button>
          </div>
        </div>
      )}

      {/* Stunt success notifications modal */}
      {showStuntAlert && (
        <div className="absolute top-1/4 max-w-sm bg-black/80 ring-2 ring-yellow-400 p-4 rounded-xl text-center animated-notification z-40 shadow-2xl">
          <p className="text-xl font-sans font-black text-[#ffea00] uppercase tracking-widest leading-none drop-shadow-[0_0_10px_rgba(254,240,138,0.7)]">
            STUNT SUCCESS!
          </p>
          <p className="text-xs font-mono text-white mt-1 uppercase tracking-widest">
            {stuntMessage}
          </p>
        </div>
      )}

      {/* BOTTOM CONTROL DASHBOARD PANEL */}
      <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 bg-gradient-to-t from-black via-black/85 to-transparent flex flex-col md:flex-row justify-between items-center gap-4 z-10 pointer-events-none">
        
        {/* Nitro boosters fuel meter bottom-left */}
        <div className="flex flex-col gap-1 w-full md:w-72 bg-black/60 p-3 border border-purple-500/30 rounded-lg backdrop-blur-md pointer-events-auto">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs font-mono text-purple-400 tracking-wider">NITRO PROPULSION</p>
            <span className="text-xs font-mono font-bold text-purple-300">
              {Math.floor(nitroCapacity)}%
            </span>
          </div>
          
          <div className="w-full bg-slate-900 h-3 rounded-full flex gap-1 border border-purple-500/20 overflow-hidden">
            <div 
              className={`h-full transition-all duration-100 ${
                activeNitroLevel === 3 ? 'bg-purple-500 shadow-[0_0_10px_#a855f7]' : 
                activeNitroLevel === 2 ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 
                activeNitroLevel === 1 ? 'bg-orange-500 shadow-[0_0_10px_#f97316]' : 'bg-slate-700'
              }`}
              style={{ width: `${nitroCapacity}%` }}
            />
          </div>

          <button 
            id="btn-nitro"
            onClick={triggerNitroToggle}
            className={`w-full py-2.5 mt-2 text-xs font-extrabold tracking-widest text-white rounded-md transition-all border-b-4 uppercase ${
              activeNitroLevel === 3 ? 'bg-purple-600 border-purple-800 animate-pulse' :
              activeNitroLevel === 2 ? 'bg-cyan-500 border-cyan-700' :
              activeNitroLevel === 1 ? 'bg-orange-500 border-orange-700' : 'bg-slate-700 border-slate-900 hover:bg-slate-600'
            }`}
          >
            {activeNitroLevel === 3 ? 'LEVEL 3: PURPLE TURBO' :
             activeNitroLevel === 2 ? 'LEVEL 2: BLUE ACCEL' :
             activeNitroLevel === 1 ? 'LEVEL 1: ORANGE BOOST' : 'ENGAGE NITRO'}
          </button>
        </div>

        {/* Central Steering controllers indicators */}
        <div className="flex gap-3 justify-center pointer-events-auto w-full md:w-auto">
          <button
            onMouseDown={() => { steerLeftRef.current = true; }}
            onMouseUp={() => { steerLeftRef.current = false; }}
            onMouseLeave={() => { steerLeftRef.current = false; }}
            onTouchStart={() => { steerLeftRef.current = true; }}
            onTouchEnd={() => { steerLeftRef.current = false; }}
            className={`w-20 h-16 bg-black/60 rounded-xl flex items-center justify-center text-3xl font-black transition-all border border-cyan-500/30 ${
              steerLeftRef.current ? 'bg-cyan-500/50 text-cyan-300 scale-95 border-cyan-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            ←
          </button>

          <div className="flex flex-col items-center justify-center min-w-32 bg-black/85 border border-cyan-500/30 px-4 py-2 rounded-lg">
            <span className="text-3xl font-black font-sans tracking-wide text-white">
              {playerSpeed}
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-widest">KM / H</span>
          </div>

          <button
            onMouseDown={() => { steerRightRef.current = true; }}
            onMouseUp={() => { steerRightRef.current = false; }}
            onMouseLeave={() => { steerRightRef.current = false; }}
            onTouchStart={() => { steerRightRef.current = true; }}
            onTouchEnd={() => { steerRightRef.current = false; }}
            className={`w-20 h-16 bg-black/60 rounded-xl flex items-center justify-center text-3xl font-black transition-all border border-cyan-500/30 ${
              steerRightRef.current ? 'bg-cyan-500/50 text-cyan-300 scale-95 border-cyan-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            →
          </button>
        </div>

        {/* HUD bottom right cards: tokens and drifts metrics */}
        <div className="flex gap-2 w-full md:w-auto overflow-hidden">
          <div className="flex-1 md:w-28 bg-black/60 border border-yellow-500/20 p-2 rounded-lg text-center">
            <p className="text-xs text-slate-400 font-mono">TOKENS</p>
            <p className="text-lg font-black font-sans text-yellow-400">
              {tokensCollectedCount}
            </p>
          </div>
          <div className="flex-1 md:w-28 bg-black/60 border border-cyan-500/20 p-2 rounded-lg text-center">
            <p className="text-xs text-slate-400 font-mono">DRIFT</p>
            <p className="text-lg font-black font-sans text-cyan-400">
              {driftMeter} pts
            </p>
          </div>
          <div className="flex-1 md:w-28 bg-black/60 border border-purple-500/20 p-2 rounded-lg text-center">
            <p className="text-xs text-slate-400 font-mono">FINISH</p>
            <p className="text-lg font-black font-sans text-purple-400">
              {lapProgress}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
