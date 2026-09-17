/**
 * LevelData.js
 * 
 * Level definitions for SILHOUETTE-SHIFT.
 * Contains platform layout, lasers, falling orbs, receptors, portal goals,
 * and level-specific tutorial directives aligned with the NASA blueprint.
 */

export const LEVELS = [
  {
    id: 1,
    name: 'FIRST EMBODIMENT',
    subtitle: 'THE CHASM BRIDGE',
    directive: 'Void chasm ahead. Raise your arms in front of the camera to form a living bridge for the light-creature.',
    creatureStart: { x: 120, y: 350 },
    portal: { x: 840, y: 350, requiresOrbs: 0 },
    shiftActive: false, // Tutorial: let player learn body terrain first
    platforms: [
      // Left starting ledge
      { x: 40, y: 400, width: 200, height: 200, label: 'LEDGE_A' },
      // Right destination ledge
      { x: 720, y: 400, width: 200, height: 200, label: 'LEDGE_B' },
      // Void pit spikes/decor at bottom
      { x: 240, y: 580, width: 480, height: 20, isHazard: true }
    ],
    lasers: [],
    orbs: [],
    receptors: []
  },
  {
    id: 2,
    name: 'PHOTON CUTTER',
    subtitle: 'SHADOW SHIELD PROTOCOL',
    directive: 'High-energy lasers block the corridor. Hold up your hands/arms to block the beams and create safe shadows.',
    creatureStart: { x: 100, y: 490 },
    portal: { x: 860, y: 490, requiresOrbs: 0 },
    shiftActive: false,
    platforms: [
      // Ground floor
      { x: 40, y: 540, width: 880, height: 60 },
      // Top ceiling
      { x: 40, y: 0, width: 880, height: 60 },
      // Intermediate step
      { x: 440, y: 460, width: 80, height: 20 }
    ],
    lasers: [
      // Laser 1 guarding left-mid
      { x1: 320, y1: 60, x2: 320, y2: 540, color: '#ff2a6d' },
      // Laser 2 guarding right-mid
      { x1: 640, y1: 60, x2: 640, y2: 540, color: '#ff2a6d' }
    ],
    orbs: [],
    receptors: []
  },
  {
    id: 3,
    name: 'GRAVITATIONAL AWAKENING',
    subtitle: 'THE 15-SECOND SHIFT',
    directive: 'Reality rotates every 15 seconds! Catch the falling energy orb with your body and channel it into the receptor.',
    creatureStart: { x: 150, y: 220 },
    portal: { x: 810, y: 480, requiresOrbs: 1 },
    shiftActive: true, // Signature 15s shift mechanic engaged!
    platforms: [
      // Center floating hub
      { x: 380, y: 320, width: 200, height: 30 },
      // Top-left ledge
      { x: 80, y: 260, width: 160, height: 25 },
      // Bottom-right landing
      { x: 700, y: 520, width: 200, height: 30 },
      // Boundary bumpers
      { x: 40, y: 560, width: 260, height: 25 }
    ],
    lasers: [],
    orbs: [
      { id: 1, x: 480, y: 100, radius: 13 }
    ],
    receptors: [
      { x: 810, y: 320, requiredOrbId: 1 }
    ]
  },
  {
    id: 4,
    name: 'MIRROR PROTOCOL',
    subtitle: 'DIMENSIONAL REFLECTION',
    directive: 'The world mirrors and inverts. Form dynamic angles to deflect orbs while shielding the creature from ceiling cutters.',
    creatureStart: { x: 120, y: 450 },
    portal: { x: 840, y: 140, requiresOrbs: 1 },
    shiftActive: true,
    platforms: [
      // Bottom runway
      { x: 60, y: 510, width: 280, height: 30 },
      // Mid platform
      { x: 400, y: 380, width: 160, height: 25 },
      // Upper right portal perch
      { x: 700, y: 190, width: 200, height: 25 }
    ],
    lasers: [
      { x1: 580, y1: 80, x2: 580, y2: 480, color: '#ff2a6d' }
    ],
    orbs: [
      { id: 1, x: 220, y: 100, radius: 13 }
    ],
    receptors: [
      { x: 480, y: 340, requiredOrbId: 1 }
    ]
  },
  {
    id: 5,
    name: 'SINGULARITY CHASM',
    subtitle: 'APEX EMBODIMENT',
    directive: 'Final simulation test. Synchronize physical poses with multi-axis gravitational warps to reach the singularity.',
    creatureStart: { x: 100, y: 480 },
    portal: { x: 860, y: 100, requiresOrbs: 2 },
    shiftActive: true,
    platforms: [
      { x: 40, y: 530, width: 200, height: 30 },
      { x: 720, y: 530, width: 200, height: 30 },
      { x: 380, y: 260, width: 200, height: 25 },
      { x: 760, y: 150, width: 160, height: 25 }
    ],
    lasers: [
      { x1: 300, y1: 50, x2: 300, y2: 500, color: '#ff2a6d' },
      { x1: 660, y1: 50, x2: 660, y2: 500, color: '#ff2a6d' }
    ],
    orbs: [
      { id: 1, x: 180, y: 80, radius: 13 },
      { id: 2, x: 780, y: 80, radius: 13 }
    ],
    receptors: [
      { x: 420, y: 220, requiredOrbId: 1 },
      { x: 540, y: 220, requiredOrbId: 2 }
    ]
  }
];
