/**
 * PhysicsEngine.js
 * 
 * Physics simulator for SILHOUETTE-SHIFT (4-Phase Architecture).
 * - Enforces Constant-Movement Rule: idleTimer triggers explosion if standing still > idleTimeout.
 * - Resolves collisions against static platforms and locked silhouette terrain.
 * - Evaluates laser raycasting and occlusion against locked terrain.
 * - Simulates falling boulder hazards that bounce off locked terrain and crush creature.
 */

export class PhysicsEngine {
  constructor(options = {}) {
    this.gameWidth = options.gameWidth || 960;
    this.gameHeight = options.gameHeight || 600;

    // Gravity vector
    this.gravityMagnitude = 920;
    this.gravityX = 0;
    this.gravityY = this.gravityMagnitude;

    // Up and right vectors
    this.upX = 0;
    this.upY = -1;
    this.rightX = 1;
    this.rightY = 0;
  }

  setOrientation(rotationAngle, mirrorX = false, mirrorY = false) {
    const baseGx = Math.sin(rotationAngle);
    const baseGy = Math.cos(rotationAngle);

    let gx = baseGx * (mirrorX ? -1 : 1);
    let gy = baseGy * (mirrorY ? -1 : 1);

    this.gravityX = gx * this.gravityMagnitude;
    this.gravityY = gy * this.gravityMagnitude;

    const len = Math.hypot(this.gravityX, this.gravityY) || 1;
    this.upX = -this.gravityX / len;
    this.upY = -this.gravityY / len;

    this.rightX = -this.upY;
    this.rightY = this.upX;
  }

  /**
   * Updates light-creature and enforces constant-movement rule.
   */
  updateCreature(creature, inputs, platforms, silhouetteTracker, dt, sfx, particleSystem, idleTimeout = 3.0) {
    if (!creature.alive) return;

    // 1. CONSTANT-MOVEMENT IDLE MONITOR
    const hasInput = inputs.left || inputs.right || inputs.up || inputs.down;
    const currentSpeed = Math.hypot(creature.vx, creature.vy);

    if (!hasInput && currentSpeed < 15) {
      creature.idleTimer += dt;
    } else {
      creature.idleTimer = Math.max(0, creature.idleTimer - dt * 2.0); // Recover quickly when moving
    }

    // Check warning threshold (T - 1.0s)
    if (creature.idleTimer >= idleTimeout - 1.0) {
      creature.isWarningIdle = true;
    } else {
      creature.isWarningIdle = false;
    }

    // Explode if idle threshold exceeded!
    if (creature.idleTimer >= idleTimeout) {
      creature.explode(particleSystem, sfx);
      return { lost: true, reason: 'IDLE_TIMEOUT' };
    }

    // 2. Physics & Kinematics
    creature.vx += this.gravityX * dt;
    creature.vy += this.gravityY * dt;

    let localVx = creature.vx * this.rightX + creature.vy * this.rightY;
    let localVy = creature.vx * this.upX + creature.vy * this.upY;

    const moveSpeed = 260;
    const accel = creature.isGrounded ? 1900 : 1200;
    const friction = creature.isGrounded ? 0.82 : 0.94;

    let targetMove = 0;
    if (inputs.left) targetMove -= 1;
    if (inputs.right) targetMove += 1;

    if (targetMove !== 0) {
      localVx += targetMove * accel * dt;
      if (Math.abs(localVx) > moveSpeed) {
        localVx = Math.sign(localVx) * moveSpeed;
      }
    } else {
      localVx *= friction;
    }

    // Coyote & Jump Buffer
    if (creature.isGrounded) {
      creature.coyoteTimer = 0.12;
    } else {
      creature.coyoteTimer -= dt;
    }

    if (inputs.jumpBuffered) {
      creature.jumpBufferTimer = 0.15;
    } else {
      creature.jumpBufferTimer -= dt;
    }

    if (creature.jumpBufferTimer > 0 && creature.coyoteTimer > 0) {
      localVy = 460;
      creature.jumpBufferTimer = 0;
      creature.coyoteTimer = 0;
      creature.isGrounded = false;
      if (sfx) sfx.playJump();
    }

    creature.vx = localVx * this.rightX + localVy * this.upX;
    creature.vy = localVx * this.rightY + localVy * this.upY;

    creature.x += creature.vx * dt;
    creature.y += creature.vy * dt;

    let wasGrounded = creature.isGrounded;
    creature.isGrounded = false;

    // 3. Static Platforms Collision
    platforms.forEach(plat => {
      this.resolveCircleAABB(creature, plat, particleSystem, sfx);
    });

    if (!creature.alive) {
      return { lost: true, reason: 'HAZARD' };
    }

    // 4. Locked Silhouette Collision (Standing on arms / body terrain)
    if (silhouetteTracker) {
      const col = silhouetteTracker.checkCircleCollision(creature.x, creature.y, creature.radius);
      if (col.colliding) {
        creature.x += col.normalX * col.penetration;
        creature.y += col.normalY * col.penetration;

        const vDotN = creature.vx * col.normalX + creature.vy * col.normalY;
        if (vDotN < 0) {
          creature.vx -= vDotN * col.normalX * 1.1;
          creature.vy -= vDotN * col.normalY * 1.1;
        }

        const normalDotUp = col.normalX * this.upX + col.normalY * this.upY;
        if (normalDotUp > 0.4) {
          creature.isGrounded = true;
          if (!wasGrounded && sfx) {
            sfx.playSilhouetteBounce();
          }
        }
      }
    }

    // World Boundary Constraints
    const pad = creature.radius;
    if (creature.x < pad) { creature.x = pad; creature.vx = Math.max(0, creature.vx); }
    if (creature.x > this.gameWidth - pad) { creature.x = this.gameWidth - pad; creature.vx = Math.min(0, creature.vx); }
    if (creature.y < pad) { creature.y = pad; creature.vy = Math.max(0, creature.vy); }
    if (creature.y > this.gameHeight - pad) {
      creature.y = this.gameHeight - pad;
      creature.vy = 0;
      if (this.upY < -0.5) creature.isGrounded = true;
    }

    // Squash / Stretch
    if (!wasGrounded && creature.isGrounded) {
      creature.squash = 0.65;
      if (sfx) sfx.playLand();
    } else {
      creature.squash += (1 - creature.squash) * 12 * dt;
    }

    return { lost: false };
  }

