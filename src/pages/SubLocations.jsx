// Screen 4: Sub-Locations
// Shows the specific locations within a chosen category.
// For example, tapping "Gyms" shows Gym 1 and Gym 2 with live crowd pills.

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { facilities, getCrowdStatus } from '../data/facilities';
import { analyzeArrivalAcceleration } from '../services/prism';

function SubLocations() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [trends, setTrends] = useState({});

  // Check login
  const user = JSON.parse(sessionStorage.getItem('flow_user') || 'null');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const category = facilities[categoryId];
    if (!category) return;

    const locIds = category.locations.map(l => l.id);
    const q = query(collection(db, 'checkins'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const cutoff = 45 * 60 * 1000;
      const newCounts = {};
      const newTimestamps = {};

      locIds.forEach(id => {
        newCounts[id] = 0;
        newTimestamps[id] = [];
      });

      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.status === 'exited') return;
        if (locIds.includes(data.locationId) && data.timestamp) {
          const ts = data.timestamp.toMillis();
          if (now - ts <= cutoff) {
            newCounts[data.locationId] = (newCounts[data.locationId] || 0) + 1;
            newTimestamps[data.locationId].push(ts);
          }
        }
      });

      const newTrends = {};
      locIds.forEach(id => {
        const prism = analyzeArrivalAcceleration(newTimestamps[id] || []);
        newTrends[id] = prism.trend;
      });

      setCounts(newCounts);
      setTrends(newTrends);
    }, (err) => console.warn('SubLocations snapshot listener warning:', err.message));

    return () => unsubscribe();
  }, [categoryId]);

  const category = facilities[categoryId];
  if (!category) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="header-left">
            <button className="back-btn" onClick={() => navigate('/facilities')}>←</button>
            <div><h1>Not Found</h1></div>
          </div>
        </div>
        <div className="page-content">
          <p>This facility category doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/facilities')}>←</button>
          <div>
            <h1>{category.icon} {category.name}</h1>
            <span className="subtitle">VIT Vellore • Choose a location</span>
          </div>
        </div>
      </div>

      {/* Location cards */}
      <div className="page-content">
        <div className="locations-list">
          {category.locations.map((location) => {
            const count = counts[location.id] || 0;
            const status = getCrowdStatus(count, location.capacity);
            const trend = trends[location.id] || 'steady';

            return (
              <Link
                key={location.id}
                to={`/location/${location.id}`}
                className="location-card"
              >
                <div className="location-card-left">
                  <div className="location-name-row">
                    <span className="location-name">{location.name}</span>
                    {trend === 'accelerating' && (
                      <span className="badge-surge-mini">⚡ Accelerating</span>
                    )}
                  </div>
                  <div className="location-meta-row">
                    <span className={`crowd-pill pill-${status.level}`}>
                      {status.label} ({count} / {location.capacity})
                    </span>
                  </div>
                </div>

                <div className="location-card-right">
                  <span className="category-arrow">›</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SubLocations;
