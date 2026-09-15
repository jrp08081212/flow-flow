// Screen 1: Campus Selection
// Shows 4 VIT campus options. Only "VIT Vellore" is clickable.
// The others appear grayed out with "Coming Soon".

import { useNavigate } from 'react-router-dom';

function CampusSelection() {
  const navigate = useNavigate();

  const campuses = [
    { id: 'vellore', name: 'VIT Vellore', city: 'Tamil Nadu', icon: '🏛️', active: true },
    { id: 'chennai', name: 'VIT Chennai', city: 'Tamil Nadu', icon: '🌆', active: false },
    { id: 'ap',      name: 'VIT-AP',      city: 'Andhra Pradesh', icon: '🏔️', active: false },
    { id: 'bhopal',  name: 'VIT Bhopal',  city: 'Madhya Pradesh', icon: '🕌', active: false },
  ];

  const handleCampusClick = (campus) => {
    if (campus.active) {
      navigate('/login');
    }
  };

  return (
    <div className="campus-page">
      <div className="campus-logo">🌊</div>
      <h1 className="campus-title">Flow</h1>
      <p className="campus-tagline">Real-time Campus Crowd Tracker</p>

      <div className="campus-grid">
        {campuses.map((campus) => (
          <div
            key={campus.id}
            className={`campus-card ${campus.active ? 'campus-card--active' : 'campus-card--disabled'}`}
            onClick={() => handleCampusClick(campus)}
          >
            <div className="campus-card-icon">{campus.icon}</div>
            <div className="campus-card-name">{campus.name}</div>
            <div className="campus-card-status">
              {campus.active ? campus.city : 'Coming Soon'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CampusSelection;
