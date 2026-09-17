/**
 * SilhouetteGameCore.js
 * 
 * Master Game Controller for SILHOUETTE-SHIFT (4-Phase Architecture).
 * Orchestrates:
 * - Phase 1: Preview (10-20s, camera OFF)
 * - Phase 2: Pose Capture (15s, camera ON)
 * - Phase 3: Terrain Lock-In (2-3s transition, camera OFF)
 * - Phase 4: Play (WASD only, camera OFF, constant-movement idle rule)
 * - Round Win/Loss lifecycle across 7 escalating rounds
 */

import { SilhouetteTracker } from './vision/SilhouetteTracker';
import { PhysicsEngine } from './physics/PhysicsEngine';
import { WorldShiftEngine } from './shift/WorldShiftEngine';
import { SynthAudio } from './audio/SynthAudio';
import { GameRenderer } from './render/GameRenderer';
import { LightCreature, Laser, FallingBoulder, Portal, ParticleSystem } from './entities/Entities';
import { ROUNDS } from './rounds/RoundConfig';

export class SilhouetteGameCore {
  constructor(canvas, onStateChange = null) {
    this.canvas = canvas;
    this.onStateChange = onStateChange;

    this.width = 960;
    this.height = 600;

    // Subsystems
    this.silhouetteTracker = new SilhouetteTracker({
      width: 200,
      height: 150,
      gameWidth: this.width,
      gameHeight: this.height
    });

    this.physics = new PhysicsEngine({
      gameWidth: this.width,
      gameHeight: this.height
    });

    this.shiftEngine = new WorldShiftEngine({
      interval: 15.0
    });

    this.sfx = new SynthAudio();
    this.renderer = new GameRenderer(canvas);
    this.particleSystem = new ParticleSystem(800);

    // Round & Phase State Machine
    // 'INTRO' | 'PREVIEW' | 'CAPTURE' | 'LOCKIN' | 'PLAY' | 'WIN' | 'LOSE' | 'COMPLETE'
    this.currentRoundIndex = 0;
    this.currentPhase = 'INTRO';
    this.phaseTimer = 0;
    this.playElapsedTime = 0;
    this.midRunShiftTriggered = false;

    // Entities
    this.creature = null;
    this.platforms = [];
    this.lasers = [];
    this.fallingObjects = [];
    this.portal = null;
    this.roundConfig = null;

    // Inputs
    this.inputs = {
      left: false,
      right: false,
      up: false,
      down: false,
      jumpBuffered: false
    };

    this.isRunning = false;
    this.lastTime = 0;
    this.rafId = null;

    this.bindKeyboard();
  }

  async init() {
    this.loadRound(0);
    this.start();
    this.notifyState();
  }

