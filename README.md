# 🌊 Flow — Real-Time Campus Crowd Tracker

**Flow** is a real-time crowd tracking and AI predictive intelligence platform built for VIT University campuses. Students can monitor live occupancy across campus dining halls, libraries, gyms, pools, and sports courts, backed by **PRISM** (Proactive Real-time Intelligence & Surveillance Monitor).

---

## 🌟 Key Features

- **🏛️ Campus Selection & University Portal**:
  - Official VIT university portal styling.
  - Active campus: **VIT Vellore** (with VIT Chennai, VIT-AP, and VIT Bhopal listed as upcoming).
  - Security **Canvas CAPTCHA** with dynamic distortion lines, rotation, and refresh controls.
  - Demo Account: `26BCE2885` / `PETERVIT26`.

- **📊 Live Crowd Tracking (Read-Only)**:
  - Real-time Firestore sync with active check-ins within the last 45 minutes (auto-expiring older check-ins).
  - High-contrast color-coded indicators:
    - 🟢 **Low Crowd**: < 40% capacity
    - 🟡 **Moderate**: 40% – 75% capacity
    - 🔴 **Crowded**: > 75% capacity
  - Occupancy progress bars and capacity ratios.

- **⚡ PRISM Monitoring Layer**:
  - Sits between raw sensor turnstile inputs and student dashboards.
  - Recomputes arrival rates over rolling 5-minute windows (last 5 min vs. 5–10 min ago).
  - **Acceleration Detection**: Automatically classifies arrival velocity into `Accelerating`, `Steady`, or `Cooling down`.
  - **Zero-Stall AI Forecasting**: Enriches AI crowd forecasting prompts with PRISM acceleration metrics, backed by a self-healing rule engine fallback.
  - **System Health HUD**: Transparent panel showing live model health, accuracy rating, auto-recovered failures, and autonomous nudge history.

- **🔔 Opt-in Smart Nudge Notifications**:
  - Per-student facility subscriptions stored in Firestore (`notification_prefs/{regNumber}`).
  - **Dual autonomous triggers**:
    1. Facility transitions into **Green** (low crowd window).
    2. PRISM flags arrival acceleration (surging traffic alert).
  - In-app animated toast banner with tap-to-view navigation.
  - 15-minute cooldown per facility to prevent notification spam.

- **🔬 VIT Biometric Kiosk (`/biometric`)**:
  - Dedicated turnstile terminal interface.
  - **Smart Entry / Exit Toggle**: First scan checks student in (`Entry Verified` in green, +1 count); second scan checks student out (`Exit Verified` in amber, -1 count).
  - **Capacity Protection**: Rejects entry with `Access Denied — Facility Full` if a venue hits 100% capacity.
  - **Demo Controls ("⚙ Demo Tools")**:
    - Add/remove crowd counts with hard limits (capped at max capacity, floored at zero).
    - Scenario triggers: *Seed Balanced Turnover*, *Trigger PRISM Surge*, and *Drop to Green Nudge*.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/jrp08081212/flow-flow.git
cd flow-flow

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open your browser at:
- **Flow Student App**: [http://localhost:3000/](http://localhost:3000/)
- **VIT Biometric Kiosk**: [http://localhost:3000/biometric](http://localhost:3000/biometric)

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, React Router v6
- **Database & Sync**: Firebase Firestore (real-time snapshot listeners)
- **AI Forecasting**: PRISM Telemetry Engine + LLM Integration (OpenAI / Gemini / Fallback Rule Core)
- **Styling**: Modern, responsive CSS with mobile-first layout and high-contrast projector themes

