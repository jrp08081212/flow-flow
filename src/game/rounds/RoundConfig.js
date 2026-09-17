/**
 * RoundConfig.js
 * 
 * Centralized round progression config for SILHOUETTE-SHIFT.
 * Supports escalating difficulty knobs:
 * - Preview duration (shrinking from 20s down to 10s)
 * - Pose capture duration (fixed 15s)
 * - Idle-movement timeout (3.0s down to 2.0s)
 * - Hazard count (lasers, gaps, falling boulders)
 * - Mid-run world rotation / mirroring modifiers in later rounds
 * - Multi-pose terrain sequencing in later rounds
 */

export const ROUNDS = [
  {
    roundNumber: 1,
    title: 'THE INCEPTION CHASM',
    difficulty: 'INITIATE',
    hint: 'Form an arm bridge to cross the void chasm.',
    previewDuration: 18.0,
    captureDuration: 15.0,
    lockinDuration: 2.2,
    idleTimeout: 3.0,
    multiPose: false,
    midRunShift: null,
    creatureStart: { x: 100, y: 350 },
    portal: { x: 860, y: 350 },
    platforms: [
      { x: 20, y: 400, width: 220, height: 200 },
      { x: 720, y: 400, width: 220, height: 200 },
      { x: 240, y: 580, width: 480, height: 20, isHazard: true } // deadly abyss
    ],
    lasers: [],
    fallingObjects: []
  },
  {
    roundNumber: 2,
    title: 'DEFENSE CORRIDOR',
    difficulty: 'STANDARD',
    hint: 'Raise your hands high to block the deadly laser cutter.',
    previewDuration: 16.0,
    captureDuration: 15.0,
    lockinDuration: 2.2,
    idleTimeout: 3.0,
    multiPose: false,
    midRunShift: null,
    creatureStart: { x: 80, y: 500 },
    portal: { x: 880, y: 500 },
    platforms: [
      { x: 20, y: 550, width: 920, height: 50 },
      { x: 20, y: 0, width: 920, height: 50 },
      { x: 440, y: 460, width: 80, height: 20 }
    ],
    lasers: [
      { x1: 340, y1: 50, x2: 340, y2: 550, color: '#ff2a6d' },
      { x1: 620, y1: 50, x2: 620, y2: 550, color: '#ff2a6d' }
    ],
    fallingObjects: []
  },
  {
    roundNumber: 3,
    title: 'KINETIC DEFLECTION',
    difficulty: 'TACTICAL',
    hint: 'Angle your torso/arms to deflect falling energy spheres away from the path.',
    previewDuration: 14.0,
    captureDuration: 15.0,
    lockinDuration: 2.2,
    idleTimeout: 3.0,
    multiPose: false,
    midRunShift: null,
    creatureStart: { x: 90, y: 490 },
    portal: { x: 870, y: 490 },
    platforms: [
      { x: 20, y: 540, width: 920, height: 60 },
      { x: 20, y: 0, width: 920, height: 50 }
    ],
    lasers: [
      { x1: 720, y1: 50, x2: 720, y2: 540, color: '#ff2a6d' }
    ],
    fallingObjects: [
      { id: 1, spawnX: 380, spawnY: 60, radius: 16, respawnInterval: 3.2, speed: 220 },
      { id: 2, spawnX: 520, spawnY: 60, radius: 16, respawnInterval: 3.8, speed: 240 }
    ]
  },
  {
    roundNumber: 4,
    title: 'ROTATIONAL DESTABILIZATION',
    difficulty: 'ADVANCED',
    hint: 'WARNING: The world will rotate 90° clockwise mid-run at 7 seconds!',
    previewDuration: 12.0,
    captureDuration: 15.0,
    lockinDuration: 2.2,
    idleTimeout: 2.8,
    multiPose: false,
    midRunShift: {
      triggerTime: 7.0, // 7 seconds into Phase 4 play
      type: 'ROTATE_90_CW',
      name: '90° CLOCKWISE GRAVITY WARP',
      rotDelta: Math.PI / 2,
      mirrorX: false
    },
    creatureStart: { x: 120, y: 240 },
    portal: { x: 840, y: 480 },
    platforms: [
      { x: 60, y: 300, width: 180, height: 30 },
      { x: 380, y: 350, width: 200, height: 30 },
      { x: 720, y: 530, width: 180, height: 30 },
      { x: 240, y: 580, width: 480, height: 20, isHazard: true }
    ],
    lasers: [
      { x1: 580, y1: 80, x2: 580, y2: 480, color: '#ff2a6d' }
    ],
    fallingObjects: []
  },
  {
    roundNumber: 5,
    title: 'MULTI-POSE CONVERGENCE',
    difficulty: 'EXPERT',
    hint: 'MULTI-POSE: Strike Pose A (0-7.5s) on left, then Pose B (7.5-15s) on right!',
    previewDuration: 12.0,
    captureDuration: 15.0,
    lockinDuration: 2.4,
    idleTimeout: 2.5,
    multiPose: true, // Buffers dual poses across 15s window into combined terrain
    midRunShift: null,
    creatureStart: { x: 80, y: 380 },
    portal: { x: 880, y: 220 },
    platforms: [
      { x: 20, y: 430, width: 160, height: 40 },
      { x: 420, y: 500, width: 120, height: 30 },
      { x: 760, y: 270, width: 180, height: 30 },
      { x: 180, y: 580, width: 580, height: 20, isHazard: true }
    ],
    lasers: [
      { x1: 640, y1: 60, x2: 640, y2: 520, color: '#ff2a6d' }
    ],
    fallingObjects: [
      { id: 1, spawnX: 300, spawnY: 50, radius: 15, respawnInterval: 3.5, speed: 200 }
    ]
  },
  {
    roundNumber: 6,
    title: 'THE MIRROR LABYRINTH',
    difficulty: 'MASTER',
    hint: 'WARNING: The entire world will mirror horizontally at 6 seconds!',
    previewDuration: 10.0,
    captureDuration: 15.0,
    lockinDuration: 2.2,
    idleTimeout: 2.5,
    multiPose: true,
    midRunShift: {
      triggerTime: 6.0,
      type: 'MIRROR_HORIZONTAL',
      name: 'DIMENSIONAL HORIZONTAL MIRROR',
      rotDelta: 0,
      mirrorX: true
    },
    creatureStart: { x: 100, y: 460 },
    portal: { x: 860, y: 150 },
    platforms: [
      { x: 40, y: 510, width: 200, height: 30 },
      { x: 380, y: 360, width: 200, height: 30 },
      { x: 720, y: 200, width: 200, height: 30 }
    ],
    lasers: [
      { x1: 300, y1: 50, x2: 300, y2: 480, color: '#ff2a6d' },
      { x1: 660, y1: 50, x2: 660, y2: 480, color: '#ff2a6d' }
    ],
    fallingObjects: [
      { id: 1, spawnX: 500, spawnY: 60, radius: 16, respawnInterval: 3.0, speed: 220 }
    ]
  },
  {
    roundNumber: 7,
    title: 'APEX SINGULARITY',
    difficulty: 'CHAMPIONSHIP',
    hint: 'FINAL TRIAL: 2.0s Idle limit + 180° Inversion at 8 seconds + cascading hazards!',
    previewDuration: 10.0,
    captureDuration: 15.0,
    lockinDuration: 2.5,
    idleTimeout: 2.0, // Tightest idle window
    multiPose: true,
    midRunShift: {
      triggerTime: 8.0,
      type: 'ROTATE_180',
      name: '180° GRAVITATIONAL INVERSION',
      rotDelta: Math.PI,
      mirrorX: false
    },
    creatureStart: { x: 80, y: 480 },
    portal: { x: 880, y: 110 },
    platforms: [
      { x: 20, y: 530, width: 180, height: 30 },
      { x: 380, y: 300, width: 200, height: 25 },
      { x: 760, y: 160, width: 180, height: 25 },
      { x: 200, y: 580, width: 560, height: 20, isHazard: true }
    ],
    lasers: [
      { x1: 280, y1: 50, x2: 280, y2: 500, color: '#ff2a6d' },
      { x1: 680, y1: 50, x2: 680, y2: 500, color: '#ff2a6d' }
    ],
    fallingObjects: [
      { id: 1, spawnX: 200, spawnY: 50, radius: 15, respawnInterval: 2.8, speed: 240 },
      { id: 2, spawnX: 600, spawnY: 50, radius: 15, respawnInterval: 3.2, speed: 240 }
    ]
  }
];
