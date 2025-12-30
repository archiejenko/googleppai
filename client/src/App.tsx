import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PitchRecorder from './pages/PitchRecorder';
import PitchAnalysis from './pages/PitchAnalysis';
import Training from './pages/Training';
import LearningPath from './pages/LearningPath';
import Industries from './pages/Industries';
import Team from './pages/Team';
import Pricing from './pages/Pricing';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import ActiveTraining from './pages/ActiveTraining';

import Landing from './pages/Landing';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route element={<AppShell />}>

            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/record" element={<PitchRecorder />} />
            <Route path="/pitch/:id" element={<PitchAnalysis />} />
            <Route path="/training" element={<Training />} />
            <Route path="/learning-path" element={<LearningPath />} />
            <Route path="/industries" element={<Industries />} />
            <Route path="/team" element={
              <ProtectedRoute roles={['admin', 'team_lead']}>
                <Team />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/active-training" element={<ActiveTraining />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

