import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/tokens.css';
import './styles/touch.css';

import AppShell from './components/AppShell/AppShell';
import Dashboard from './pages/Dashboard';
import Recalls from './pages/Recalls';
import Machines from './pages/Machines';
import About from './pages/About';
import Maintenance from './pages/Maintenance';
import MachineDetail from './pages/MachineDetail';
import MaintenanceHistory from './pages/MaintenanceHistory';
import CyclesHistory from './pages/CyclesHistory';
import LogCycle from './pages/LogCycle';
import SporeQueue from './pages/SporeQueue';
import PMQueue from './pages/PMQueue';
import Decon from './pages/Decon';
import ControlQueue from './pages/ControlQueue';
import Transport from './pages/Transport';
import Reports from './pages/Reports';

import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

import AuthProvider from './context/AuthContext.jsx';
import ToastProvider from './components/Toast/ToastProvider.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppShell>
            <ErrorBoundary>
              <Routes>
                {/* Public */}
                <Route path="/" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Auth-only */}
                <Route
                  path="/recalls"
                  element={
                    <ProtectedRoute>
                      <Recalls />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/machines"
                  element={
                    <ProtectedRoute>
                      <Machines />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/machines/:id"
                  element={
                    <ProtectedRoute>
                      <MachineDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/machines/:id/maintenance"
                  element={
                    <ProtectedRoute>
                      <MaintenanceHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/machines/:id/cycles"
                  element={
                    <ProtectedRoute>
                      <CyclesHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/maintenance"
                  element={
                    <ProtectedRoute>
                      <Maintenance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cycles"
                  element={
                    <ProtectedRoute>
                      <LogCycle />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/spores"
                  element={
                    <ProtectedRoute>
                      <SporeQueue />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/decon"
                  element={
                    <ProtectedRoute>
                      <Decon />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/transport"
                  element={
                    <ProtectedRoute>
                      <Transport />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/controls"
                  element={
                    <ProtectedRoute>
                      <ControlQueue />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pm"
                  element={
                    <ProtectedRoute>
                      <PMQueue />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <Reports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/about"
                  element={
                    <ProtectedRoute>
                      <About />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </AppShell>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
