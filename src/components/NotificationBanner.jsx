// Notification Banner / Toast
// Displayed prominently when a subscribed facility triggers a nudge:
// 1. Facility transitions into Green (low crowd)
// 2. PRISM flags arrival acceleration (surge warning)
// Clicking the banner routes directly to that facility's Live Crowd screen.

import { useNavigate } from 'react-router-dom';

function NotificationBanner({ notification, onDismiss }) {
  const navigate = useNavigate();

  if (!notification) return null;

  const handleClick = () => {
    if (notification.facilityId) {
      navigate(`/location/${notification.facilityId}`);
    }
    if (onDismiss) onDismiss();
  };

  const isSurge = notification.triggerType === 'acceleration';

  return (
    <div
      className={`nudge-banner ${isSurge ? 'nudge-surge' : 'nudge-quiet'}`}
      onClick={handleClick}
      role="alert"
    >
      <div className="nudge-banner-icon">
        {isSurge ? '⚡' : '🟢'}
      </div>
      <div className="nudge-banner-content">
        <div className="nudge-banner-header">
          <span className="nudge-banner-title">
            {isSurge ? 'PRISM Surge Alert' : 'Quiet Window Alert'}
          </span>
          <span className="nudge-banner-badge">{notification.facilityName}</span>
        </div>
        <p className="nudge-banner-text">{notification.message}</p>
        <span className="nudge-banner-hint">Tap to view live crowd →</span>
      </div>
      <button
        type="button"
        className="nudge-banner-close"
        onClick={(e) => {
          e.stopPropagation();
          if (onDismiss) onDismiss();
        }}
        aria-label="Dismiss alert"
      >
        ✕
      </button>
    </div>
  );
}

export default NotificationBanner;