  resolveCircleAABB(entity, plat, particleSystem = null, sfx = null) {
    const closestX = Math.max(plat.x, Math.min(entity.x, plat.x + plat.width));
    const closestY = Math.max(plat.y, Math.min(entity.y, plat.y + plat.height));

    const distX = entity.x - closestX;
    const distY = entity.y - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq < entity.radius * entity.radius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const nx = distX / dist;
      const ny = distY / dist;
      const overlap = entity.radius - dist;

      if (plat.isHazard && entity.kill) {
        entity.kill(particleSystem, sfx, 'HAZARD');
        return;
      }

      entity.x += nx * overlap;
      entity.y += ny * overlap;

      const vDotN = entity.vx * nx + entity.vy * ny;
      if (vDotN < 0) {
        entity.vx -= vDotN * nx;
        entity.vy -= vDotN * ny;
      }

      const dotUp = nx * this.upX + ny * this.upY;
      if (dotUp > 0.5) {
        entity.isGrounded = true;
      }
    }
  }

  /**
   * Updates laser occlusion against locked silhouette terrain.
   */
  updateLaser(laser, creature, platforms, silhouetteTracker, particleSystem = null, sfx = null) {
    if (!laser.active) return;

    let targetX = laser.x2;
    let targetY = laser.y2;

    // Raycast against static platforms
    platforms.forEach(plat => {
      const hit = this.rayAABBIntersection(laser.x1, laser.y1, targetX, targetY, plat);
      if (hit) {
        targetX = hit.x;
        targetY = hit.y;
      }
    });

    // Raycast against locked silhouette terrain!
    if (silhouetteTracker) {
      const silHit = silhouetteTracker.raycast(laser.x1, laser.y1, targetX, targetY);
      if (silHit.hit) {
        targetX = silHit.hitX;
        targetY = silHit.hitY;
        laser.blockedByTerrain = true;
      } else {
        laser.blockedByTerrain = false;
      }
    }

    laser.currentX2 = targetX;
    laser.currentY2 = targetY;

    // Test unblocked beam against creature
    if (creature.alive) {
      const distToSegment = this.distPointToSegment(
        creature.x,
        creature.y,
        laser.x1,
        laser.y1,
        laser.currentX2,
        laser.currentY2
      );

      if (distToSegment < creature.radius + 2) {
        creature.kill(particleSystem, sfx, 'LASER');
      }
    }
  }

  /**
   * Updates falling boulders that bounce off locked terrain.
   */
  updateBoulder(boulder, creature, platforms, silhouetteTracker, dt, particleSystem = null, sfx = null) {
    if (!boulder.active) return;

    boulder.vy += 850 * dt;
    boulder.x += boulder.vx * dt;
    boulder.y += boulder.vy * dt;

    // Platform bounce
    platforms.forEach(plat => {
      this.resolveCircleAABB(boulder, plat);
    });

    // Bounce off locked silhouette terrain!
    if (silhouetteTracker) {
      const col = silhouetteTracker.checkCircleCollision(boulder.x, boulder.y, boulder.radius);
      if (col.colliding) {
        boulder.x += col.normalX * col.penetration;
        boulder.y += col.normalY * col.penetration;

        // Rebound off player's arm/body terrain
        const vDotN = boulder.vx * col.normalX + boulder.vy * col.normalY;
        if (vDotN < 0) {
          boulder.vx -= 1.6 * vDotN * col.normalX;
          boulder.vy -= 1.6 * vDotN * col.normalY;
          if (sfx) sfx.playSilhouetteBounce();
        }
      }
    }

    // Crush creature if it touches boulder
    if (creature.alive) {
      const dist = Math.hypot(creature.x - boulder.x, creature.y - boulder.y);
      if (dist < creature.radius + boulder.radius) {
        creature.kill(particleSystem, sfx, 'BOULDER');
      }
    }

    // Deactivate at screen bottom
    if (boulder.y > this.gameHeight + 50 || boulder.x < -50 || boulder.x > this.gameWidth + 50) {
      boulder.active = false;
      boulder.respawnTimer = boulder.respawnInterval;
    }
  }

  rayAABBIntersection(x1, y1, x2, y2, box) {
    const minX = box.x;
    const maxX = box.x + box.width;
    const minY = box.y;
    const maxY = box.y + box.height;

    const dx = x2 - x1;
    const dy = y2 - y1;

    let tMin = 0;
    let tMax = 1;

    if (Math.abs(dx) > 0.0001) {
      let t1 = (minX - x1) / dx;
      let t2 = (maxX - x1) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    } else if (x1 < minX || x1 > maxX) {
      return null;
    }

    if (Math.abs(dy) > 0.0001) {
      let t1 = (minY - y1) / dy;
      let t2 = (maxY - y1) / dy;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    } else if (y1 < minY || y1 > maxY) {
      return null;
    }

    if (tMin < 0 || tMin > 1) return null;

    return {
      x: x1 + tMin * dx,
      y: y1 + tMin * dy
    };
  }

  distPointToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }
}
