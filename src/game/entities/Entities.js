/**
 * Entities.js
 * 
 * Game entities for SILHOUETTE-SHIFT (4-Phase Architecture):
 * - LightCreature (with constant-movement idle timer & warning pulse)
 * - Laser (deadly beam occluded by locked silhouette terrain)
 * - FallingBoulder (physical hazards deflectable by locked terrain)
 * - Portal (swirling exit gate to the next round)
 * - ParticleSystem (reactive sparks, dust, trails, and distortion bursts)
 */

export class LightCreature {
  constructor(x, y) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 11;
    this.alive = true;
    this.isGrounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.squash = 1.0;
    this.facingRight = true;
    this.respawnTimer = 0;
    this.trail = [];
    this.eyeBlinkTimer = 2.5;
    this.isBlinking = false;

    // Constant-movement rule metrics
    this.idleTimer = 0; // seconds with no directional movement
    this.isWarningIdle = false;
    this.causeOfDeath = null; // 'IDLE_TIMEOUT' | 'LASER' | 'HAZARD' | 'BOULDER'
  }

  respawn() {
    this.x = this.startX;
    this.y = this.startY;
    this.vx = 0;
    this.vy = 0;
    this.alive = true;
    this.isGrounded = false;
    this.squash = 1.0;
    this.trail = [];
    this.idleTimer = 0;
    this.isWarningIdle = false;
    this.causeOfDeath = null;
  }

  kill(particleSystem, sfx, cause = 'HAZARD') {
    if (!this.alive) return;
    this.alive = false;
    this.causeOfDeath = cause;
    if (sfx) sfx.playLaserBurn();
    if (particleSystem) {
      particleSystem.burst(this.x, this.y, 40, '#ff2a6d', 280);
      particleSystem.burst(this.x, this.y, 25, '#00f0ff', 320);
      particleSystem.burst(this.x, this.y, 15, '#ffffff', 380);
    }
  }

  explode(particleSystem, sfx) {
    if (!this.alive) return;
    this.kill(particleSystem, sfx, 'IDLE_TIMEOUT');
    if (sfx) sfx.playRealityShift();
    if (particleSystem) {
      particleSystem.burst(this.x, this.y, 60, '#ff2a6d', 420);
      particleSystem.burst(this.x, this.y, 40, '#00f0ff', 480);
    }
  }

  update(dt, particleSystem) {
    if (!this.alive) return;

    if (Math.abs(this.vx) > 10) {
      this.facingRight = this.vx > 0;
    }

    // Update trail
    this.trail.unshift({ x: this.x, y: this.y, alpha: 0.85 });
    if (this.trail.length > 8) this.trail.pop();
    this.trail.forEach(pt => { pt.alpha *= 0.78; });

    // Eye blinking
    this.eyeBlinkTimer -= dt;
    if (this.eyeBlinkTimer <= 0) {
      this.isBlinking = true;
      if (this.eyeBlinkTimer <= -0.12) {
        this.isBlinking = false;
        this.eyeBlinkTimer = 2.0 + Math.random() * 2.0;
      }
    }

    // Sparkle trail (flickers rapidly when idle warning is active)
    const particleRate = this.isWarningIdle ? 0.75 : 0.35;
    if (particleSystem && Math.random() < particleRate) {
      particleSystem.add(
        this.x + (Math.random() - 0.5) * 6,
        this.y + (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 20 - this.vx * 0.1,
        (Math.random() - 0.5) * 20 - this.vy * 0.1,
        0.4,
        this.isWarningIdle ? '#ff2a6d' : '#00f0ff',
        this.isWarningIdle ? 4 : 3
      );
    }
  }

  render(ctx) {
    if (!this.alive) return;

    // Warning flicker when near idle timeout
    if (this.isWarningIdle && Math.sin(Date.now() * 0.035) > 0.3) {
      // Flash red warning ghost
      ctx.save();
      ctx.fillStyle = 'rgba(255, 42, 109, 0.4)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw trail
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const pt = this.trail[i];
      const trailRadius = this.radius * (1 - i / this.trail.length) * 0.7;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, Math.max(1, trailRadius), 0, Math.PI * 2);
      ctx.fillStyle = this.isWarningIdle
        ? `rgba(255, 42, 109, ${pt.alpha * 0.5})`
        : `rgba(0, 240, 255, ${pt.alpha * 0.4})`;
      ctx.fill();
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // Squash and stretch deformation
    const stretch = 1 / this.squash;
    ctx.scale(stretch, this.squash);

    // Outer glow aura
    const auraColor = this.isWarningIdle ? 'rgba(255, 42, 109, 0.95)' : 'rgba(0, 240, 255, 0.95)';
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius * 2.2);
    grad.addColorStop(0, auraColor);
    grad.addColorStop(0.45, this.isWarningIdle ? 'rgba(255, 42, 109, 0.4)' : 'rgba(0, 240, 255, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Solid bright core
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = this.isWarningIdle ? '#ff2a6d' : '#00f0ff';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Rim outline
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.isWarningIdle ? '#ff2a6d' : '#00f0ff';
    ctx.stroke();

    // Cute cyber eye
    if (!this.isBlinking) {
      const eyeOffsetX = this.facingRight ? 3.5 : -3.5;
      ctx.fillStyle = '#061018';
      ctx.beginPath();
      ctx.ellipse(eyeOffsetX, -1.5, 2.2, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glint highlight
      ctx.fillStyle = this.isWarningIdle ? '#ff2a6d' : '#00f0ff';
      ctx.beginPath();
      ctx.arc(eyeOffsetX + (this.facingRight ? 0.8 : -0.8), -2.6, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class Laser {
  constructor(x1, y1, x2, y2, color = '#ff2a6d', pulseOffset = 0) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.currentX2 = x2;
    this.currentY2 = y2;
    this.color = color;
    this.pulseOffset = pulseOffset;
    this.active = true;
    this.blockedByTerrain = false;
    this.time = 0;
  }

  update(dt, particleSystem) {
    this.time += dt;

    if (this.blockedByTerrain && particleSystem && Math.random() < 0.75) {
      particleSystem.add(
        this.currentX2,
        this.currentY2,
        (Math.random() - 0.5) * 140,
        (Math.random() - 0.5) * 140,
        0.35,
        this.color,
        2.5
      );
    }
  }

  render(ctx) {
    if (!this.active) return;

    const pulse = Math.sin(this.time * 12 + this.pulseOffset) * 0.5 + 0.5;

    // Laser Emitter Base
    ctx.fillStyle = '#1a2634';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x1, this.y1, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.lineCap = 'round';

    // Outer Glow
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 7 + pulse * 3;
    ctx.globalAlpha = 0.35 + pulse * 0.2;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.currentX2, this.currentY2);
    ctx.stroke();

    // Inner White Core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 + pulse * 1.5;
    ctx.globalAlpha = 0.95;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.currentX2, this.currentY2);
    ctx.stroke();

    // Impact flare
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.currentX2, this.currentY2, 5 + pulse * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class FallingBoulder {
  constructor(config = {}) {
    this.id = config.id || 1;
    this.spawnX = config.spawnX || 400;
    this.spawnY = config.spawnY || 60;
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vx = (Math.random() - 0.5) * 40;
    this.vy = config.speed || 220;
    this.radius = config.radius || 15;
    this.respawnInterval = config.respawnInterval || 3.5;
    this.respawnTimer = 0;
    this.active = true;
    this.glowColor = '#ff2a6d';
    this.rot = 0;
  }

  respawn() {
    this.x = this.spawnX + (Math.random() - 0.5) * 40;
    this.y = this.spawnY;
    this.vx = (Math.random() - 0.5) * 60;
    this.vy = 220;
    this.active = true;
    this.respawnTimer = 0;
  }

  update(dt, particleSystem) {
    if (!this.active) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    this.rot += dt * 5;

    if (particleSystem && Math.random() < 0.25) {
      particleSystem.add(
        this.x + (Math.random() - 0.5) * 6,
        this.y + (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        0.3,
        this.glowColor,
        2.5
      );
    }
  }

  render(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Glowing red hazard aura
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius * 2);
    grad.addColorStop(0, 'rgba(255, 42, 109, 0.9)');
    grad.addColorStop(0.5, 'rgba(255, 42, 109, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Solid core
    ctx.fillStyle = '#1e1422';
    ctx.strokeStyle = '#ff2a6d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sharp geometric spikes inside
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = this.rot + (i * Math.PI) / 2;
      ctx.moveTo(Math.cos(a) * (this.radius * 0.3), Math.sin(a) * (this.radius * 0.3));
      ctx.lineTo(Math.cos(a) * (this.radius * 0.85), Math.sin(a) * (this.radius * 0.85));
    }
    ctx.stroke();

    ctx.restore();
  }
}

export class Portal {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 28;
    this.rotation = 0;
    this.isOpen = true;
  }

  update(dt, creature, onReachExit, particleSystem) {
    this.rotation += dt * 3.5;

    if (particleSystem && Math.random() < 0.4) {
      const angle = Math.random() * Math.PI * 2;
      const dist = this.radius * 1.5;
      particleSystem.add(
        this.x + Math.cos(angle) * dist,
        this.y + Math.sin(angle) * dist,
        -Math.cos(angle) * 70,
        -Math.sin(angle) * 70,
        0.5,
        '#00f0ff',
        3
      );
    }

    if (creature.alive) {
      const dist = Math.hypot(creature.x - this.x, creature.y - this.y);
      if (dist < this.radius + creature.radius * 0.5) {
        onReachExit();
      }
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const color = '#00f0ff';

    // Outer vortex rings
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Counter-rotating segmented rings
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = this.rotation + (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.7, a, a + 0.6);
      ctx.stroke();
    }

    // Swirling center singularity
    const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, this.radius * 0.85);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.6, 'rgba(0, 240, 255, 0.5)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.85, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class ParticleSystem {
  constructor(maxParticles = 800) {
    this.maxParticles = maxParticles;
    this.particles = [];
  }

  add(x, y, vx, vy, life, color = '#00f0ff', size = 3) {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    this.particles.push({
      x,
      y,
      vx,
      vy,
      life,
      maxLife: life,
      color,
      size
    });
  }

  burst(x, y, count = 25, color = '#00f0ff', speed = 200) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const spd = speed * (0.4 + Math.random() * 0.8);
      this.add(
        x,
        y,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        0.3 + Math.random() * 0.4,
        color,
        2 + Math.random() * 3
      );
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
  }

  render(ctx) {
    ctx.save();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }
}