  bindKeyboard() {
    this.onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      this.sfx.ensureContext();
      if (!this.sfx.isMusicRunning) {
        this.sfx.startMusic();
      }

      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft':
          this.inputs.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.inputs.right = true;
          break;
        case 'KeyW':
        case 'ArrowUp':
        case 'Space':
          this.inputs.up = true;
          this.inputs.jumpBuffered = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.inputs.down = true;
          break;
        case 'KeyR':
          this.restartRound();
          break;
        case 'KeyM':
          this.sfx.toggleMute();
          this.notifyState();
          break;
      }
    };

    this.onKeyUp = (e) => {
      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft':
          this.inputs.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.inputs.right = false;
          break;
        case 'KeyW':
        case 'ArrowUp':
        case 'Space':
          this.inputs.up = false;
          this.inputs.jumpBuffered = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.inputs.down = false;
          break;
      }
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  loadRound(index) {
    if (index >= ROUNDS.length) {
      this.currentPhase = 'COMPLETE';
      this.notifyState();
      return;
    }

    this.currentRoundIndex = index;
    const config = ROUNDS[index];
    this.roundConfig = config;

    // Reset entities
    this.creature = new LightCreature(config.creatureStart.x, config.creatureStart.y);
    this.platforms = config.platforms.map(p => ({ ...p }));
    this.lasers = config.lasers.map(l => new Laser(l.x1, l.y1, l.x2, l.y2, l.color));
    this.fallingObjects = config.fallingObjects.map(f => new FallingBoulder(f));
    this.portal = new Portal(config.portal.x, config.portal.y);

    // Reset shifts
    this.shiftEngine.reset();
    this.shiftEngine.isActive = false; // Controlled per round during Phase 4
    this.physics.setOrientation(0, false, false);
    this.midRunShiftTriggered = false;
    this.playElapsedTime = 0;

    this.particleSystem.clear();

    // Start with Round Intro Card
    this.currentPhase = 'INTRO';
    this.phaseTimer = 0;

    // Stop webcam if it was on
    this.silhouetteTracker.stopWebcam();

    this.notifyState();
  }

  startRoundAfterIntro() {
    this.startPreviewPhase();
  }

  startPreviewPhase() {
    this.currentPhase = 'PREVIEW';
    this.phaseTimer = this.roundConfig.previewDuration;
    this.silhouetteTracker.stopWebcam(); // Camera is strictly OFF
    this.notifyState();
  }

  skipPreview() {
    if (this.currentPhase === 'PREVIEW') {
      this.startCapturePhase();
    }
  }

  async startCapturePhase() {
    this.currentPhase = 'CAPTURE';
    this.phaseTimer = this.roundConfig.captureDuration; // fixed 15.0s
    await this.silhouetteTracker.startCaptureWindow(this.roundConfig.multiPose);
    this.notifyState();
  }

  startLockinPhase() {
    this.currentPhase = 'LOCKIN';
    this.phaseTimer = this.roundConfig.lockinDuration;
    // Conclude capture window, stop video stream completely, synthesize terrain!
    this.silhouetteTracker.stopCaptureWindow();
    this.sfx.playRealityShift();
    this.notifyState();
  }

  startPlayPhase() {
    this.currentPhase = 'PLAY';
    this.playElapsedTime = 0;
    this.midRunShiftTriggered = false;
    this.creature.respawn();
    this.physics.setOrientation(0, false, false);
    this.particleSystem.burst(this.creature.x, this.creature.y, 40, '#00f0ff', 240);
    this.notifyState();
  }

  restartRound() {
    this.loadRound(this.currentRoundIndex);
  }

  nextRound() {
    this.loadRound(this.currentRoundIndex + 1);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop = (now) => {
      if (!this.isRunning) return;
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;

      this.update(dt);
      this.render(dt);

      this.rafId = requestAnimationFrame(this.loop);
    };
    this.rafId = requestAnimationFrame(this.loop);
  }

  pause() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  update(dt) {
    if (this.currentPhase === 'INTRO' || this.currentPhase === 'COMPLETE') {
      return;
    }

    // PHASE 1: PREVIEW
    if (this.currentPhase === 'PREVIEW') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.startCapturePhase();
      }
      return;
    }

    // PHASE 2: POSE CAPTURE (15s window, camera ON)
    if (this.currentPhase === 'CAPTURE') {
      this.phaseTimer -= dt;
      const elapsedCapture = this.roundConfig.captureDuration - this.phaseTimer;
      this.silhouetteTracker.process(dt, elapsedCapture);

      if (this.phaseTimer <= 0) {
        this.startLockinPhase();
      }
      return;
    }

    // PHASE 3: TERRAIN LOCK-IN (Camera OFF permanently)
    if (this.currentPhase === 'LOCKIN') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.startPlayPhase();
      }
      return;
    }

    // PHASE 4: PLAY (WASD only, camera OFF, constant movement rule)
    if (this.currentPhase === 'PLAY') {
      this.playElapsedTime += dt;

      // Check Mid-Run Shift Modifier (e.g. Round 4, 6, 7)
      const shiftMod = this.roundConfig.midRunShift;
      if (shiftMod && !this.midRunShiftTriggered && this.playElapsedTime >= shiftMod.triggerTime) {
        this.midRunShiftTriggered = true;
        this.shiftEngine.targetRotation += shiftMod.rotDelta;
        if (shiftMod.mirrorX) {
          this.shiftEngine.targetMirrorX = this.shiftEngine.targetMirrorX === 1 ? -1 : 1;
        }
        this.shiftEngine.shakeIntensity = 18;
        this.shiftEngine.chromaticAberration = 1.0;
        this.sfx.playRealityShift();
        this.physics.setOrientation(
          this.shiftEngine.targetRotation,
          this.shiftEngine.targetMirrorX < 0,
          false
        );
      }

      this.shiftEngine.update(dt, this.sfx, this.physics);

      // 1. Update Creature Physics & Enforce Constant Movement
      const creatureResult = this.physics.updateCreature(
        this.creature,
        this.inputs,
        this.platforms,
        this.silhouetteTracker,
        dt,
        this.sfx,
        this.particleSystem,
        this.roundConfig.idleTimeout
      );

      this.creature.update(dt, this.particleSystem);

      // Check loss condition from creature
      if (creatureResult.lost) {
        this.currentPhase = 'LOSE';
        this.notifyState();
        return;
      }

      // 2. Update Lasers
      this.lasers.forEach(laser => {
        this.physics.updateLaser(laser, this.creature, this.platforms, this.silhouetteTracker, this.particleSystem, this.sfx);
        laser.update(dt, this.particleSystem);
      });

      if (!this.creature.alive) {
        this.currentPhase = 'LOSE';
        this.notifyState();
        return;
      }

      // 3. Update Falling Boulders
      this.fallingObjects.forEach(boulder => {
        this.physics.updateBoulder(boulder, this.creature, this.platforms, this.silhouetteTracker, dt, this.particleSystem, this.sfx);
        boulder.update(dt, this.particleSystem);
      });

      if (!this.creature.alive) {
        this.currentPhase = 'LOSE';
        this.notifyState();
        return;
      }

      // 4. Update Portal (Win check)
      this.portal.update(dt, this.creature, () => {
        this.sfx.playLevelComplete();
        this.currentPhase = 'WIN';
        this.notifyState();
      }, this.particleSystem);

      // 5. Update Particles
      this.particleSystem.update(dt);

      this.inputs.jumpBuffered = false;
    }
  }

  render(dt) {
    const gameState = {
      currentPhase: this.currentPhase,
      phaseTimer: this.phaseTimer,
      roundConfig: this.roundConfig,
      creature: this.creature,
      platforms: this.platforms,
      lasers: this.lasers,
      fallingObjects: this.fallingObjects,
      portal: this.portal,
      particleSystem: this.particleSystem,
      silhouetteTracker: this.silhouetteTracker,
      shiftEngine: this.shiftEngine
    };

    this.renderer.render(gameState, dt);
  }

  notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        roundIndex: this.currentRoundIndex,
        totalRounds: ROUNDS.length,
        roundConfig: this.roundConfig,
        currentPhase: this.currentPhase,
        phaseTimer: this.phaseTimer,
        causeOfDeath: this.creature ? this.creature.causeOfDeath : null,
        isWebcamActive: this.silhouetteTracker.isWebcamActive,
        isSimulation: this.silhouetteTracker.isSimulation,
        puppetPreset: this.silhouetteTracker.puppetState.preset,
        isMuted: this.sfx.isMuted
      });
    }
  }

  destroy() {
    this.pause();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.silhouetteTracker.stopWebcam();
    this.sfx.destroy();
  }
}
