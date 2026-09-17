/**
 * SilhouetteTracker.js
 * 
 * High-performance Computer Vision engine for SILHOUETTE-SHIFT.
 * Converts 15-second webcam pose capture into accurate 2D collision geometry at 60 FPS.
 * 
 * ARM-ONLY ISOLATION ENGINE:
 * - Specifically isolates the player's arms and hands.
 * - Suppresses the central head and torso core so only outstretched arms,
 *   bridging limbs, and raised hands become physical terrain.
 * - Camera is strictly active only during Phase 2.
 */

export class SilhouetteTracker {
  constructor(options = {}) {
    this.width = options.width || 200;
    this.height = options.height || 150;
    this.gameWidth = options.gameWidth || 960;
    this.gameHeight = options.gameHeight || 600;

    // Offscreen canvas for frame capture & analysis
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.width;
    this.offscreenCanvas.height = this.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

    // Live mask canvas (shown only during Phase 2)
    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = this.width;
    this.maskCanvas.height = this.height;
    this.maskCtx = this.maskCanvas.getContext('2d');

    // Locked terrain canvas (rendered during Phase 3 & Phase 4 as architectural geometry)
    this.lockedTerrainCanvas = document.createElement('canvas');
    this.lockedTerrainCanvas.width = this.width;
    this.lockedTerrainCanvas.height = this.height;
    this.lockedTerrainCtx = this.lockedTerrainCanvas.getContext('2d');

    // Mask arrays
    this.mask = new Uint8Array(this.width * this.height);
    this.lockedMask = new Uint8Array(this.width * this.height);
    this.bgBuffer = null;

    // Video stream state (Active ONLY during Phase 2)
    this.video = document.createElement('video');
    this.video.autoplay = true;
    this.video.playsInline = true;
    this.video.muted = true;
    this.stream = null;
    this.isWebcamActive = false;
    this.webcamError = null;

    // Phase 2 Capture Buffer
    this.isCapturing = false;
    this.multiPoseMode = false;
    this.poseBuffer = [];
    this.lastSampleTime = 0;
    this.sampleInterval = 0.45;

    // ARM-ONLY ISOLATION SETTINGS
    this.isolateArmsOnly = true; // Exclude torso and head, keep only arms!
    this.torsoExclusionWidth = 0.15; // Normalized half-width (30% center zone)

    // Detection settings
    this.mode = 'difference'; // 'difference' | 'luminance' | 'dark'
    this.threshold = 42;
    this.mirror = true;
    this.invert = false;
    this.smoothingPasses = 1;

    // Simulation / Puppet Fallback State
    this.isSimulation = false;
    this.puppetState = {
      animTime: 0,
      preset: 'bridge', // 'bridge', 'shield', 'funnel', 'mouse'
      mouseX: 0.5,
      mouseY: 0.5
    };
  }

