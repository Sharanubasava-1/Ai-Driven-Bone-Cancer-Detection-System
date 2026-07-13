import React from 'react';
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { HistoryPage } from './pages/HistoryPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

function AppShell() {
  const location = useLocation();

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">B</div>
          <div>
            <p className="eyebrow">Clinical imaging workspace</p>
            <h1>BoneScan Care</h1>
          </div>
        </div>

        <nav className="main-nav" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Home</NavLink>
          <NavLink to="/analysis" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Analysis</NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>History</NavLink>
          <NavLink to="/about" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>About</NavLink>
        </nav>

        <div className="header-status">
          <span className="status-dot" aria-hidden="true" />
          <span>{location.pathname === '/' ? 'Overview ready' : 'Secure clinical review'}</span>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>For research and clinical support workflows only. Results should be reviewed by qualified medical staff.</p>
        <Link to="/analysis" className="footer-link">Start a new analysis</Link>
      </footer>
    </div>
  );
}

export default App;
