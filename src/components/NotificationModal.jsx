// Notification Preferences Modal
// Lets each student subscribe to specific facilities.
// Nudges are fired when:
// 1. A subscribed facility drops into Green (quiet / low crowd)
// 2. PRISM flags a subscribed facility as "accelerating" (filling up fast)
// Stored in Firestore `notification_prefs/{regNumber}`

import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { facilities, getAllLocations } from '../data/facilities';

function NotificationModal({ isOpen, onClose, user, onPreferencesChanged }) {
  const [prefs, setPrefs] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('preferences'); // 'preferences' | 'how-it-works'

  const allLocations = getAllLocations();
  const regNumber = user?.regNumber || '26BCE2885';

  // Load preferences on open
  useEffect(() => {
    if (!isOpen) return;

    const loadPrefs = async () => {
      // Check local cache first
      const cached = localStorage.getItem(`flow_prefs_${regNumber}`);
      if (cached) {
        setPrefs(JSON.parse(cached));
      }

      try {
        const docRef = doc(db, 'notification_prefs', regNumber);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const remoteData = snap.data() || {};
          setPrefs(remoteData);
          localStorage.setItem(`flow_prefs_${regNumber}`, JSON.stringify(remoteData));
        }
      } catch (err) {
        console.warn('Could not load remote preferences:', err.message);
      }
    };

    loadPrefs();
  }, [isOpen, regNumber]);

  if (!isOpen) return null;

  // Toggle single facility
  const handleToggle = async (locationId) => {
    const updated = { ...prefs, [locationId]: !prefs[locationId] };
    setPrefs(updated);
    localStorage.setItem(`flow_prefs_${regNumber}`, JSON.stringify(updated));

    if (onPreferencesChanged) {
      onPreferencesChanged(updated);
    }

    try {
      setSaving(true);
      await setDoc(doc(db, 'notification_prefs', regNumber), updated, { merge: true });
    } catch (err) {
      console.warn('Preferences saved locally (remote write pending):', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle all facilities
  const handleToggleAll = async (enableAll) => {
    const updated = {};
    allLocations.forEach(loc => {
      updated[loc.id] = enableAll;
    });
    setPrefs(updated);
    localStorage.setItem(`flow_prefs_${regNumber}`, JSON.stringify(updated));

    if (onPreferencesChanged) {
      onPreferencesChanged(updated);
    }

    try {
      setSaving(true);
      await setDoc(doc(db, 'notification_prefs', regNumber), updated, { merge: true });
      setToast(enableAll ? 'Subscribed to all facilities' : 'Unsubscribed from all facilities');
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      console.warn('Preferences saved locally:', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Request browser notification permission if available
  const handleRequestPush = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setToast('✅ Browser push notifications enabled!');
      } else {
        setToast('⚠️ Browser push blocked. In-app banner toasts will be used.');
      }
      setTimeout(() => setToast(''), 3000);
    } else {
      setToast('In-app notification banners are fully active.');
      setTimeout(() => setToast(''), 3000);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h2>🔔 Facility Nudge Preferences</h2>
            <p className="modal-sub">Custom alerts for {regNumber}</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Tab Selector */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            My Subscriptions
          </button>
          <button
            className={`modal-tab ${activeTab === 'how-it-works' ? 'active' : ''}`}
            onClick={() => setActiveTab('how-it-works')}
          >
            How PRISM Nudges Work
          </button>
        </div>

        {/* Preferences Tab */}
        {activeTab === 'preferences' ? (
          <div className="modal-content">
            <div className="prefs-actions-bar">
              <span className="subscribed-count">
                {Object.values(prefs).filter(Boolean).length} of {allLocations.length} facilities subscribed
              </span>
              <div className="quick-toggle-btns">
                <button type="button" className="btn-text-action" onClick={() => handleToggleAll(true)}>Select All</button>
                <span>•</span>
                <button type="button" className="btn-text-action" onClick={() => handleToggleAll(false)}>Clear</button>
              </div>
            </div>

            <div className="prefs-groups">
              {Object.entries(facilities).map(([categoryId, category]) => (
                <div key={categoryId} className="prefs-group">
                  <div className="prefs-group-title">
                    <span>{category.icon} {category.name}</span>
                  </div>
                  <div className="prefs-list">
                    {category.locations.map((loc) => {
                      const isChecked = !!prefs[loc.id];
                      return (
                        <div
                          key={loc.id}
                          className={`pref-item ${isChecked ? 'pref-active' : ''}`}
                          onClick={() => handleToggle(loc.id)}
                        >
                          <div className="pref-item-info">
                            <span className="pref-item-name">{loc.name}</span>
                            <span className="pref-item-cap">Capacity: {loc.capacity}</span>
                          </div>
                          <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggle(loc.id)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-footer-cta">
              <button className="btn-push-perm" onClick={handleRequestPush}>
                🔔 Enable Browser Push Notifications
              </button>
              {saving && <span className="syncing-indicator">Saving to Firestore...</span>}
            </div>
          </div>
        ) : (
          /* How it works Tab */
          <div className="modal-content how-it-works-pane">
            <div className="info-card">
              <h4>🟢 Smart Quiet Window Nudge</h4>
              <p>
                When a facility you subscribe to drops from Yellow/Red into <strong>Green (Low Crowd)</strong>, Flow notifies you so you can catch an open gym, quiet library, or empty mess hall.
              </p>
            </div>

            <div className="info-card">
              <h4>⚡ PRISM Arrival Surge Nudge</h4>
              <p>
                If arrivals at a subscribed facility suddenly accelerate while it is still green or yellow, PRISM alerts you immediately: <em>"⚡ Gym 1 filling up fast — good time to go now before it reaches peak."</em>
              </p>
            </div>

            <div className="info-card">
              <h4>🛡️ Spam Prevention Cooldown</h4>
              <p>
                Nudges strictly enforce a 20-30 minute cooldown per facility, preventing annoying repeat notifications if crowd levels fluctuate near a boundary.
              </p>
            </div>
          </div>
        )}

        {toast && <div className="toast-inner">{toast}</div>}
      </div>
    </div>
  );
}

export default NotificationModal;
