// App.jsx — The main "router" that decides which screen to show
// based on the URL path. Think of it as a switchboard.
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CampusSelection from './pages/CampusSelection';
import Login from './pages/Login';
import FacilityCategories from './pages/FacilityCategories';
import SubLocations from './pages/SubLocations';
import LiveCrowd from './pages/LiveCrowd';
import BiometricScanner from './pages/BiometricScanner';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Screen 1: Pick your campus */}
        <Route path="/" element={<CampusSelection />} />

        {/* Screen 2: Log in with your VIT credentials */}
        <Route path="/login" element={<Login />} />

        {/* Screen 3: Choose a facility category (Messes, Gyms, etc.) */}
        <Route path="/facilities" element={<FacilityCategories />} />

        {/* Screen 4: See specific locations within a category */}
        <Route path="/facilities/:categoryId" element={<SubLocations />} />

        {/* Screen 5: Live crowd data for a specific location */}
        <Route path="/location/:locationId" element={<LiveCrowd />} />

        {/* Biometric Scanner: separate terminal interface */}
        <Route path="/biometric" element={<BiometricScanner />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
