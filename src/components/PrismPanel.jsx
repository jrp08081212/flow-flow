// PRISM System Health Panel
// Displays live monitoring metrics:
// - Live forecast accuracy percentage
// - AI failures caught & auto-recovered
// - Model health status (Healthy / Degraded)
// - Live acceleration status across facilities
// - Real-time PRISM event & nudge feed
// - Optional AI API Key configuration (OpenAI / Gemini)

import { useState } from 'react';
import { getPrismSystemHealth, sendManualPrismTrace } from '../services/prism';
import { getAllLocations } from '../data/facilities';

function PrismPanel({ isOpen, onClose, facilityStatuses = {} }) {
  const [apiKeyInput, setApiKeyInput] = useState(
    () => (typeof window !== 'undefined' ? localStorage.getItem('flow_ai_api_key') || '' : '')
  );
  const [provider, setProvider] = useState(
    () => (typeof window !== 'undefined' ? localStorage.getItem('flow_ai_provider') || 'openai' : 'openai')
  );
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSendingTrace, setIsSendingTrace] = useState(false);
  const [manualTraceFeedback, setManualTraceFeedback] = useState(null);

  if (!isOpen) return null;

  const health = getPrismSystemHealth();
  const allLocations = getAllLocations();

  const handleSaveKey = (e) => {
    e.preventDefault();
    if (apiKeyInput.trim()) {
      localStorage.setItem('flow_ai_api_key', apiKeyInput.trim());
      localStorage.setItem('flow_ai_provider', provider);
    } else {
      localStorage.removeItem('flow_ai_api_key');
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSendTestTrace = async () => {
    setIsSendingTrace(true);
    setManualTraceFeedback(null);
    try {
      const res = await sendManualPrismTrace('Dashboard trace triggered manually from PRISM System Health Panel');
      setIsSendingTrace(false);
      if (res.success) {
        setManualTraceFeedback({
          success: true,
          traceId: res.traceId,
          time: new Date().toLocaleTimeString()
        });
      } else {
        setManualTraceFeedback({
          success: false,
          error: res.error || 'Failed to dispatch trace'
        });
      }
    } catch (err) {
      setIsSendingTrace(false);
      setManualTraceFeedback({
        success: false,
        error: err.message
      });
    }
  };

  return (
    <div className="prism-overlay" onClick={onClose}>
      <div className="prism-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="prism-header">
          <div className="prism-title-row">
            <span className="prism-glow-icon">⚡</span>
            <div>
              <h2>PRISM System Health</h2>
              <p className="prism-subtitle">Proactive Real-time Intelligence & Surveillance Monitor</p>
            </div>
          </div>
          <button className="prism-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="prism-body">
          {/* Key Metrics Row */}
          <div className="prism-metrics-grid">
            <div className="prism-metric-card">
              <div className="prism-metric-label">Model Health</div>
              <div className={`prism-metric-value status-${health.healthStatus.toLowerCase()}`}>
                <span className="live-dot"></span>
                {health.healthStatus}
              </div>
              <div className="prism-metric-note">Zero-stall self-healing active</div>
            </div>

            <div className="prism-metric-card">
              <div className="prism-metric-label">Forecast Accuracy</div>
              <div className="prism-metric-value accent-cyan">
                {health.accuracyPct}%
              </div>
              <div className="prism-metric-note">Evaluated over rolling windows</div>
            </div>

            <div className="prism-metric-card">
              <div className="prism-metric-label">Failures Auto-Recovered</div>
              <div className="prism-metric-value accent-green">
                {health.aiFailuresRecovered}
              </div>
              <div className="prism-metric-note">Seamless rule-engine fallbacks</div>
            </div>
          </div>

          {/* PRISM Cloud Live Telemetry Stream */}
          <div className="prism-cloud-box">
            <div className="prism-cloud-banner">
              <div className="prism-cloud-left">
                <span className="live-dot"></span>
                <div>
                  <div className="prism-cloud-status-title">PRISM Cloud Observability: Active & Streaming</div>
                  <div className="prism-cloud-project">Project ID: 13f1907f-0503-4044-8e43-e473d576802c</div>
                </div>
              </div>
              <div className="prism-cloud-actions">
                <button
                  type="button"
                  className="prism-send-trace-btn"
                  onClick={handleSendTestTrace}
                  disabled={isSendingTrace}
                >
                  {isSendingTrace ? '⚡ Ingesting Trace...' : '🚀 Send Live Trace to PRISM'}
                </button>
              </div>
            </div>

            {manualTraceFeedback && (
              <div className={`prism-trace-result-banner ${manualTraceFeedback.success ? 'trace-success' : 'trace-error'}`}>
                {manualTraceFeedback.success ? (
                  <>
                    <span className="trace-result-icon">✅</span>
                    <div className="trace-result-text">
                      <strong>Trace Ingested to PRISM Cloud!</strong>
                      <div className="trace-id-line">Trace ID: <code>{manualTraceFeedback.traceId}</code> • Time: {manualTraceFeedback.time}</div>
                      <div className="trace-hint">Live trace recorded! You can now check your PRISM Cloud Dashboard to see this trace and its telemetry evaluation.</div>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="trace-result-icon">❌</span>
                    <div className="trace-result-text">
                      <strong>Failed to send trace:</strong> {manualTraceFeedback.error}
                    </div>
                  </>
                )}
              </div>
            )}

            {!manualTraceFeedback && health.latestTrace && (
              <div className="prism-trace-result-banner trace-info">
                <span className="trace-result-icon">📡</span>
                <div className="trace-result-text">
                  <strong>Latest Dispatched Trace:</strong> <code>{health.latestTrace.id}</code> ({health.latestTrace.facility}) at {health.latestTrace.time}
                </div>
              </div>
            )}
          </div>

          {/* Acceleration Status Across Campus */}
          <div className="prism-section">
            <h3 className="prism-section-title">📡 Real-Time Arrival Trends by Facility</h3>
            <div className="prism-facilities-grid">
              {allLocations.map((loc) => {
                const status = facilityStatuses[loc.id] || { trend: 'steady', count: 0 };
                const isAccelerating = status.trend === 'accelerating';
                const isCooling = status.trend === 'cooling down';

                return (
                  <div
                    key={loc.id}
                    className={`prism-facility-chip ${
                      isAccelerating ? 'chip-accelerating' : isCooling ? 'chip-cooling' : 'chip-steady'
                    }`}
                  >
                    <span className="chip-name">{loc.name}</span>
                    <span className="chip-trend">
                      {isAccelerating ? '⚡ Accelerating' : isCooling ? '📉 Cooling' : '⚖️ Steady'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live PRISM Nudge Feed */}
          <div className="prism-section">
            <h3 className="prism-section-title">🔔 Recent PRISM Autonomous Nudges</h3>
            {health.recentNudges.length === 0 ? (
              <div className="prism-empty-feed">
                No nudges fired yet. Nudges fire automatically when a facility drops to Green or when PRISM detects arrival acceleration.
              </div>
            ) : (
              <div className="prism-nudge-list">
                {health.recentNudges.map((nudge) => (
                  <div key={nudge.id} className="prism-nudge-item">
                    <span className="nudge-time">{nudge.time}</span>
                    <span className="nudge-badge">{nudge.triggerType === 'acceleration' ? '⚡ Surge' : '🟢 Quiet'}</span>
                    <div className="nudge-msg">
                      <strong>{nudge.facilityName}:</strong> {nudge.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Key Configuration Form */}
          <div className="prism-section prism-api-box">
            <h3 className="prism-section-title">🤖 AI Forecasting Engine Configuration</h3>
            <p className="prism-api-desc">
              Flow automatically uses PRISM's smart rule engine by default. To hook up live LLM predictions, provide an API key below.
            </p>
            <form onSubmit={handleSaveKey} className="prism-api-form">
              <div className="prism-input-row">
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="prism-select"
                >
                  <option value="openai">OpenAI (GPT-3.5/4)</option>
                  <option value="gemini">Google Gemini</option>
                </select>
                <input
                  type="password"
                  placeholder={provider === 'openai' ? 'sk-...' : 'AIzaSy...'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="prism-input"
                />
                <button type="submit" className="prism-save-btn">Save Key</button>
              </div>
              {saveSuccess && (
                <div className="prism-save-success">✅ API Key saved! PRISM will route live forecasts through {provider.toUpperCase()}.</div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrismPanel;
