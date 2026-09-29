import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { PatientPage } from './pages/PatientPage';
import './App.css';

function AppRoutes() {
  const { user, initializing } = useAuth();

  // Avoid bouncing to /login before the session cookie has been checked.
  if (initializing) return null;

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/journal" replace /> : <LoginPage />}
      />
      <Route
        path="/journal"
        element={user ? <PatientPage /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
