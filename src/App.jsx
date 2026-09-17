import React, { Component } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import SilhouetteGame from './components/SilhouetteGame';
import CampusSelection from './pages/CampusSelection';
import Login from './pages/Login';
import FacilityCategories from './pages/FacilityCategories';
import SubLocations from './pages/SubLocations';
import LiveCrowd from './pages/LiveCrowd';
import BiometricScanner from './pages/BiometricScanner';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '32px', color: '#fff', background: '#07090e', fontFamily: 'monospace', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ color: '#ff2a6d', marginBottom: '16px' }}>SYSTEM RECOVERY</h1>
          <p style={{ color: '#94a3b8', marginBottom: '16px', maxWidth: '600px', textAlign: 'center' }}>
            {this.state.error?.message || String(this.state.error)}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '12px 24px', background: '#00f0ff', color: '#07090e', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            RELOAD INTERFACE
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
      <Routes>
        {/* Flagship: SILHOUETTE-SHIFT Itch.io Game */}
        <Route path="/" element={<SilhouetteGame />} />
        <Route path="/game" element={<SilhouetteGame />} />
        <Route path="/silhouette-shift" element={<SilhouetteGame />} />

        {/* Legacy Routes */}
        <Route path="/campus" element={<CampusSelection />} />
        <Route path="/login" element={<Login />} />
        <Route path="/facilities" element={<FacilityCategories />} />
        <Route path="/facilities/:categoryId" element={<SubLocations />} />
        <Route path="/location/:locationId" element={<LiveCrowd />} />
        <Route path="/biometric" element={<BiometricScanner />} />
      </Routes>
    </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
