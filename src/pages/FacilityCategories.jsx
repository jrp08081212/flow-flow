// Screen 3: Facility Categories
// Main dashboard for students after logging into Flow:
// - 5 category cards with live crowd status and active occupancy
// - Notifications management (opt-in toggles per facility)
// - Autonomous PRISM nudge listener (fires toast banner when subscribed facility turns Green or Surges)
// - PRISM System Health HUD modal

import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { facilities, getAllLocations, getCrowdStatus } from '../data/facilities';
import { analyzeArrivalAcceleration, recordPrismNudge } from '../services/prism';
import NotificationModal from '../components/NotificationModal';
import NotificationBanner from '../components/NotificationBanner';
import PrismPanel from '../components/PrismPanel';

function FacilityCategories() {
  const navigate = useNavigate();
  const [activeNudge, setActiveNudge] = useState(null);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showPrismModal, setShowPrismModal] = useState(false);
  const [facilityStats, setFacilityStats] = useState({});
  const [subscribedPrefs, setSubscribedPrefs] = useState({});

  // References for tracking previous statuses & cooldowns
  const prevStatusesRef = useRef({});
  const lastNudgeTimeRef = useRef({});

  // Check login
  const user = JSON.parse(sessionStorage.getItem('flow_user') || 'null');
  const regNumber = user?.regNumber || '26BCE2885';

  // Load notification preferences
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    const cached = localStorage.getItem(`flow_prefs_${regNumber}`);
    if (cached) {
      try {
        setSubscribedPrefs(JSON.parse(cached));
      } catch (e) {}
    }
  }, [regNumber]);

  // Real-time listener for all active check-ins & nudge triggers
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'checkins'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const cutoff = 45 * 60 * 1000;
      const allLocs = getAllLocations();

      // Bucket timestamps by facility ID
      const locationTimestamps = {};
      allLocs.forEach(l => { locationTimestamps[l.id] = []; });

      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.status === 'exited') return;
        if (data.timestamp && locationTimestamps[data.locationId]) {
          const ts = data.timestamp.toMillis();
          if (now - ts <= cutoff) {
            locationTimestamps[data.locationId].push(ts);
          }
        }
      });

      // Analyze each location
      const newStats = {};
      allLocs.forEach((loc) => {
        const timestamps = locationTimestamps[loc.id] || [];
        const count = timestamps.length;
        const status = getCrowdStatus(count, loc.capacity);
        const prism = analyzeArrivalAcceleration(timestamps);

        newStats[loc.id] = {
          count,
          capacity: loc.capacity,
          status,
          trend: prism.trend,
          name: loc.name,
          categoryName: loc.categoryName
        };

        // --- NUDGE TRIGGER LOGIC ---
        const isSubscribed = !!subscribedPrefs[loc.id];
        const prevStatus = prevStatusesRef.current[loc.id];
        const lastNotified = lastNudgeTimeRef.current[loc.id] || 0;
        const cooldownMs = 15 * 60 * 1000; // 15 minute cooldown

        if (isSubscribed && (now - lastNotified > cooldownMs)) {
          // Trigger 1: Transition into Green (low crowd) from Yellow or Red
          if (prevStatus && prevStatus.level !== 'low' && status.level === 'low') {
            const nudge = {
              facilityId: loc.id,
              facilityName: loc.name,
              triggerType: 'green_transition',
              message: loc.quietMsg || `${loc.name} is quiet right now — good time to visit!`
            };
            recordPrismNudge(nudge);
            setActiveNudge(nudge);
            lastNudgeTimeRef.current[loc.id] = now;
          }
          // Trigger 2: PRISM flags facility as Accelerating while still green or yellow
          else if (prism.trend === 'accelerating' && status.level !== 'high') {
            const nudge = {
              facilityId: loc.id,
              facilityName: loc.name,
              triggerType: 'acceleration',
              message: `⚡ ${loc.name} filling up fast — arrivals surged recently. Good time to go before peak!`
            };
            recordPrismNudge(nudge);
            setActiveNudge(nudge);
            lastNudgeTimeRef.current[loc.id] = now;
          }
        }

        prevStatusesRef.current[loc.id] = status;
      });

      setFacilityStats(newStats);
    }, (err) => console.warn('Categories snapshot listener warning:', err.message));

    return () => unsubscribe();
  }, [subscribedPrefs, user]);

  const handleLogout = () => {
    sessionStorage.removeItem('flow_user');
    navigate('/');
  };

  const subscribedCount = Object.values(subscribedPrefs).filter(Boolean).length;
  const categoryList = Object.entries(facilities);

  return (
    <div className="page">
      {/* Real-time Notification Banner */}
      <NotificationBanner
        notification={activeNudge}
        onDismiss={() => setActiveNudge(null)}
      />

      {/* Header bar */}
      <div className="page-header">
        <div className="header-left">
          <div>
            <h1>🌊 Flow</h1>
            <span className="subtitle">VIT Vellore • {regNumber}</span>
          </div>
        </div>
        <div className="header-actions">
          {/* Notifications button */}
          <button
            type="button"
            className="header-icon-btn"
            onClick={() => setShowNotifModal(true)}
            title="Notification Subscriptions"
          >
            🔔
            {subscribedCount > 0 && (
              <span className="badge-count">{subscribedCount}</span>
            )}
          </button>

          {/* PRISM System Health button */}
          <button
            type="button"
            className="btn-prism-pill"
            onClick={() => setShowPrismModal(true)}
            title="Open PRISM System Health"
          >
            ⚡ PRISM
          </button>

          <button className="logout-btn" onClick={handleLogout}>Log out</button>
        </div>
      </div>

      {/* Main content */}
      <div className="page-content">
        <div className="dashboard-intro">
          <h2>Campus Facilities</h2>
          <p>Tap a category to inspect live headcount & AI crowd predictions.</p>
        </div>

        <div className="categories-grid">
          {categoryList.map(([categoryId, category]) => {
            // Aggregate crowd levels for this category
            let totalInside = 0;
            let totalCapacity = 0;
            let hasAccelerating = false;

            category.locations.forEach((loc) => {
              const stat = facilityStats[loc.id];
              if (stat) {
                totalInside += stat.count;
                totalCapacity += stat.capacity;
                if (stat.trend === 'accelerating') hasAccelerating = true;
              }
            });

            const ratio = totalCapacity > 0 ? totalInside / totalCapacity : 0;
            const catStatus = getCrowdStatus(totalInside, totalCapacity);

            return (
              <Link
                key={categoryId}
                to={`/facilities/${categoryId}`}
                className="category-card"
              >
                <div className="category-icon" style={{ background: category.color + '20' }}>
                  {category.icon}
                </div>
                <div className="category-info">
                  <div className="category-title-row">
                    <h3>{category.name}</h3>
                    {hasAccelerating && (
                      <span className="category-surge-tag">⚡ Surge</span>
                    )}
                  </div>
                  <p>{category.description}</p>
                  <div className="category-crowd-meta">
                    <span className={`crowd-pill pill-${catStatus.level}`}>
                      {catStatus.label} ({totalInside} people)
                    </span>
                    <span className="category-loc-count">
                      {category.locations.length} locations
                    </span>
                  </div>
                </div>
                <span className="category-arrow">›</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Notification Preferences Modal */}
      <NotificationModal
        isOpen={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        user={user}
        onPreferencesChanged={(newPrefs) => setSubscribedPrefs(newPrefs)}
      />

      {/* PRISM System Health Modal */}
      <PrismPanel
        isOpen={showPrismModal}
        onClose={() => setShowPrismModal(false)}
        facilityStatuses={facilityStats}
      />
    </div>
  );
}

export default FacilityCategories;

