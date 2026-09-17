/**
 * WorldShiftEngine.js
 * 
 * Orchestrates the signature 15-second world rotation and mirroring mechanic.
 * Handles countdown telemetry, pre-shift klaxon warnings, matrix interpolation,
 * chromatic aberration impulse, and gravity vector synchronization.
 */

export class WorldShiftEngine {
  constructor(options = {}) {
    this.interval = 15.0; // 15 seconds between shifts
    this.timer = this.interval;
    this.isActive = true;

    // Shift state
    this.currentRotation = 0; // Current rendered angle (radians)
    this.targetRotation = 0;  // Target angle
    this.currentMirrorX = 1;  // Scale X (-1 or 1)
    this.targetMirrorX = 1;
    this.currentMirrorY = 1;  // Scale Y (-1 or 1)
    this.targetMirrorY = 1;

    // Warning stage (last 3 seconds)
    this.warningBeepTracker = 0;
    this.isWarning = false;
    this.nextShiftType = 'ROTATE_90_CW'; // Pre-calculated next shift

    // Screen Shake & Distortion Impulse
    this.shakeIntensity = 0;
    this.chromaticAberration = 0;

    // Callback on shift
    this.onShift = null;

    // Shift sequence pool
    this.possibleShifts = [
      { type: 'ROTATE_90_CW', name: 'ROTATE 90° CW', rotDelta: Math.PI / 2, mirrorX: false, mirrorY: false },
      { type: 'MIRROR_HORIZONTAL', name: 'MIRROR HORIZONTAL', rotDelta: 0, mirrorX: true, mirrorY: false },
      { type: 'ROTATE_90_CCW', name: 'ROTATE 90° CCW', rotDelta: -Math.PI / 2, mirrorX: false, mirrorY: false },
      { type: 'ROTATE_180', name: 'GRAVITATIONAL INVERSION 180°', rotDelta: Math.PI, mirrorX: false, mirrorY: false },
      { type: 'MIRROR_VERTICAL', name: 'MIRROR VERTICAL', rotDelta: 0, mirrorX: false, mirrorY: true }
    ];
    this.shiftIndex = 0;
    this.prepareNextShift();
  }

  reset() {
    this.timer = this.interval;
    this.currentRotation = 0;
    this.targetRotation = 0;
    this.currentMirrorX = 1;
    this.targetMirrorX = 1;
    this.currentMirrorY = 1;
    this.targetMirrorY = 1;
    this.shakeIntensity = 0;
    this.chromaticAberration = 0;
    this.warningBeepTracker = 0;
    this.isWarning = false;
    this.shiftIndex = 0;
    this.prepareNextShift();
  }

  prepareNextShift() {
    const shift = this.possibleShifts[this.shiftIndex % this.possibleShifts.length];
    this.nextShift = shift;
  }

  update(dt, sfx, physicsEngine) {
    // Dampen shake & chromatic aberration
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 25);
    }
    if (this.chromaticAberration > 0) {
      this.chromaticAberration = Math.max(0, this.chromaticAberration - dt * 2.5);
    }

    // Smoothly interpolate current rotation & mirror towards targets
    const lerpSpeed = 10;
    this.currentRotation += (this.targetRotation - this.currentRotation) * Math.min(1, dt * lerpSpeed);
    this.currentMirrorX += (this.targetMirrorX - this.currentMirrorX) * Math.min(1, dt * lerpSpeed);
    this.currentMirrorY += (this.targetMirrorY - this.currentMirrorY) * Math.min(1, dt * lerpSpeed);

    if (!this.isActive) return;

    this.timer -= dt;

    // Check warning threshold (< 3.0s)
    if (this.timer <= 3.0 && this.timer > 0) {
      this.isWarning = true;
      const secondMark = Math.ceil(this.timer);
      if (secondMark !== this.warningBeepTracker) {
        this.warningBeepTracker = secondMark;
        if (sfx) sfx.playShiftWarning(secondMark);
        this.shakeIntensity = 3;
      }
    } else {
      this.isWarning = false;
      this.warningBeepTracker = 0;
    }

    // Trigger Shift!
    if (this.timer <= 0) {
      this.executeShift(sfx, physicsEngine);
    }
  }

  executeShift(sfx, physicsEngine) {
    const shift = this.nextShift;

    // Apply rotation delta
    this.targetRotation += shift.rotDelta;
    // Normalize target angle
    this.targetRotation = (this.targetRotation % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

    // Apply mirroring
    if (shift.mirrorX) {
      this.targetMirrorX = this.targetMirrorX === 1 ? -1 : 1;
    }
    if (shift.mirrorY) {
      this.targetMirrorY = this.targetMirrorY === 1 ? -1 : 1;
    }

    // Impulse effects
    this.shakeIntensity = 18;
    this.chromaticAberration = 1.0;
    if (sfx) sfx.playRealityShift();

    // Update physics engine orientation
    if (physicsEngine) {
      physicsEngine.setOrientation(
        this.targetRotation,
        this.targetMirrorX < 0,
        this.targetMirrorY < 0
      );
    }

    // Reset timer & prepare next shift
    this.timer = this.interval;
    this.shiftIndex++;
    this.prepareNextShift();

    if (this.onShift) {
      this.onShift(shift);
    }
  }

  /**
   * Applies the world transform matrix (rotation, mirroring, center pivot, screen shake) to a canvas context.
   */
  applyTransform(ctx, width, height) {
    ctx.save();

    // Apply screen shake
    if (this.shakeIntensity > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(sx, sy);
    }

    // Transform around canvas center
    const cx = width * 0.5;
    const cy = height * 0.5;
    ctx.translate(cx, cy);

    ctx.rotate(this.currentRotation);
    ctx.scale(this.currentMirrorX, this.currentMirrorY);

    ctx.translate(-cx, -cy);
  }

  restoreTransform(ctx) {
    ctx.restore();
  }
}
