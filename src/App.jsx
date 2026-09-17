// App.jsx — SILHOUETTE-SHIFT Game Router (Itch.io Compatible)
import { HashRouter, Routes, Route } from 'react-router-dom';
import SilhouetteGame from './components/SilhouetteGame';
import CampusSelection from './pages/CampusSelection';
import Login from './pages/Login';
import FacilityCategories from './pages/FacilityCategories';
import SubLocations from './pages/SubLocations';
import LiveCrowd from './pages/LiveCrowd';
import BiometricScanner from './pages/BiometricScanner';

function App() {
  return (
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
  );
}

export default App;