  async initWebcam() {
    if (this.stream && this.isWebcamActive) return true;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      this.video.srcObject = this.stream;
      await this.video.play();
      this.isWebcamActive = true;
      this.isSimulation = false;
      this.webcamError = null;

      setTimeout(() => {
        this.captureBackground();
      }, 500);

      return true;
    } catch (err) {
      console.warn('Webcam access not granted or unavailable, falling back to Simulation Mode:', err);
      this.webcamError = err.message || 'Camera permission denied or camera not found';
      this.isWebcamActive = false;
      this.isSimulation = true;
      return false;
    }
  }

  stopWebcam() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
      this.stream = null;
    }
    this.video.srcObject = null;
    this.isWebcamActive = false;
  }

  async startCaptureWindow(multiPose = false) {
    this.isCapturing = true;
    this.multiPoseMode = multiPose;
    this.poseBuffer = [];
    this.lastSampleTime = 0;

    if (!this.isSimulation) {
      await this.initWebcam();
    }
  }

  stopCaptureWindow() {
    this.isCapturing = false;
    this.stopWebcam();
    this.synthesizeLockedTerrain();
    this.renderLockedTerrainCanvas();
  }

  synthesizeLockedTerrain() {
    const totalPixels = this.width * this.height;
    this.lockedMask.fill(0);

    if (this.poseBuffer.length === 0) {
      this.lockedMask.set(this.mask);
      this.ensureMinimumTerrain();
      return;
    }

    if (this.multiPoseMode) {
      const midTime = 7.5;
      const firstHalf = this.poseBuffer.filter(p => p.time <= midTime);
      const secondHalf = this.poseBuffer.filter(p => p.time > midTime);

      const pickBest = (list) => {
        if (list.length === 0) return null;
        return list[Math.floor(list.length * 0.8)].mask;
      };

      const maskA = pickBest(firstHalf);
      const maskB = pickBest(secondHalf);

      for (let i = 0; i < totalPixels; i++) {
        let solid = 0;
        if (maskA && maskA[i] === 1) solid = 1;
        if (maskB && maskB[i] === 1) solid = 1;
        this.lockedMask[i] = solid;
      }
    } else {
      const steadyFrames = this.poseBuffer.slice(Math.floor(this.poseBuffer.length * 0.4));
      const targetFrames = steadyFrames.length > 0 ? steadyFrames : this.poseBuffer;

      const countThreshold = Math.max(1, Math.floor(targetFrames.length * 0.35));

      for (let i = 0; i < totalPixels; i++) {
        let hits = 0;
        for (let f = 0; f < targetFrames.length; f++) {
          if (targetFrames[f].mask[i] === 1) hits++;
        }
        this.lockedMask[i] = hits >= countThreshold ? 1 : 0;
      }
    }

    this.smoothMaskBuffer(this.lockedMask);
    this.ensureMinimumTerrain();
  }

  ensureMinimumTerrain() {
    let solidCount = 0;
    const totalPixels = this.width * this.height;
    for (let i = 0; i < totalPixels; i++) {
      if (this.lockedMask[i] === 1) solidCount++;
    }

    // If minimal or no arm silhouette detected, generate clean arm bridge spans
    if (solidCount < totalPixels * 0.015) {
      const cy = Math.floor(this.height * 0.55);
      const h = Math.floor(this.height * 0.07);
      const minX = Math.floor(this.width * 0.2);
      const maxX = Math.floor(this.width * 0.8);

      for (let y = cy; y < cy + h; y++) {
        const row = y * this.width;
        for (let x = minX; x < maxX; x++) {
          this.lockedMask[row + x] = 1;
        }
      }
    }
  }

  captureBackground() {
    if (!this.isWebcamActive || this.video.readyState < 2) return;
    this.drawVideoToOffscreen();
    const frame = this.offscreenCtx.getImageData(0, 0, this.width, this.height);
    this.bgBuffer = new Uint8ClampedArray(frame.data);
  }

  resetBackground() {
    this.bgBuffer = null;
  }

  setSimulationMode(enabled) {
    this.isSimulation = enabled;
  }

  updatePuppetMouse(normX, normY) {
    this.puppetState.mouseX = Math.max(0.05, Math.min(0.95, normX));
    this.puppetState.mouseY = Math.max(0.05, Math.min(0.95, normY));
  }

  setPuppetPreset(presetName) {
    this.puppetState.preset = presetName;
  }

  drawVideoToOffscreen() {
    this.offscreenCtx.save();
    if (this.mirror) {
      this.offscreenCtx.translate(this.width, 0);
      this.offscreenCtx.scale(-1, 1);
    }
    this.offscreenCtx.drawImage(this.video, 0, 0, this.width, this.height);
    this.offscreenCtx.restore();
  }

  /**
   * Process frame during Phase 2 (Pose Capture).
   */
  process(dt = 0.016, captureElapsedTime = 0) {
    if (!this.isCapturing) return;

    if (this.isSimulation || !this.isWebcamActive || this.video.readyState < 2) {
      this.processSimulation(dt);
    } else {
      this.drawVideoToOffscreen();
      const imgData = this.offscreenCtx.getImageData(0, 0, this.width, this.height);
      const data = imgData.data;
      const totalPixels = this.width * this.height;
      const threshold = this.threshold;
      const hasBg = this.bgBuffer !== null && this.mode === 'difference';
      const bg = this.bgBuffer;

      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        let isSolid = 0;

        if (hasBg) {
          const bgR = bg[idx];
          const bgG = bg[idx + 1];
          const bgB = bg[idx + 2];
          const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
          isSolid = diff > threshold * 3 ? 1 : 0;
        } else if (this.mode === 'luminance') {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          isSolid = lum > threshold ? 1 : 0;
        } else {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          isSolid = lum < threshold ? 1 : 0;
        }

        if (this.invert) isSolid = isSolid ? 0 : 1;
        this.mask[i] = isSolid;
      }

      // ISOLATE ARMS ONLY: Suppress head & torso
      if (this.isolateArmsOnly) {
        this.filterArmsOnly(this.mask);
      }

      if (this.smoothingPasses > 0) {
        this.smoothMaskBuffer(this.mask);
      }
    }

    this.renderMaskCanvas();

    if (captureElapsedTime - this.lastSampleTime >= this.sampleInterval) {
      this.lastSampleTime = captureElapsedTime;
      this.poseBuffer.push({
        time: captureElapsedTime,
        mask: new Uint8Array(this.mask)
      });
    }
  }

  /**
   * Arm Isolation Filter:
   * Identifies and zeroes out the central head and torso core, preserving ONLY:
   * - Left arm & hand extending into the left flank
   * - Right arm & hand extending into the right flank
   * - Raised arms / hands reaching above shoulders
   * - Horizontal bridge poses across the chest
   */
  filterArmsOnly(mask) {
    const w = this.width;
    const h = this.height;

    // Torso exclusion boundaries (normalized center box)
    const torsoHalfW = this.torsoExclusionWidth;
    const torsoMinX = Math.floor((0.5 - torsoHalfW) * w);
    const torsoMaxX = Math.floor((0.5 + torsoHalfW) * w);

    // Head exclusion zone (top center)
    const headMinX = Math.floor(0.42 * w);
    const headMaxX = Math.floor(0.58 * w);
    const headMaxY = Math.floor(0.44 * h);

    // Lower torso exclusion zone (from lower chest down)
    const lowerTorsoMinY = Math.floor(0.40 * h);

    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const idx = row + x;
        if (mask[idx] === 1) {
          // Check if pixel falls inside the head column or torso core
          const isInsideHead = (y < headMaxY && x >= headMinX && x <= headMaxX);
          const isInsideTorso = (y >= lowerTorsoMinY && x >= torsoMinX && x <= torsoMaxX);

          if (isInsideHead || isInsideTorso) {
            mask[idx] = 0; // Remove head and torso completely!
          }
        }
      }
    }
  }

  /**
   * Simulation Mode: Generates ONLY articulated arms and hands!
   * No head or torso is rendered.
   */
  processSimulation(dt) {
    this.puppetState.animTime += dt;
    const t = this.puppetState.animTime;
    const mask = this.mask;
    mask.fill(0);

    const w = this.width;
    const h = this.height;
    const preset = this.puppetState.preset;

    // Shoulder anchor points (no torso drawn)
    const leftShoulderX = 0.38 * w;
    const leftShoulderY = 0.42 * h;
    const rightShoulderX = 0.62 * w;
    const rightShoulderY = 0.42 * h;

    let leftHandX, leftHandY, rightHandX, rightHandY;

    if (preset === 'bridge') {
      // Horizontal bridge arms reaching across
      leftHandX = 0.08 * w;
      leftHandY = (0.50 + Math.sin(t * 1.5) * 0.02) * h;
      rightHandX = 0.92 * w;
      rightHandY = (0.50 + Math.cos(t * 1.5) * 0.02) * h;
    } else if (preset === 'shield') {
      // Arms raised high to block lasers
      leftHandX = 0.28 * w;
      leftHandY = (0.15 + Math.sin(t * 2) * 0.03) * h;
      rightHandX = 0.72 * w;
      rightHandY = (0.15 + Math.cos(t * 2) * 0.03) * h;
    } else if (preset === 'funnel') {
      // V-shaped deflector arms
      leftHandX = 0.16 * w;
      leftHandY = 0.32 * h;
      rightHandX = 0.84 * w;
      rightHandY = 0.32 * h;
    } else {
      // Mouse interactive arm
      leftHandX = 0.12 * w;
      leftHandY = (0.58 + Math.sin(t) * 0.04) * h;
      rightHandX = this.puppetState.mouseX * w;
      rightHandY = this.puppetState.mouseY * h;
    }

    // Left Arm (Upper Arm, Forearm, Hand)
    const leftElbowX = (leftShoulderX + leftHandX) * 0.5 - 8;
    const leftElbowY = (leftShoulderY + leftHandY) * 0.5 + 8;
    this.rasterizeCapsule(leftShoulderX, leftShoulderY, leftElbowX, leftElbowY, 14);
    this.rasterizeCapsule(leftElbowX, leftElbowY, leftHandX, leftHandY, 12);
    this.rasterizeCircle(leftHandX, leftHandY, 15);

    // Right Arm (Upper Arm, Forearm, Hand)
    const rightElbowX = (rightShoulderX + rightHandX) * 0.5 + 8;
    const rightElbowY = (rightShoulderY + rightHandY) * 0.5 + 8;
    this.rasterizeCapsule(rightShoulderX, rightShoulderY, rightElbowX, rightElbowY, 14);
    this.rasterizeCapsule(rightElbowX, rightElbowY, rightHandX, rightHandY, 12);
    this.rasterizeCircle(rightHandX, rightHandY, 15);
  }

  rasterizeCircle(cx, cy, r) {
    const w = this.width;
    const h = this.height;
    const minX = Math.max(0, Math.floor(cx - r));
    const maxX = Math.min(w - 1, Math.ceil(cx + r));
    const minY = Math.max(0, Math.floor(cy - r));
    const maxY = Math.min(h - 1, Math.ceil(cy + r));
    const rSq = r * r;

    for (let y = minY; y <= maxY; y++) {
      const dy = y - cy;
      const dySq = dy * dy;
      const rowOffset = y * w;
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        if (dx * dx + dySq <= rSq) {
          this.mask[rowOffset + x] = 1;
        }
      }
    }
  }

  rasterizeCapsule(x1, y1, x2, y2, radius) {
    const w = this.width;
    const h = this.height;
    const minX = Math.max(0, Math.floor(Math.min(x1, x2) - radius));
    const maxX = Math.min(w - 1, Math.ceil(Math.max(x1, x2) + radius));
    const minY = Math.max(0, Math.floor(Math.min(y1, y2) - radius));
    const maxY = Math.min(h - 1, Math.ceil(Math.max(y1, y2) + radius));
    const rSq = radius * radius;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy || 1;

    for (let y = minY; y <= maxY; y++) {
      const rowOffset = y * w;
      for (let x = minX; x <= maxX; x++) {
        const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lenSq));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        const distSq = (x - projX) * (x - projX) + (y - projY) * (y - projY);
        if (distSq <= rSq) {
          this.mask[rowOffset + x] = 1;
        }
      }
    }
  }

  smoothMaskBuffer(targetBuffer) {
    const w = this.width;
    const h = this.height;
    const smoothed = new Uint8Array(targetBuffer.length);

    for (let y = 1; y < h - 1; y++) {
      const row = y * w;
      for (let x = 1; x < w - 1; x++) {
        const idx = row + x;
        const sum =
          targetBuffer[idx - w - 1] + targetBuffer[idx - w] + targetBuffer[idx - w + 1] +
          targetBuffer[idx - 1]     + targetBuffer[idx]     + targetBuffer[idx + 1] +
          targetBuffer[idx + w - 1] + targetBuffer[idx + w] + targetBuffer[idx + w + 1];

        smoothed[idx] = sum >= 4 ? 1 : 0;
      }
    }
    targetBuffer.set(smoothed);
  }

  renderMaskCanvas() {
    const imgData = this.maskCtx.createImageData(this.width, this.height);
    const data = imgData.data;
    const mask = this.mask;
    const len = mask.length;

    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      if (mask[i] === 1) {
        data[idx] = 0;
        data[idx + 1] = 240;
        data[idx + 2] = 255;
        data[idx + 3] = 210; // Glowing cyan arm contour
      } else {
        data[idx + 3] = 0;
      }
    }
    this.maskCtx.putImageData(imgData, 0, 0);
  }

  renderLockedTerrainCanvas() {
    const imgData = this.lockedTerrainCtx.createImageData(this.width, this.height);
    const data = imgData.data;
    const mask = this.lockedMask;
    const len = mask.length;

    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      if (mask[i] === 1) {
        data[idx] = 8;
        data[idx + 1] = 14;
        data[idx + 2] = 20;
        data[idx + 3] = 255;
      } else {
        data[idx + 3] = 0;
      }
    }
    this.lockedTerrainCtx.putImageData(imgData, 0, 0);
  }

  // ==========================================
  // PHYSICAL COLLISION & RAYCASTING
  // ==========================================

  isGamePointSolid(gameX, gameY) {
    const mx = Math.floor((gameX / this.gameWidth) * this.width);
    const my = Math.floor((gameY / this.gameHeight) * this.height);

    if (mx < 0 || mx >= this.width || my < 0 || my >= this.height) {
      return false;
    }

    return this.lockedMask[my * this.width + mx] === 1;
  }

  checkCircleCollision(gameX, gameY, radius) {
    const mx = (gameX / this.gameWidth) * this.width;
    const my = (gameY / this.gameHeight) * this.height;
    const mr = (radius / this.gameWidth) * this.width;

    const cx = Math.floor(mx);
    const cy = Math.floor(my);

    let colliding = false;
    let normalX = 0;
    let normalY = 0;
    let overlap = 0;

    const probes = 12;
    let hits = 0;

    for (let i = 0; i < probes; i++) {
      const angle = (i / probes) * Math.PI * 2;
      const px = Math.floor(mx + Math.cos(angle) * mr);
      const py = Math.floor(my + Math.sin(angle) * mr);

      if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
        if (this.lockedMask[py * this.width + px] === 1) {
          hits++;
          normalX += Math.cos(angle + Math.PI);
          normalY += Math.sin(angle + Math.PI);
        }
      }
    }

    if (cx >= 0 && cx < this.width && cy >= 0 && cy < this.height) {
      if (this.lockedMask[cy * this.width + cx] === 1) {
        hits += 3;
      }
    }

    if (hits > 0) {
      colliding = true;
      const len = Math.hypot(normalX, normalY);
      if (len > 0.001) {
        normalX /= len;
        normalY /= len;
      } else {
        normalX = 0;
        normalY = -1;
      }
      overlap = (hits / probes) * radius * 0.85 + 2;
    }

    return {
      colliding,
      normalX,
      normalY,
      penetration: overlap
    };
  }

  raycast(x1, y1, x2, y2) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const stepSize = 4;
    const steps = Math.ceil(dist / stepSize);

    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;

    let currX = x1;
    let currY = y1;

    for (let i = 0; i <= steps; i++) {
      if (this.isGamePointSolid(currX, currY)) {
        return {
          hit: true,
          hitX: currX,
          hitY: currY,
          distance: Math.hypot(currX - x1, currY - y1)
        };
      }
      currX += dx;
      currY += dy;
    }

    return {
      hit: false,
      hitX: x2,
      hitY: y2,
      distance: dist
    };
  }
}
