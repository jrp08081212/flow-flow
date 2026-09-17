import React from 'react';

export default function GameHUD({
  gameState,
  onOpenCalibration,
  onSelectRound,
  onRestartRound,
  onToggleMute,
  onToggleSource,
  onSkipPreview,
  onToggleFullscreen
}) {
  const {
    roundIndex = 0,
    totalRounds = 7,
    roundConfig = null,
    currentPhase = 'PREVIEW',
    phaseTimer = 0,
    isWebcamActive = false,
    isSimulation = false,
    isMuted = false
  } = gameState || {};

  return (
    <div className="hud-container">
      {/* Top Bar */}
      <div className="hud-top-bar">
        <div className="hud-title-col">
          <div className="hud-eyebrow">
            <span className="hud-dot"></span>
            SILHOUETTE-SHIFT // NASA BLUEPRINT
          </div>
          <h1 className="hud-main-title">
            ROUND 0{roundIndex + 1}: {roundConfig ? roundConfig.title : 'LOADING'}
          </h1>
        </div>

        {/* Round Quick Nav */}
        <div className="hud-level-nav">
          {[0, 1, 2, 3, 4, 5, 6].map(idx => (
            <button
              key={idx}
              className={`hud-level-btn ${roundIndex === idx ? 'active' : ''}`}
              onClick={() => onSelectRound(idx)}
              title={`Round ${idx + 1}`}
            >
              R{idx + 1}
            </button>
          ))}
        </div>

        {/* Controls & Badges */}
        <div className="hud-actions-col">
          <div className="hud-nasa-badge">
            <span>{roundConfig ? roundConfig.difficulty : 'INITIATE'}</span>
          </div>

          <button
            className={`hud-icon-btn ${isMuted ? 'muted' : ''}`}
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio (M)'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          <button
            className="hud-icon-btn"
            onClick={onRestartRound}
            title="Restart Round (R)"
          >
            ↺
          </button>

          <button
            className="hud-icon-btn"
            onClick={onToggleFullscreen}
            title="Toggle Fullscreen"
          >
            ⛶
          </button>

          <button
            className="hud-btn-highlight"
            onClick={onOpenCalibration}
          >
            ⚙ CALIBRATE
          </button>
        </div>
      </div>

      {/* Sub-Bar: Phase Telemetry & Actions */}
      <div className="hud-sub-bar">
        <div className="hud-directive-box">
          <span className="directive-tag">
            PHASE STATUS: {currentPhase} // CAMERA: {currentPhase === 'CAPTURE' ? '● ON (RECORDING)' : '○ OFF (SECURE)'}
          </span>
          <p className="directive-text">
            {roundConfig ? roundConfig.hint : 'Analyze platform geometry and plan your physical pose.'}
          </p>
        </div>

        <div className="hud-telemetry-box">
          {/* Skip Preview Button during Phase 1 */}
          {currentPhase === 'PREVIEW' && (
            <button className="hud-skip-preview-btn" onClick={onSkipPreview}>
              ⚡ READY? CAPTURE POSE NOW →
            </button>
          )}

          {/* Camera input source indicator */}
          <div className="telemetry-item">
            <span className="telem-label">SENSOR MODE</span>
            <button
              className={`telem-source-pill ${isSimulation ? 'sim' : 'cam'}`}
              onClick={onToggleSource}
            >
              {isSimulation ? '🎭 SHADOW SIMULATOR' : (isWebcamActive ? '📷 LIVE OPTICAL FEED' : '○ CAM STANDBY')}
            </button>
          </div>

          {/* Phase Countdown */}
          <div className="telemetry-item">
            <span className="telem-label">PHASE CLOCK</span>
            <span className="telem-shift-val active">
              {Math.max(0, phaseTimer).toFixed(1)}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
