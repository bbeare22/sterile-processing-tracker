import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./styles/tokens.css";

import AppShell from "./components/AppShell/AppShell";
import Dashboard from "./pages/Dashboard";
import Recalls from "./pages/Recalls";
import Machines from "./pages/Machines";
import About from "./pages/About";
import Maintenance from "./pages/Maintenance";
import MachineDetail from "./pages/MachineDetail";
import MaintenanceHistory from "./pages/MaintenanceHistory";
import CyclesHistory from "./pages/CyclesHistory";
import LogCycle from "./pages/LogCycle";

import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

import AuthProvider from "./context/AuthContext.jsx";
import ToastProvider from "./components/Toast/ToastProvider.jsx";
import ProtectedRoute from "./components/ProtectedRoute";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppShell>
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
          </AppShell>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
