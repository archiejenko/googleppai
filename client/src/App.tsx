import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

