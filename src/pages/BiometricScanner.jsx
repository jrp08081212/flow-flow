// Biometric Scanner — Campus Access & Verification Terminal
// Simulates a physical biometric kiosk at VIT facility entrances/exits.
// Features:
// 1. Entry / Exit Toggle: First scan checks in (+1, green), second scan checks out (-1, amber)
// 2. Capacity Protection: Refuses entry if facility is full ("Access Denied — Facility Full")
// 3. Demo Controls: Quick +/- headcount adjustments with strict hard limits (capped at max, floored at 0)
// 4. PRISM integration: Logs all arrival/departure events for real-time acceleration tracking

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  writeBatch,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { facilities, getAllLocations, findLocation } from '../data/facilities';
import { logPrismEvent } from '../services/prism';

const DEMO_STUDENTS = [
  { id: '26BCE2885', name: 'Peter (Demo Account)' },
  { id: '24BCB0124', name: 'Rahul S.' },
  { id: '25BIT0982', name: 'Ananya V.' },
  { id: '23BME0451', name: 'Karthik R.' },
  { id: '25BCE3109', name: 'Meera K.' }
];

function BiometricScanner() {
  const [selectedCategory, setSelectedCategory] = useState('gyms');
  const [selectedLocation, setSelectedLocation] = useState('gym-1');
  const [regNumber, setRegNumber] = useState('26BCE2885');
  const [customReg, setCustomReg] = useState('');
  const [isCustomReg, setIsCustomReg] = useState(false);

  // Scanner UI states: 'idle' | 'scanning' | 'entry-verified' | 'exit-verified' | 'denied'
  const [scanState, setScanState] = useState('idle');
  const [statusMsg, setStatusMsg] = useState('Place finger to scan access credentials');

  // Demo Controls Panel state
  const [showDemoTools, setShowDemoTools] = useState(false);
  const [demoFacilityId, setDemoFacilityId] = useState('gym-1');
  const [demoAdjustment, setDemoAdjustment] = useState(5);
  const [demoFeedback, setDemoFeedback] = useState('');
  const [seeding, setSeeding] = useState(false);

  // Live crowd counts dictionary for all facilities
  const [facilityCounts, setFacilityCounts] = useState({});

  const allLocations = getAllLocations();
  const activeRegNumber = (isCustomReg ? customReg.trim() : regNumber).toUpperCase();

  // Listen to active check-ins to show live counts in the Demo Tools panel
  useEffect(() => {
    const q = query(collection(db, 'checkins'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const cutoff = 45 * 60 * 1000;
      const counts = {};

      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.status === 'active' && data.timestamp) {
          const ts = data.timestamp.toMillis();
          if (now - ts <= cutoff) {
            counts[data.locationId] = (counts[data.locationId] || 0) + 1;
          }
        }
      });

      setFacilityCounts(counts);
    }, (err) => console.warn('Checkins snapshot listener warning:', err.message));

    return () => unsubscribe();
  }, []);

  const categoryData = selectedCategory ? facilities[selectedCategory] : null;
  const locations = categoryData ? categoryData.locations : [];
  const currentLocationInfo = findLocation(selectedLocation);
  const currentDemoLocInfo = findLocation(demoFacilityId);
  const currentDemoCount = facilityCounts[demoFacilityId] || 0;

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setSelectedCategory(cat);
    const locs = facilities[cat]?.locations || [];
    setSelectedLocation(locs[0]?.id || '');
    setScanState('idle');
    setStatusMsg('Select a location, then scan');
  };

  const handleLocationChange = (e) => {
    setSelectedLocation(e.target.value);
    setScanState('idle');
    setStatusMsg('Ready — press Scan to verify');
  };

  // --- Perform Biometric Scan with Smart Entry / Exit Toggle ---
  const handleScan = async () => {
    if (!selectedLocation) {
      setStatusMsg('⚠️ Please select a facility location first');
      return;
    }
    if (!activeRegNumber) {
      setStatusMsg('⚠️ Please provide a valid Registration Number');
      return;
    }

    const locInfo = findLocation(selectedLocation);
    const locName = locInfo?.name || selectedLocation;
    const capacity = locInfo?.capacity || 100;

    // Step 1: Scanning animation
    setScanState('scanning');
    setStatusMsg(`Scanning biometric identity for ${activeRegNumber}...`);

    await new Promise(r => setTimeout(r, 1600));

    // Step 2: Verification phase
    setStatusMsg('Checking access status & permissions...');
    await new Promise(r => setTimeout(r, 500));

    try {
      const now = Date.now();
      const cutoff = 45 * 60 * 1000;

      // Query active check-ins at this facility
      const qFacility = query(
        collection(db, 'checkins'),
        where('locationId', '==', selectedLocation)
      );
      const snapshot = await getDocs(qFacility);

      let existingActiveDoc = null;
      let currentActiveCount = 0;

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'active' && data.timestamp) {
          const ts = data.timestamp.toMillis();
          if (now - ts <= cutoff) {
            currentActiveCount++;
            if (data.regNumber === activeRegNumber) {
              existingActiveDoc = docSnap;
            }
          }
        }
      });

      // CASE A: User is already active inside -> EXIT
      if (existingActiveDoc) {
        await updateDoc(doc(db, 'checkins', existingActiveDoc.id), {
          status: 'exited',
          exitTimestamp: Timestamp.now()
        });

        await logPrismEvent('scan_exit', {
          locationId: selectedLocation,
          regNumber: activeRegNumber,
          countAfter: Math.max(0, currentActiveCount - 1)
        });

        setScanState('exit-verified');
        setStatusMsg(`🚪 Exit Verified — Checked out of ${locName}. Have a safe day!`);

        setTimeout(() => {
          setScanState('idle');
          setStatusMsg('Ready — press Scan to verify');
        }, 4000);
        return;
      }

      // CASE B: User is entering -> Check capacity
      if (currentActiveCount >= capacity) {
        setScanState('denied');
        setStatusMsg(`❌ Access Denied — ${locName} is at Full Capacity (${currentActiveCount}/${capacity}). Entry restricted.`);

        await logPrismEvent('entry_denied_full', {
          locationId: selectedLocation,
          regNumber: activeRegNumber,
          capacity
        });

        setTimeout(() => {
          setScanState('idle');
          setStatusMsg('Ready — press Scan to verify');
        }, 4500);
        return;
      }

      // CASE C: User granted entry -> Create active check-in record
      await addDoc(collection(db, 'checkins'), {
        locationId: selectedLocation,
        regNumber: activeRegNumber,
        status: 'active',
        timestamp: Timestamp.now()
      });

      await logPrismEvent('scan_entry', {
        locationId: selectedLocation,
        regNumber: activeRegNumber,
        countAfter: currentActiveCount + 1
      });

      setScanState('entry-verified');
      setStatusMsg(`✅ Entry Verified — Welcome to ${locName}! Active headcount: ${currentActiveCount + 1}/${capacity}`);

      setTimeout(() => {
        setScanState('idle');
        setStatusMsg('Ready — press Scan to verify');
      }, 4000);

    } catch (err) {
      console.error('Biometric scan processing error:', err);
      setScanState('idle');
      setStatusMsg('❌ Transaction error. Please try scanning again.');
    }
  };

  // --- Demo Controls: Manual Headcount Override with Hard Limits ---
  const handleModifyHeadcount = async (isAdd) => {
    if (!currentDemoLocInfo) return;
    const capacity = currentDemoLocInfo.capacity;
    const currentCount = currentDemoCount;
    setDemoFeedback('');

    try {
      const q = query(
        collection(db, 'checkins'),
        where('locationId', '==', demoFacilityId)
      );
      const snapshot = await getDocs(q);
      const now = Date.now();
      const cutoff = 45 * 60 * 1000;

      const activeDocs = [];
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.status === 'active' && data.timestamp) {
          if (now - data.timestamp.toMillis() <= cutoff) {
            activeDocs.push(d);
          }
        }
      });

      const actualCount = activeDocs.length;

      if (isAdd) {
        // Enforce hard cap at capacity
        if (actualCount >= capacity) {
          setDemoFeedback(`⚠️ Capped at full capacity (${capacity}). Cannot add more.`);
          return;
        }

        const allowedToAdd = Math.min(demoAdjustment, capacity - actualCount);
        const batch = writeBatch(db);

        for (let i = 0; i < allowedToAdd; i++) {
          const newDocRef = doc(collection(db, 'checkins'));
          const minsAgo = Math.random() * 4; // Recent arrival within 4 mins
          batch.set(newDocRef, {
            locationId: demoFacilityId,
            regNumber: `DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
            status: 'active',
            timestamp: Timestamp.fromDate(new Date(now - minsAgo * 60 * 1000))
          });
        }

        await batch.commit();

        if (allowedToAdd < demoAdjustment) {
          setDemoFeedback(`Capped at full capacity (${capacity}). Added ${allowedToAdd} entries.`);
        } else {
          setDemoFeedback(`✅ Added +${allowedToAdd} people to ${currentDemoLocInfo.name}. Headcount: ${actualCount + allowedToAdd}/${capacity}`);
        }

      } else {
        // Enforce hard floor at zero
        if (actualCount <= 0) {
          setDemoFeedback('⚠️ Already at zero. Cannot remove people.');
          return;
        }

        const allowedToRemove = Math.min(demoAdjustment, actualCount);
        const batch = writeBatch(db);

        for (let i = 0; i < allowedToRemove; i++) {
          const docToExit = activeDocs[i];
          batch.update(docToExit.ref, {
            status: 'exited',
            exitTimestamp: Timestamp.now()
          });
        }

        await batch.commit();

        if (allowedToRemove < demoAdjustment) {
          setDemoFeedback(`Already at zero. Removed remaining ${allowedToRemove} occupants.`);
        } else {
          setDemoFeedback(`✅ Removed -${allowedToRemove} people from ${currentDemoLocInfo.name}. Headcount: ${actualCount - allowedToRemove}/${capacity}`);
        }
      }

      setTimeout(() => setDemoFeedback(''), 4500);

    } catch (err) {
      console.error('Demo control modification error:', err);
      setDemoFeedback('❌ Error updating headcount. Check console.');
    }
  };

  // --- Seed Demo Data: Balanced Pairs ---
  const handleSeedBalanced = async () => {
    setSeeding(true);
    setDemoFeedback('Generating realistic entry/exit turnover...');
    try {
      const batch = writeBatch(db);
      const now = Date.now();

      const targets = {
        'mess-1': 55,
        'mess-2': 42,
        'central-library': 34,
        'reading-hall': 18,
        'main-pool': 12,
        'gym-1': 24,
        'gym-2': 16,
        'court-1': 8,
        'court-2': 6
      };

      for (const [locId, activeTarget] of Object.entries(targets)) {
        // Add active check-ins
        for (let i = 0; i < activeTarget; i++) {
          const docRef = doc(collection(db, 'checkins'));
          const minsAgo = Math.random() * 40 + 1;
          batch.set(docRef, {
            locationId: locId,
            regNumber: `26BCE${1000 + Math.floor(Math.random() * 8000)}`,
            status: 'active',
            timestamp: Timestamp.fromDate(new Date(now - minsAgo * 60 * 1000))
          });
        }

        // Add exited check-ins (turnover history)
        const exitCount = Math.floor(activeTarget * 0.4);
        for (let j = 0; j < exitCount; j++) {
          const docRef = doc(collection(db, 'checkins'));
          const minsAgo = Math.random() * 42 + 2;
          batch.set(docRef, {
            locationId: locId,
            regNumber: `25BCB${1000 + Math.floor(Math.random() * 8000)}`,
            status: 'exited',
            timestamp: Timestamp.fromDate(new Date(now - minsAgo * 60 * 1000)),
            exitTimestamp: Timestamp.fromDate(new Date(now - (minsAgo - 5) * 60 * 1000))
          });
        }
      }

      await batch.commit();
      setDemoFeedback('✅ Realistic traffic seeded across all 9 facilities!');
      setTimeout(() => setDemoFeedback(''), 4000);
    } catch (err) {
      console.error('Seed error:', err);
      setDemoFeedback('❌ Seeding failed. Check console.');
    } finally {
      setSeeding(false);
    }
  };

  // --- Seed Demo Data: Trigger Rapid Entry Surge (PRISM Accelerating) ---
  const handleSeedBurst = async () => {
    setSeeding(true);
    setDemoFeedback(`Simulating rapid arrival surge at ${currentDemoLocInfo?.name || 'facility'}...`);
    try {
      const batch = writeBatch(db);
      const now = Date.now();
      const locId = demoFacilityId;
      const burstSize = 14;

      for (let i = 0; i < burstSize; i++) {
        const docRef = doc(collection(db, 'checkins'));
        // Highly concentrated within last 3 minutes
        const minsAgo = Math.random() * 3 + 0.2;
        batch.set(docRef, {
          locationId: locId,
          regNumber: `SURGE-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'active',
          timestamp: Timestamp.fromDate(new Date(now - minsAgo * 60 * 1000))
        });
      }

      await batch.commit();
      await logPrismEvent('simulated_burst', { facilityId: locId, count: burstSize });

      setDemoFeedback(`⚡ Surge created! PRISM will now flag ${currentDemoLocInfo?.name} as "Accelerating".`);
      setTimeout(() => setDemoFeedback(''), 4500);
    } catch (err) {
      console.error('Burst error:', err);
      setDemoFeedback('❌ Burst simulation failed.');
    } finally {
      setSeeding(false);
    }
  };

  // --- Seed Demo Data: Drop Crowd to Green (Quiet Window) ---
  const handleDropToGreen = async () => {
    setSeeding(true);
    setDemoFeedback(`Clearing crowd at ${currentDemoLocInfo?.name || 'facility'} to Green...`);
    try {
      const q = query(collection(db, 'checkins'), where('locationId', '==', demoFacilityId));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      const now = Date.now();
      const cutoff = 45 * 60 * 1000;

      // Keep only a handful so it drops below 30% capacity (Green)
      let kept = 0;
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'active' && data.timestamp) {
          if (now - data.timestamp.toMillis() <= cutoff) {
            if (kept < 3) {
              kept++;
            } else {
              batch.update(docSnap.ref, {
                status: 'exited',
                exitTimestamp: Timestamp.now()
              });
            }
          }
        }
      });

      await batch.commit();
      setDemoFeedback(`🟢 Crowd dropped! ${currentDemoLocInfo?.name} is now Green (Low Crowd). Nudge will trigger for subscribers!`);
      setTimeout(() => setDemoFeedback(''), 4500);
    } catch (err) {
      console.error('Drop error:', err);
      setDemoFeedback('❌ Failed to drop crowd.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="bio-page">
      {/* Header */}
      <div className="bio-header">
        <div className="bio-header-content">
          <div>
            <h1>⬡ VIT BIOMETRIC KIOSK</h1>
            <p>Simulated Access Terminal • Campus Turnstile Sensor</p>
          </div>
          <button
            type="button"
            className="btn-demo-tools-toggle"
            onClick={() => setShowDemoTools(!showDemoTools)}
          >
            {showDemoTools ? '✕ Close Demo Tools' : '⚙ Demo Tools'}
          </button>
        </div>
      </div>

      <div className="bio-container">
        {/* =========================================================
            DEMO CONTROLS PANEL (COLLAPSIBLE ADMIN / TESTING TOOL)
            ========================================================= */}
        {showDemoTools && (
          <div className="demo-tools-panel">
            <div className="demo-tools-header">
              <span className="demo-tag">ADMIN & DEMO CONTROLS</span>
              <h4>Manual Headcount Override & Scenarios</h4>
              <p>Instantly jump crowd counts with hard capacity limits, or test PRISM triggers.</p>
            </div>

            <div className="demo-tools-grid">
              {/* Facility Picker */}
              <div className="demo-field">
                <label>Target Facility</label>
                <select
                  value={demoFacilityId}
                  onChange={(e) => setDemoFacilityId(e.target.value)}
                  className="demo-select"
                >
                  {allLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({facilityCounts[loc.id] || 0} / {loc.capacity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Headcount adjustment stepper */}
              <div className="demo-field">
                <label>Step Amount (People)</label>
                <div className="stepper-row">
                  <button type="button" onClick={() => setDemoAdjustment(Math.max(1, demoAdjustment - 5))}>-5</button>
                  <button type="button" onClick={() => setDemoAdjustment(Math.max(1, demoAdjustment - 1))}>-1</button>
                  <span className="stepper-value">±{demoAdjustment}</span>
                  <button type="button" onClick={() => setDemoAdjustment(demoAdjustment + 1)}>+1</button>
                  <button type="button" onClick={() => setDemoAdjustment(demoAdjustment + 5)}>+5</button>
                  <button type="button" onClick={() => setDemoAdjustment(demoAdjustment + 15)}>+15</button>
                </div>
              </div>
            </div>

            {/* Live Count Status in Demo Panel */}
            <div className="demo-stat-pill">
              <strong>{currentDemoLocInfo?.name}:</strong> {currentDemoCount} / {currentDemoLocInfo?.capacity} people
              ({Math.round((currentDemoCount / (currentDemoLocInfo?.capacity || 1)) * 100)}% capacity)
            </div>

            {/* Add / Remove buttons with hard limits */}
            <div className="demo-action-buttons">
              <button
                type="button"
                className="btn-demo-add"
                onClick={() => handleModifyHeadcount(true)}
              >
                + Add {demoAdjustment} People
              </button>
              <button
                type="button"
                className="btn-demo-remove"
                onClick={() => handleModifyHeadcount(false)}
              >
                - Remove {demoAdjustment} People
              </button>
            </div>

            {/* Special scenario triggers */}
            <div className="demo-scenario-row">
              <button
                type="button"
                className="btn-scenario-seed"
                onClick={handleSeedBalanced}
                disabled={seeding}
              >
                🎲 Seed Balanced Turnover
              </button>
              <button
                type="button"
                className="btn-scenario-burst"
                onClick={handleSeedBurst}
                disabled={seeding}
                title="Creates a rapid 3-minute check-in burst to trigger PRISM acceleration"
              >
                ⚡ Trigger PRISM Surge
              </button>
              <button
                type="button"
                className="btn-scenario-green"
                onClick={handleDropToGreen}
                disabled={seeding}
                title="Drops facility headcount below 40% capacity to trigger Quiet Window notification"
              >
                🟢 Drop to Green Nudge
              </button>
            </div>

            {demoFeedback && <div className="demo-feedback-banner">{demoFeedback}</div>}
          </div>
        )}

        {/* =========================================================
            MAIN BIOMETRIC SCANNER KIOSK INTERFACE
            ========================================================= */}
        <div className="bio-card">
          {/* Facility Selection */}
          <div className="bio-selectors-grid">
            <div className="bio-select-group">
              <label>Facility Category</label>
              <select
                className="bio-select"
                value={selectedCategory}
                onChange={handleCategoryChange}
              >
                {Object.entries(facilities).map(([id, cat]) => (
                  <option key={id} value={id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>

            <div className="bio-select-group">
              <label>Location Turnstile</label>
              <select
                className="bio-select"
                value={selectedLocation}
                onChange={handleLocationChange}
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} (Live: {facilityCounts[loc.id] || 0}/{loc.capacity})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Reg Number Input / Preset Selector */}
          <div className="bio-reg-box">
            <div className="bio-reg-label-row">
              <label>Student Registration Credential</label>
              <button
                type="button"
                className="btn-switch-custom"
                onClick={() => setIsCustomReg(!isCustomReg)}
              >
                {isCustomReg ? 'Choose Demo Student' : 'Type Custom Reg No'}
              </button>
            </div>

            {isCustomReg ? (
              <input
                type="text"
                className="bio-reg-input"
                placeholder="e.g. 26BCE2885"
                value={customReg}
                onChange={(e) => setCustomReg(e.target.value)}
              />
            ) : (
              <select
                className="bio-select"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
              >
                {DEMO_STUDENTS.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.id} — {s.name}
                  </option>
                ))}
              </select>
            )}
            <div className="bio-reg-hint">
              Scanning <strong>{activeRegNumber}</strong> will automatically toggle <strong>Entry</strong> if outside, or <strong>Exit</strong> if inside.
            </div>
          </div>

          {/* Biometric Scanner Fingerprint Visual */}
          <div
            className={`fingerprint-area ${scanState}`}
            onClick={scanState === 'idle' ? handleScan : undefined}
            title="Click to simulate scan"
          >
            <div className="fingerprint-svg">
              {scanState === 'entry-verified' || scanState === 'exit-verified' || scanState === 'denied' ? '' : '🖐️'}
            </div>

            {scanState === 'scanning' && <div className="scan-line" />}

            {scanState === 'entry-verified' && (
              <div className="verified-badge verified-entry">
                <span className="badge-icon">✅</span>
                <span className="badge-text">ENTRY VERIFIED</span>
              </div>
            )}

            {scanState === 'exit-verified' && (
              <div className="verified-badge verified-exit">
                <span className="badge-icon">🚪</span>
                <span className="badge-text">EXIT VERIFIED</span>
              </div>
            )}

            {scanState === 'denied' && (
              <div className="verified-badge verified-denied">
                <span className="badge-icon">🚫</span>
                <span className="badge-text">FACILITY FULL</span>
              </div>
            )}
          </div>

          {/* Status Message Text */}
          <div className={`bio-status status-${scanState}`}>
            {statusMsg}
          </div>

          {/* Scan Action Button */}
          <button
            type="button"
            className="bio-scan-btn"
            onClick={handleScan}
            disabled={scanState === 'scanning'}
          >
            {scanState === 'scanning' ? '⏳ Verifying Identity...' :
             scanState === 'entry-verified' ? '✅ Entry Recorded (+1)' :
             scanState === 'exit-verified' ? '🚪 Exit Recorded (-1)' :
             scanState === 'denied' ? '🚫 Facility At Capacity' :
             `🔬 Scan Fingerprint (${activeRegNumber})`}
          </button>

          {/* Footer Navigation */}
          <div className="bio-footer-links">
            <Link to="/facilities" className="bio-flow-link">
              ← Return to Flow Crowd Tracker
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BiometricScanner;

