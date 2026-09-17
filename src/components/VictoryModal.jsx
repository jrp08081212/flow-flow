import React from 'react';

export default function VictoryModal({ isOpen, onRestart, onSelectLevel }) {
  if (!isOpen) return null;

  return (
    <div className="victory-backdrop">
      <div className="victory-card">
        <div className="victory-badge">NASA ENG-SYS // MISSION CLEARANCE</div>
        <h1 className="victory-title">ALL 5 PHASES COMPLETED</h1>
        <div className="victory-divider"></div>

        <p className="victory-desc">
          You have mastered physical shadow terrain, laser deflection, falling kinetic
          redirection, and multi-axis 15-second gravitational shifts.
        </p>

        <div className="victory-stats-grid">
          <div className="victory-stat-box">
            <span className="stat-num">5 / 5</span>
            <span className="stat-lbl">DIMENSIONS CLEARED</span>
          </div>
          <div className="victory-stat-box">
            <span className="stat-num">100%</span>
            <span className="stat-lbl">SILHOUETTE ACCURACY</span>
          </div>
          <div className="victory-stat-box">
            <span className="stat-num">60 FPS</span>
            <span className="stat-lbl">LOCAL OPTICAL CV</span>
          </div>
        </div>

        <div className="victory-btn-row">
          <button className="victory-btn primary" onClick={() => onRestart()}>
            ↺ REPLAY FROM PHASE 1
          </button>
          <button className="victory-btn secondary" onClick={() => onSelectLevel(2)}>
            ⚡ JUMP TO GRAVITY SHIFTS (LVL 3)
          </button>
        </div>

        <span className="victory-subtext">
          ASSIGNED DESIGN BLUEPRINT: SILHOUETTE-SHIFT // STATUS: MISSION ACCOMPLISHED
        </span>
      </div>
    </div>
  );
}
