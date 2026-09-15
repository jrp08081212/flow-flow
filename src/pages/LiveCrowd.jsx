// Screen 5: Live Crowd View
// Shows real-time crowd data for a specific location.
// - Live headcount (active check-ins from the last 45 minutes; exited ones excluded)
// - Color-coded congestion indicator (Green / Yellow / Red)
// - PRISM arrival rate acceleration indicator (Accelerating / Steady / Cooling)
// - AI crowd forecast grounded in PRISM telemetry with auto-healing fallback
// - Read-only: Flow contains no manual check-in button!

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection, query, where, onSnapshot
} from 'firebase/firestore';
import { findLocation, getCrowdStatus } from '../data/facilities';
import {
  analyzeArrivalAcceleration,
  getCrowdPrediction
} from '../services/prism';
import PrismPanel from '../components/PrismPanel';

function LiveCrowd() {
  const { locationId } = useParams();
  const navigate = useNavigate();

  const [count, setCount] = useState(0);
  const [timestamps, setTimestamps] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [predictionData, setPredictionData] = useState({
    text: 'Analyzing live check-in telemetry with PRISM...',
    source: 'PRISM Core Engine',
    trend: 'steady'
  });
  const [prismMetrics, setPrismMetrics] = useState({
    trend: 'steady',
    reason: 'Evaluating arrivals...',
    last5MinEntries: 0,
    prev5MinEntries: 0,
    arrivalVelocity: '0.0'
  });
  const [showPrismHealth, setShowPrismHealth] = useState(false);

  // Check login
  const user = JSON.parse(sessionStorage.getItem('flow_user') || 'null');
  const location = findLocation(locationId);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    if (!location) return;

    // --- Real-time Firestore listener ---
    // Reads only active check-ins within the last 45 minutes
    const q = query(
      collection(db, 'checkins'),
      where('locationId', '==', locationId)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const now = Date.now();
      const cutoff = 45 * 60 * 1000;

      const recentTimestamps = [];

      snapshot.docs.forEach((d) => {
        const data = d.data();
        // Ignore check-ins marked as exited
        if (data.status === 'exited') return;

        if (data.timestamp) {
          const ts = data.timestamp.toMillis();
          if (now - ts <= cutoff) {
            recentTimestamps.push(ts);
          }
        }
      });

      const activeHeadcount = recentTimestamps.length;
      setTimestamps(recentTimestamps);
      setCount(activeHeadcount);
      setLastUpdate(new Date());

      // PRISM telemetry analysis
      const metrics = analyzeArrivalAcceleration(recentTimestamps);
      setPrismMetrics(metrics);

      // AI Forecast with PRISM fallback
      const forecast = await getCrowdPrediction(
        location,
        activeHeadcount,
        location.capacity,
        recentTimestamps
      );
      setPredictionData(forecast);
    }, (err) => console.warn('Live crowd listener warning:', err.message));

    return () => unsubscribe();
  }, [locationId]);

  if (!location) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="header-left">
            <button className="back-btn" onClick={() => navigate('/facilities')}>←</button>
            <div><h1>Location Not Found</h1></div>
          </div>
        </div>
      </div>
    );
  }

  const status = getCrowdStatus(count, location.capacity);
  const occupancyPercent = Math.min(100, Math.round((count / location.capacity) * 100));

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate(`/facilities/${location.categoryId}`)}>←</button>
          <div>
            <h1>{location.name}</h1>
            <span className="subtitle">{location.categoryIcon} {location.categoryName} • VIT Vellore</span>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn-prism-hud"
            onClick={() => setShowPrismHealth(true)}
            title="Open PRISM System Health"
          >
            ⚡ PRISM Health
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Crowd Hero Card */}
        <div className="crowd-hero">
          <div className="crowd-location-name">{location.name}</div>
          <div className="crowd-category">{location.categoryName} — VIT Vellore</div>

          {/* Big count number */}
          <div className={`crowd-count ${status.className}`}>
            {count}
          </div>
          <div className="crowd-label">people inside right now</div>

          {/* Status badge & PRISM trend badge */}
          <div className="status-badges-row">
            <div className={`crowd-status status-${status.level}`}>
              <span className="status-dot"></span>
              {status.label}
            </div>

            <div className={`trend-badge trend-${prismMetrics.trend.replace(' ', '-')}`}>
              {prismMetrics.trend === 'accelerating' && '⚡ Surging Arrivals'}
              {prismMetrics.trend === 'cooling down' && '📉 Traffic Thinning'}
              {prismMetrics.trend === 'steady' && '⚖️ Steady Flow'}
            </div>
          </div>

          {/* Occupancy bar */}
          <div className="occupancy-bar-container">
            <div
              className={`occupancy-bar bar-${status.level}`}
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
          <div className="crowd-capacity">
            {occupancyPercent}% of capacity ({count} / {location.capacity} max)
          </div>
        </div>

        {/* PRISM Acceleration Telemetry Card */}
        <div className="telemetry-card">
          <div className="telemetry-header">
            <span>⚡ PRISM Rate Telemetry</span>
            <span className="telemetry-velocity">{prismMetrics.arrivalVelocity} arrivals/min</span>
          </div>
          <div className="telemetry-stats-row">
            <div className="telemetry-stat">
              <span className="stat-num">{prismMetrics.last5MinEntries}</span>
              <span className="stat-desc">Last 5 min</span>
            </div>
            <div className="telemetry-stat">
              <span className="stat-num">{prismMetrics.prev5MinEntries}</span>
              <span className="stat-desc">5–10 min ago</span>
            </div>
            <div className="telemetry-stat">
              <span className="stat-num">{prismMetrics.olderEntries}</span>
              <span className="stat-desc">10–25 min ago</span>
            </div>
          </div>
        </div>

        {/* AI Prediction Card */}
        <div className="prediction-card">
          <div className="prediction-top">
            <span className="prediction-title">🔮 AI Crowd Forecast</span>
            <span className="prediction-source-tag">{predictionData.source}</span>
          </div>
          <div className="prediction-text">{predictionData.text}</div>
          <div className="prediction-accuracy-note">
            ✓ Grounded by PRISM rate analysis & auto-calibrated
          </div>
        </div>

        {/* Read-only notice */}
        <div className="readonly-notice">
          <span className="readonly-icon">📡</span>
          <span>Live automated sensor telemetry • Exits and 45-min timeouts auto-deducted</span>
        </div>

        {/* Live update indicator */}
        {lastUpdate && (
          <div className="last-update">
            <span className="live-dot"></span>
            Live • Telemetry synced {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* PRISM Health Modal */}
      <PrismPanel
        isOpen={showPrismHealth}
        onClose={() => setShowPrismHealth(false)}
        facilityStatuses={{
          [location.id]: { trend: prismMetrics.trend, count }
        }}
      />
    </div>
  );
}

export default LiveCrowd;
