/**
 * GameRenderer.js
 * 
 * Cinematic 4-Phase Renderer for SILHOUETTE-SHIFT.
 * - Phase 1 (Preview): Complete obstacle layout (active glowing lasers, falling boulder paths,
 *   hazard danger zones, gap callouts, exit portal). Camera is strictly OFF.
 * - Phase 2 (Pose Capture): Live webcam feed with ARM-ONLY segmentation contour, torso exclusion
 *   guide zone, and overlaid obstacle alignment targets. Camera is ON.
 * - Phase 3 (Lock-In): Camera is OFF. Locked arm geometry fades in with cyan laser grid scan.
 * - Phase 4 (Play): Camera is OFF. Player navigates locked terrain. Energy core stability meter.
 */

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    this.sceneCanvas = document.createElement('canvas');
    this.sceneCanvas.width = this.width;
    this.sceneCanvas.height = this.height;
    this.sceneCtx = this.sceneCanvas.getContext('2d');

    this.time = 0;
    this.lockinScanY = 0;

    this.dustMotes = [];
    for (let i = 0; i < 35; i++) {
      this.dustMotes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        size: 1 + Math.random() * 2,
        alpha: 0.15 + Math.random() * 0.3
      });
    }
  }

  render(gameState, dt) {
    this.time += dt;
    const sCtx = this.sceneCtx;
    const phase = gameState.currentPhase;

    // 1. Dark Void Base
    sCtx.fillStyle = '#060a10';
    sCtx.fillRect(0, 0, this.width, this.height);

    // 2. Technical Blueprint Grid
    this.drawBlueprintGrid(sCtx);

    // 3. Floating Dust
    this.drawDustMotes(sCtx, dt);

    // 4. Apply World Transform Matrix (if mid-run shift active)
    if (gameState.shiftEngine) {
      gameState.shiftEngine.applyTransform(sCtx, this.width, this.height);
    }

    // 5. PHASE-SPECIFIC RENDERING
    if (phase === 'PREVIEW') {
      this.renderPreviewPhase(sCtx, gameState);
    } else if (phase === 'CAPTURE') {
      this.renderCapturePhase(sCtx, gameState, dt);
    } else if (phase === 'LOCKIN') {
      this.renderLockinPhase(sCtx, gameState, dt);
    } else {
      // PLAY phase
      this.renderPlayPhase(sCtx, gameState);
    }

    if (gameState.shiftEngine) {
      gameState.shiftEngine.restoreTransform(sCtx);
    }

    // 6. Chromatic Aberration & Scanlines
    const chromaticImpulse = gameState.shiftEngine ? gameState.shiftEngine.chromaticAberration : 0;
    this.compositePostProcessing(chromaticImpulse);

    // 7. Screen-Space HUD & Phase Telemetry
    this.drawScreenHUD(this.ctx, gameState);
  }

  /**
   * PHASE 1: PREVIEW
   * VIVIDLY RENDERS ALL HAZARDS: Lasers, Falling Boulders, Spikes, Platforms & Exit!
   */
  renderPreviewPhase(ctx, gameState) {
    // 1. Render platforms & void chasm spikes
    this.drawPlatforms(ctx, gameState.platforms);

    // 2. Render Portal & Start
    if (gameState.portal) {
      gameState.portal.render(ctx);
      ctx.save();
      ctx.font = '700 11px "Courier New", monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.textAlign = 'center';
      ctx.fillText('[TARGET EXIT]', gameState.portal.x, gameState.portal.y - 36);
      ctx.restore();
    }

    if (gameState.creature) {
      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(gameState.creature.startX, gameState.creature.startY, 16, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#00f0ff';
      ctx.font = '700 11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[START HERE]', gameState.creature.startX, gameState.creature.startY - 22);
      ctx.restore();
    }

    // 3. VIVID LASERS WITH TACTICAL PLANNING LABELS
    if (gameState.lasers && gameState.lasers.length > 0) {
      gameState.lasers.forEach(laser => {
        // Render full glowing laser
        laser.render(ctx);

        // Tactical warning tag
        const midX = (laser.x1 + laser.x2) * 0.5;
        const midY = (laser.y1 + laser.y2) * 0.5;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 42, 109, 0.2)';
        ctx.fillRect(midX - 80, midY - 14, 160, 22);
        ctx.strokeStyle = '#ff2a6d';
        ctx.lineWidth = 1;
        ctx.strokeRect(midX - 80, midY - 14, 160, 22);

        ctx.fillStyle = '#ff2a6d';
        ctx.font = '700 10px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚠ LASER: BLOCK WITH ARMS', midX, midY + 1);
        ctx.restore();
      });
    }

    // 4. VIVID FALLING BOULDERS & TRAJECTORY PATHS
    if (gameState.fallingObjects && gameState.fallingObjects.length > 0) {
      gameState.fallingObjects.forEach(boulder => {
        const sx = boulder.spawnX;
        const sy = boulder.spawnY;
        const groundY = this.height - 60;

        ctx.save();
        // Spawner socket
        ctx.fillStyle = 'rgba(255, 42, 109, 0.25)';
        ctx.strokeStyle = '#ff2a6d';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx - 18, sy - 14, 36, 16);
        ctx.fillRect(sx - 18, sy - 14, 36, 16);

        ctx.fillStyle = '#ff2a6d';
        ctx.font = '700 9px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SPAWN', sx, sy - 18);

        // Trajectory line
        ctx.strokeStyle = 'rgba(255, 42, 109, 0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, groundY);
        ctx.stroke();

        // Downward chevron arrows along trajectory
        const arrowStep = 60;
        ctx.setLineDash([]);
        for (let y = sy + 30; y < groundY; y += arrowStep) {
          ctx.beginPath();
          ctx.moveTo(sx - 6, y - 6);
          ctx.lineTo(sx, y);
          ctx.lineTo(sx + 6, y - 6);
          ctx.stroke();
        }

        // Animated ghost boulder traveling down trajectory
        const dropDist = groundY - sy;
        const cycleProgress = ((this.time * 0.6 + boulder.id * 0.4) % 1.0);
        const ghostY = sy + cycleProgress * dropDist;

        ctx.fillStyle = 'rgba(255, 42, 109, 0.5)';
        ctx.beginPath();
        ctx.arc(sx, ghostY, boulder.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Tactical label
        ctx.fillStyle = '#ff2a6d';
        ctx.font = '700 9px "Courier New", monospace';
        ctx.fillText('⚠ DEFLECT WITH ARMS', sx, sy + 75);
        ctx.restore();
      });
    }

    // 5. Void Chasm Callout
    if (gameState.platforms) {
      gameState.platforms.forEach(p => {
        if (p.isHazard) {
          ctx.save();
          const cx = p.x + p.width * 0.5;
          ctx.fillStyle = 'rgba(255, 42, 109, 0.15)';
          ctx.fillRect(cx - 100, p.y - 28, 200, 20);
          ctx.strokeStyle = '#ff2a6d';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx - 100, p.y - 28, 200, 20);

          ctx.fillStyle = '#ff2a6d';
          ctx.font = '700 10px "Courier New", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('⚠ VOID CHASM: BRIDGE WITH ARMS', cx, p.y - 14);
          ctx.restore();
        }
      });
    }
  }

  /**
   * PHASE 2: POSE CAPTURE
   * Renders camera feed, ARM-ONLY contour, central torso exclusion box, and hazard alignment guides!
   */
  renderCapturePhase(ctx, gameState, dt) {
    const tracker = gameState.silhouetteTracker;

    // 1. Live camera video feed (translucent monochrome backdrop)
    if (tracker) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      if (tracker.isWebcamActive && tracker.video.readyState >= 2) {
        ctx.save();
        if (tracker.mirror) {
          ctx.translate(this.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(tracker.video, 0, 0, this.width, this.height);
        ctx.restore();
      }

      // 2. ARM-ONLY SEGMENTATION CONTOUR (Glowing cyan on arms only!)
      ctx.globalAlpha = 0.9;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 20;
      ctx.drawImage(tracker.maskCanvas, 0, 0, this.width, this.height);
      ctx.restore();
    }

    // 3. Central Torso & Head Exclusion Guide (Shows player their body is excluded)
    if (tracker && tracker.isolateArmsOnly) {
      const torsoW = (tracker.torsoExclusionWidth || 0.15) * 2 * this.width;
      const torsoX = (this.width - torsoW) * 0.5;
      const headH = this.height * 0.44;

      ctx.save();
      // Torso exclusion dashed outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.strokeRect(torsoX, this.height * 0.38, torsoW, this.height * 0.62);

      // Head exclusion outline
      ctx.strokeRect(this.width * 0.42, 0, this.width * 0.16, headH);

      ctx.font = '700 9px "Courier New", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.textAlign = 'center';
      ctx.fillText('[TORSO/HEAD EXCLUDED]', this.width * 0.5, this.height * 0.65);

      // Flank guides
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('← EXTEND LEFT ARM', this.width * 0.2, this.height * 0.5);
      ctx.fillText('EXTEND RIGHT ARM →', this.width * 0.8, this.height * 0.5);
      ctx.restore();
    }

    // 4. Overlay hazard alignment guides so player can position their arms directly over lasers/chasms!
    ctx.save();
    ctx.globalAlpha = 0.55;
    this.drawPlatforms(ctx, gameState.platforms);

    if (gameState.lasers) {
      gameState.lasers.forEach(laser => laser.render(ctx));
    }

    if (gameState.fallingObjects) {
      gameState.fallingObjects.forEach(boulder => {
        ctx.strokeStyle = 'rgba(255, 42, 109, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(boulder.spawnX, boulder.spawnY);
        ctx.lineTo(boulder.spawnX, this.height - 60);
        ctx.stroke();
      });
    }

    if (gameState.portal) gameState.portal.render(ctx);
    ctx.restore();
  }

  renderLockinPhase(ctx, gameState, dt) {
    this.lockinScanY = (this.lockinScanY + dt * 500) % this.height;

    this.drawPlatforms(ctx, gameState.platforms);
    this.drawLockedTerrain(ctx, gameState.silhouetteTracker, 0.95);

    // Cyan scanning laser line
    ctx.save();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(0, this.lockinScanY);
    ctx.lineTo(this.width, this.lockinScanY);
    ctx.stroke();
    ctx.restore();

    if (gameState.portal) gameState.portal.render(ctx);
  }

  renderPlayPhase(ctx, gameState) {
    this.drawPlatforms(ctx, gameState.platforms);

    // Render locked arm terrain
    this.drawLockedTerrain(ctx, gameState.silhouetteTracker, 1.0);

    if (gameState.lasers) {
      gameState.lasers.forEach(laser => laser.render(ctx));
    }

    if (gameState.fallingObjects) {
      gameState.fallingObjects.forEach(obj => obj.render(ctx));
    }

    if (gameState.portal) {
      gameState.portal.render(ctx);
    }

    if (gameState.particleSystem) {
      gameState.particleSystem.render(ctx);
    }

    if (gameState.creature) {
      gameState.creature.render(ctx);
    }
  }

  drawLockedTerrain(ctx, tracker, alpha = 1.0) {
    if (!tracker || !tracker.lockedTerrainCanvas) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Cyan rim contour
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 18;
    ctx.drawImage(tracker.lockedTerrainCanvas, 0, 0, this.width, this.height);

    // Solid obsidian arm core
    ctx.shadowBlur = 0;
    ctx.drawImage(tracker.lockedTerrainCanvas, 0, 0, this.width, this.height);

    ctx.restore();
  }

  drawPlatforms(ctx, platforms) {
    if (!platforms) return;

    ctx.save();
    platforms.forEach(p => {
      if (p.isHazard) {
        ctx.fillStyle = '#ff2a6d';
        ctx.shadowColor = '#ff2a6d';
        ctx.shadowBlur = 10;
        const spikeCount = Math.floor(p.width / 16);
        for (let i = 0; i < spikeCount; i++) {
          ctx.beginPath();
          ctx.moveTo(p.x + i * 16, p.y + p.height);
          ctx.lineTo(p.x + (i + 0.5) * 16, p.y);
          ctx.lineTo(p.x + (i + 1) * 16, p.y + p.height);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        return;
      }

      ctx.fillStyle = '#0a1017';
      ctx.fillRect(p.x, p.y, p.width, p.height);

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.strokeRect(p.x, p.y, p.width, p.height);
      ctx.shadowBlur = 0;
    });
    ctx.restore();
  }

  drawBlueprintGrid(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
    ctx.lineWidth = 1;

    const gridSize = 48;
    for (let x = 0; x < this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawDustMotes(ctx, dt) {
    ctx.save();
    for (let i = 0; i < this.dustMotes.length; i++) {
      const d = this.dustMotes[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.x < 0) d.x = this.width;
      if (d.x > this.width) d.x = 0;
      if (d.y < 0) d.y = this.height;
      if (d.y > this.height) d.y = 0;

      ctx.fillStyle = `rgba(0, 240, 255, ${d.alpha})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  compositePostProcessing(chromaticStrength = 0) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (chromaticStrength > 0.05) {
      const offset = chromaticStrength * 12;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(this.sceneCanvas, -offset, 0);
      ctx.drawImage(this.sceneCanvas, offset * 0.7, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.sceneCanvas, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(this.sceneCanvas, 0, 0);
    }

    // Scanlines
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let y = 0; y < this.height; y += 4) {
      ctx.fillRect(0, y, this.width, 1.5);
    }
    ctx.restore();
  }

  drawScreenHUD(ctx, gameState) {
    const phase = gameState.currentPhase;
    const phaseTimer = Math.max(0, gameState.phaseTimer || 0).toFixed(1);

    ctx.save();
    ctx.font = '700 13px "Courier New", monospace';

    // 1. Phase Status Banner (Top Center)
    let bannerText = '';
    let bannerColor = '#00f0ff';

    if (phase === 'PREVIEW') {
      bannerText = `[PHASE 1: PREVIEW] ALL HAZARDS SHOWN // PLAN ARM POSE: ${phaseTimer}s`;
      bannerColor = '#00f0ff';
    } else if (phase === 'CAPTURE') {
      bannerText = `[PHASE 2: ARM CAPTURE] CAMERA ON // EXTEND ARMS ONLY: ${phaseTimer}s`;
      bannerColor = '#f59e0b';
    } else if (phase === 'LOCKIN') {
      bannerText = `[PHASE 3: TERRAIN LOCK-IN] CAMERA OFF // ARM GEOMETRY SYNTHESIZED`;
      bannerColor = '#a855f7';
    } else if (phase === 'PLAY') {
      bannerText = `[PHASE 4: RUN] WASD ACTIVE // CONSTANT MOTION REQUIRED`;
      bannerColor = '#00f0ff';
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10, 16, 24, 0.88)';
    ctx.fillRect(this.width / 2 - 270, 16, 540, 28);
    ctx.strokeStyle = bannerColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(this.width / 2 - 270, 16, 540, 28);

    ctx.fillStyle = bannerColor;
    ctx.shadowColor = bannerColor;
    ctx.shadowBlur = 8;
    ctx.fillText(bannerText, this.width / 2, 35);
    ctx.shadowBlur = 0;

    // 2. CONSTANT-MOVEMENT IDLE BATTERY GAUGE (Phase 4 only)
    if (phase === 'PLAY' && gameState.creature) {
      const creature = gameState.creature;
      const idleTimeout = gameState.roundConfig ? gameState.roundConfig.idleTimeout : 3.0;
      const remainingMotion = Math.max(0, idleTimeout - creature.idleTimer);
      const ratio = remainingMotion / idleTimeout;

      const gaugeW = 200;
      const gaugeH = 8;
      const gaugeX = this.width - gaugeW - 24;
      const gaugeY = 24;

      ctx.textAlign = 'right';
      ctx.font = '700 10px "Courier New", monospace';
      ctx.fillStyle = creature.isWarningIdle ? '#ff2a6d' : '#00f0ff';
      ctx.fillText(
        `MOTION CORE: ${remainingMotion.toFixed(1)}s`,
        gaugeX - 10,
        gaugeY + 7
      );

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);
      ctx.strokeStyle = creature.isWarningIdle ? '#ff2a6d' : 'rgba(0, 240, 255, 0.5)';
      ctx.strokeRect(gaugeX, gaugeY, gaugeW, gaugeH);

      ctx.fillStyle = creature.isWarningIdle ? '#ff2a6d' : '#00f0ff';
      ctx.fillRect(gaugeX + 1, gaugeY + 1, (gaugeW - 2) * ratio, gaugeH - 2);

      if (creature.isWarningIdle) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff2a6d';
        ctx.font = '800 18px "Courier New", monospace';
        ctx.shadowColor = '#ff2a6d';
        ctx.shadowBlur = 12;
        ctx.fillText('⚠ EXTINCTION IMMINENT — MOVE! ⚠', this.width / 2, this.height - 40);
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
  }
}
