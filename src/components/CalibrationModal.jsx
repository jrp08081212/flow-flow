import React, { useEffect, useRef } from 'react';

export default function CalibrationModal({ isOpen, onClose, tracker, onUpdate }) {
  const previewCanvasRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !tracker) return;

    let animId;
    const renderPreview = () => {
      if (previewCanvasRef.current && tracker.maskCanvas) {
        const pCtx = previewCanvasRef.current.getContext('2d');
        pCtx.clearRect(0, 0, 200, 150);
        pCtx.fillStyle = '#060a10';
        pCtx.fillRect(0, 0, 200, 150);

        // Draw the live binary mask
        pCtx.drawImage(tracker.maskCanvas, 0, 0, 200, 150);

        // Overlay contour border
        pCtx.strokeStyle = '#00f0ff';
        pCtx.lineWidth = 1;
        pCtx.strokeRect(0, 0, 200, 150);
      }
      animId = requestAnimationFrame(renderPreview);
    };

    animId = requestAnimationFrame(renderPreview);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, tracker]);

  if (!isOpen || !tracker) return null;

  return (
    <div className="calib-backdrop" onClick={onClose}>
      <div className="calib-panel" onClick={(e) => e.stopPropagation()}>
        <div className="calib-header">
          <div>
            <span className="calib-badge">VISION SENSOR CALIBRATION</span>
            <h2 className="calib-title">SILHOUETTE GEOMETRY MATRIX</h2>
          </div>
          <button className="calib-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="calib-body">
          {/* Left: Live Mask Preview */}
          <div className="calib-preview-col">
            <div className="calib-canvas-wrapper">
              <canvas ref={previewCanvasRef} width={200} height={150} className="calib-canvas" />
              <div className="calib-scanline"></div>
              <span className="calib-live-tag">
                {tracker.isSimulation ? '● SIMULATION MASK' : (tracker.isWebcamActive ? '● LIVE OPTICAL FEED' : '○ DISCONNECTED')}
              </span>
            </div>

            <div className="calib-actions-row">
              <button
                className="calib-btn primary"
                onClick={() => {
                  tracker.captureBackground();
                  if (onUpdate) onUpdate();
                }}
                disabled={tracker.isSimulation || !tracker.isWebcamActive}
              >
                📸 CAPTURE BACKGROUND (1-CLICK)
              </button>
              <button
                className="calib-btn secondary"
                onClick={() => {
                  tracker.resetBackground();
                  if (onUpdate) onUpdate();
                }}
                disabled={tracker.isSimulation}
              >
                ↺ RESET BASELINE
              </button>
            </div>
          </div>

          {/* Right: Controls & Presets */}
          <div className="calib-controls-col">
            <div className="calib-field">
              <label className="calib-label">INPUT SOURCE</label>
              <div className="calib-toggle-group">
                <button
                  className={`calib-tab-btn ${!tracker.isSimulation ? 'active' : ''}`}
                  onClick={async () => {
                    tracker.setSimulationMode(false);
                    if (!tracker.isWebcamActive) {
                      await tracker.initWebcam();
                    }
                    if (onUpdate) onUpdate();
                  }}
                >
                  📷 LIVE WEBCAM
                </button>
                <button
                  className={`calib-tab-btn ${tracker.isSimulation ? 'active' : ''}`}
                  onClick={() => {
                    tracker.setSimulationMode(true);
                    if (onUpdate) onUpdate();
                  }}
                >
                  🎭 SHADOW SIMULATOR
                </button>
              </div>
            </div>

            {tracker.isSimulation ? (
              <div className="calib-field">
                <label className="calib-label">SIMULATOR POSE PRESET</label>
                <div className="calib-preset-grid">
                  {[
                    { id: 'bridge', name: 'HORIZONTAL BRIDGE', icon: '⎯' },
                    { id: 'shield', name: 'LASER SHIELD', icon: '⛊' },
                    { id: 'funnel', name: 'ORB FUNNEL', icon: 'V' },
                    { id: 'mouse', name: 'MOUSE INTERACTIVE', icon: '🖯' }
                  ].map(preset => (
                    <button
                      key={preset.id}
                      className={`calib-preset-btn ${tracker.puppetState.preset === preset.id ? 'active' : ''}`}
                      onClick={() => {
                        tracker.setPuppetPreset(preset.id);
                        if (onUpdate) onUpdate();
                      }}
                    >
                      <span className="preset-icon">{preset.icon}</span>
                      <span className="preset-name">{preset.name}</span>
                    </button>
                  ))}
                </div>
                <p className="calib-hint">
                  {tracker.puppetState.preset === 'mouse'
                    ? 'Tip: Move cursor over the game canvas to position the physical puppet arm!'
                    : 'The virtual shadow creates continuous physical terrain according to the selected pose.'}
                </p>
              </div>
            ) : (
              <>
                <div className="calib-field">
                  <label className="calib-label">DETECTION ALGORITHM</label>
                  <select
                    className="calib-select"
                    value={tracker.mode}
                    onChange={(e) => {
                      tracker.mode = e.target.value;
                      if (onUpdate) onUpdate();
                    }}
                  >
                    <option value="difference">Background Subtraction (Best for rooms)</option>
                    <option value="luminance">High Luminance Cutout</option>
                    <option value="dark">Dark Shadow Silhouette (Light background)</option>
                  </select>
                </div>

                <div className="calib-field">
                  <div className="calib-slider-header">
                    <label className="calib-label">THRESHOLD SENSITIVITY</label>
                    <span className="calib-slider-val">{tracker.threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="110"
                    value={tracker.threshold}
                    onChange={(e) => {
                      tracker.threshold = parseInt(e.target.value, 10);
                      if (onUpdate) onUpdate();
                    }}
                    className="calib-slider"
                  />
                </div>

                <div className="calib-checkbox-row">
                  <label className="calib-checkbox-label">
                    <input
                      type="checkbox"
                      checked={tracker.isolateArmsOnly}
                      onChange={(e) => {
                        tracker.isolateArmsOnly = e.target.checked;
                        if (onUpdate) onUpdate();
                      }}
                    />
                    <span style={{ color: '#00f0ff', fontWeight: 'bold' }}>
                      💪 Isolate Arms & Hands Only (Suppress Torso/Head)
                    </span>
                  </label>
                </div>

                {tracker.isolateArmsOnly && (
                  <div className="calib-field" style={{ marginTop: '4px' }}>
                    <div className="calib-slider-header">
                      <label className="calib-label">TORSO EXCLUSION WIDTH</label>
                      <span className="calib-slider-val">{Math.round(tracker.torsoExclusionWidth * 200)}%</span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="24"
                      value={Math.round(tracker.torsoExclusionWidth * 100)}
                      onChange={(e) => {
                        tracker.torsoExclusionWidth = parseInt(e.target.value, 10) / 100;
                        if (onUpdate) onUpdate();
                      }}
                      className="calib-slider"
                    />
                  </div>
                )}

                <div className="calib-checkbox-row">
                  <label className="calib-checkbox-label">
                    <input
                      type="checkbox"
                      checked={tracker.mirror}
                      onChange={(e) => {
                        tracker.mirror = e.target.checked;
                        if (onUpdate) onUpdate();
                      }}
                    />
                    <span>Mirror Camera Feed (Left/Right match body)</span>
                  </label>
                </div>

                <div className="calib-checkbox-row">
                  <label className="calib-checkbox-label">
                    <input
                      type="checkbox"
                      checked={tracker.invert}
                      onChange={(e) => {
                        tracker.invert = e.target.checked;
                        if (onUpdate) onUpdate();
                      }}
                    />
                    <span>Invert Silhouette Solid Mask</span>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="calib-footer">
          <span className="calib-telemetry">
            GRID: 200x150 @ 60FPS // ZERO CLOUD UPLOAD // 100% LOCAL CV
          </span>
          <button className="calib-btn primary" onClick={onClose}>
            CONFIRM & RETURN TO GAME
          </button>
        </div>
      </div>
    </div>
  );
}
