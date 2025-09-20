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
import CycleHistory from "./pages/CyclesHistory";

import AuthProvider from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ToastProvider from "./components/Toast/ToastProvider.jsx";
import NotFound from "./pages/NotFound";
import LogCycle from "./pages/LogCycle";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppShell>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/recalls" element={<Recalls />} />
              <Route path="/machines" element={<Machines />} />
              <Route path="/machines/:id" element={<MachineDetail />} />
              <Route
                path="/machines/:id/maintenance"
                element={<MaintenanceHistory />}
              />
              <Route path="/machines/:id/cycles" element={<CycleHistory />} />

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

              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppShell>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
