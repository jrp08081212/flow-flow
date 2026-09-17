import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SilhouetteGameCore } from '../game/SilhouetteGameCore';
import GameHUD from './GameHUD';
import CalibrationModal from './CalibrationModal';
import './SilhouetteGame.css';

export default function SilhouetteGame() {
  const canvasRef = useRef(null);
  const gameCoreRef = useRef(null);

  const [gameState, setGameState] = useState({
    roundIndex: 0,
    totalRounds: 7,
    roundConfig: null,
    currentPhase: 'INTRO',
    phaseTimer: 0,
    causeOfDeath: null,
    isWebcamActive: false,
    isSimulation: false,
    puppetPreset: 'bridge',
    isMuted: false
  });

  const [isCalibOpen, setIsCalibOpen] = useState(false);
  const [showBlueprintDetails, setShowBlueprintDetails] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const core = new SilhouetteGameCore(canvasRef.current, (updated) => {
      setGameState(prev => ({ ...prev, ...updated }));
    });
    gameCoreRef.current = core;

    core.init();

    return () => {
      core.destroy();
      gameCoreRef.current = null;
    };
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current || !gameCoreRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    gameCoreRef.current.silhouetteTracker.updatePuppetMouse(normX, normY);
  }, []);

  const handleSelectRound = (idx) => {
    if (gameCoreRef.current) {
      gameCoreRef.current.loadRound(idx);
    }
  };

  const handleRestartRound = () => {
    if (gameCoreRef.current) {
      gameCoreRef.current.restartRound();
    }
  };

  const handleSkipPreview = () => {
    if (gameCoreRef.current) {
      gameCoreRef.current.skipPreview();
    }
  };

  const handleStartRound = () => {
    if (gameCoreRef.current) {
      gameCoreRef.current.startRoundAfterIntro();
    }
  };

  const handleNextRound = () => {
    if (gameCoreRef.current) {
      gameCoreRef.current.nextRound();
    }
  };

  const handleToggleMute = () => {
    if (gameCoreRef.current) {
      gameCoreRef.current.sfx.ensureContext();
      if (!gameCoreRef.current.sfx.isMusicRunning) {
        gameCoreRef.current.sfx.startMusic();
      }
      gameCoreRef.current.sfx.toggleMute();
      setGameState(prev => ({ ...prev, isMuted: gameCoreRef.current.sfx.isMuted }));
    }
  };

  const handleToggleSource = async () => {
    if (!gameCoreRef.current) return;
    const tracker = gameCoreRef.current.silhouetteTracker;
    if (tracker.isSimulation) {
      tracker.setSimulationMode(false);
      if (gameState.currentPhase === 'CAPTURE') {
        await tracker.initWebcam();
      }
    } else {
      tracker.setSimulationMode(true);
    }
    gameCoreRef.current.notifyState();
  };

  const handleToggleFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const { currentPhase, roundConfig, roundIndex, causeOfDeath } = gameState;

  return (
    <div className="silhouette-game-wrapper">
      {/* HUD Header */}
      <GameHUD
        gameState={gameState}
        onOpenCalibration={() => setIsCalibOpen(true)}
        onSelectRound={handleSelectRound}
        onRestartRound={handleRestartRound}
        onToggleMute={handleToggleMute}
        onToggleSource={handleToggleSource}
        onSkipPreview={handleSkipPreview}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Main Viewport Frame */}
      <div className="game-viewport-container">
        <div className="game-canvas-frame">
          <canvas
            ref={canvasRef}
            width={960}
            height={600}
            className="game-canvas"
            onMouseMove={handleMouseMove}
            onClick={handleCanvasClick}
          />

          {/* Phase 2 Overlay Banner */}
          {currentPhase === 'CAPTURE' && (
            <div className="capture-overlay-banner">
              <div className="capture-pulse-dot"></div>
              <span className="capture-text">
                {roundConfig?.multiPose
                  ? (gameState.phaseTimer > 7.5 ? 'POSE 1: STRIKE LEFT FLANK (0-7.5s)' : 'POSE 2: STRIKE RIGHT FLANK (7.5-15s)')
                  : 'CAMERA ACTIVE: STRIKE YOUR POSE TO BUILD SHADOW TERRAIN'}
              </span>
            </div>
          )}

          {/* Controls Strip */}
          <div className="game-control-strip">
            <span className="control-hint">
              <kbd>WASD</kbd> : Move & Jump (Keep Moving!)
            </span>
            <span className="control-hint">
              <kbd>SPACE</kbd> : Jump
            </span>
            <span className="control-hint">
              <kbd>R</kbd> : Restart
            </span>
            <span className="control-hint">
              <kbd>M</kbd> : Mute
            </span>
            <button
              className="blueprint-toggle-btn"
              onClick={() => setShowBlueprintDetails(!showBlueprintDetails)}
            >
              {showBlueprintDetails ? 'HIDE BLUEPRINT SPEC' : 'VIEW NASA BLUEPRINT SPEC'}
            </button>
          </div>
        </div>
      </div>

      {/* NASA Blueprint Drawer */}
      {showBlueprintDetails && (
        <div className="blueprint-drawer">
          <div className="blueprint-card full-width">
            <div className="card-tag">CORE CONCEPT CHANGE (MODIFIED ROUND STRUCTURE):</div>
            <p className="card-text">
              The camera is NOT on during actual gameplay. Each round runs in four strict phases:
              Phase 1 Preview (Camera OFF) → Phase 2 Pose Capture (15s Camera ON) → Phase 3 Terrain Lock-In (Camera OFF) → Phase 4 Play (WASD only, Camera fully OFF). Constant-movement rule: creature explodes if idle for more than 3 seconds!
            </p>
          </div>

          <div className="blueprint-cards-grid">
            <div className="blueprint-card">
              <div className="card-tag cyan">TARGET VIBE & STYLE:</div>
              <p className="card-text cyan">
                A cinematic black-and-white shadow theatre mixed with neon cyan light, reactive particles, dramatic silhouettes, digital distortion, and atmospheric electronic music.
              </p>
            </div>

            <div className="blueprint-card">
              <div className="card-tag amber">MUST-HAVE TECHNICAL FEATURE:</div>
              <p className="card-text amber">
                The player’s real-time webcam silhouette (captured only during the 15-second Phase 2 window) becomes accurate collision geometry that the playable creature can stand on, bounce against, or be blocked by.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="game-footer">
        <div className="footer-telemetry">
          <span>PHASE PIPELINE: 4-STAGE STRICT SEQUENCER</span>
          <span className="divider">|</span>
          <span>CONSTANT-MOTION IDLE RULE: {roundConfig ? roundConfig.idleTimeout : 3.0}s LIMIT</span>
          <span className="divider">|</span>
          <span>PRIVACY: ZERO CLOUD UPLOAD</span>
        </div>

        {currentPhase === 'PREVIEW' ? (
          <button className="proceed-phase-btn" onClick={handleSkipPreview}>
            ⚡ SKIP PREVIEW → CAPTURE POSE (15s)
          </button>
        ) : (
          <button
            className="proceed-phase-btn"
            onClick={() => {
              if (roundIndex < 6) handleSelectRound(roundIndex + 1);
              else handleSelectRound(0);
            }}
          >
            READY TO SUBMIT? PROCEED TO PHASE 3 →
          </button>
        )}
      </footer>

      {/* MODAL 1: Round Intro Card */}
      {currentPhase === 'INTRO' && roundConfig && (
        <div className="calib-backdrop">
          <div className="round-card-modal">
            <div className="round-badge">
              ROUND 0{roundIndex + 1} OF 07 // {roundConfig.difficulty}
            </div>
            <h1 className="round-modal-title">{roundConfig.title}</h1>
            <div className="round-divider"></div>

            <div className="round-directive-box">
              <span className="directive-lbl">MISSION DIRECTIVE:</span>
              <p className="directive-val">{roundConfig.hint}</p>
            </div>

            <div className="round-specs-grid">
              <div className="spec-item">
                <span className="spec-num">{roundConfig.previewDuration}s</span>
                <span className="spec-lbl">PREVIEW (CAM OFF)</span>
              </div>
              <div className="spec-item highlight">
                <span className="spec-num">{roundConfig.captureDuration}s</span>
                <span className="spec-lbl">POSE CAPTURE (CAM ON)</span>
              </div>
              <div className="spec-item alert">
                <span className="spec-num">{roundConfig.idleTimeout}s</span>
                <span className="spec-lbl">MAX IDLE LIMIT</span>
              </div>
              <div className="spec-item">
                <span className="spec-num">{roundConfig.multiPose ? 'MULTI-POSE' : 'SINGLE'}</span>
                <span className="spec-lbl">TERRAIN MODE</span>
              </div>
            </div>

            {roundConfig.midRunShift && (
              <div className="round-warning-callout">
                ⚠ {roundConfig.midRunShift.name} AT {roundConfig.midRunShift.triggerTime}s OF PLAY!
              </div>
            )}

            <button className="round-action-btn primary" onClick={handleStartRound}>
              BEGIN ROUND 0{roundIndex + 1} →
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Round Win Card */}
      {currentPhase === 'WIN' && (
        <div className="calib-backdrop">
          <div className="round-card-modal win">
            <div className="round-badge cyan">ROUND CLEARED // SIGNAL RECEIVED</div>
            <h1 className="round-modal-title">EXIT PORTAL REACHED</h1>
            <div className="round-divider cyan"></div>
            <p className="round-desc">
              Your physical shadow terrain successfully bridged the hazards and sustained the light-creature.
            </p>
            <div className="round-btn-row">
              <button className="round-action-btn primary" onClick={handleNextRound}>
                {roundIndex < 6 ? `PROCEED TO ROUND 0${roundIndex + 2} →` : 'CHAMPIONSHIP CLEARANCE →'}
              </button>
              <button className="round-action-btn secondary" onClick={handleRestartRound}>
                ↺ REPLAY ROUND
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Round Loss Card */}
      {currentPhase === 'LOSE' && (
        <div className="calib-backdrop">
          <div className="round-card-modal lose">
            <div className="round-badge red">TRANSMISSION TERMINATED</div>
            <h1 className="round-modal-title red">
              {causeOfDeath === 'IDLE_TIMEOUT' ? 'LIGHT EXTINGUISHED' : 'CREATURE DESTROYED'}
            </h1>
            <div className="round-divider red"></div>
            <p className="round-desc">
              {causeOfDeath === 'IDLE_TIMEOUT'
                ? `The light-creature stopped moving for more than ${roundConfig?.idleTimeout}s. Constant motion is required to survive!`
                : 'The creature made contact with an unblocked hazard or void chasm. Re-align your pose during capture!'}
            </p>
            <div className="round-btn-row">
              <button className="round-action-btn primary red" onClick={handleRestartRound}>
                ↺ RETRY ROUND 0{roundIndex + 1}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Championship Complete */}
      {currentPhase === 'COMPLETE' && (
        <div className="calib-backdrop">
          <div className="round-card-modal win">
            <div className="round-badge cyan">NASA ASSIGNED BLUEPRINT // FULL CLEARANCE</div>
            <h1 className="round-modal-title">CHAMPIONSHIP CONQUERED</h1>
            <div className="round-divider cyan"></div>
            <p className="round-desc">
              All 7 competition rounds completed across optical pose capture, locked shadow geometry, mid-run gravitational shifts, and the constant-movement gauntlet!
            </p>
            <button className="round-action-btn primary" onClick={() => handleSelectRound(0)}>
              ↺ REPLAY FROM ROUND 1
            </button>
          </div>
        </div>
      )}

      {/* Calibration Modal */}
      <CalibrationModal
        isOpen={isCalibOpen}
        onClose={() => setIsCalibOpen(false)}
        tracker={gameCoreRef.current?.silhouetteTracker}
        onUpdate={() => gameCoreRef.current?.notifyState()}
      />
    </div>
  );
}
