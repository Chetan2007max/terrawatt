import React, { useState, useEffect } from "react";
import { checkHealth } from "./api";
import OverviewPage from "./pages/OverviewPage";
import ForecastPage from "./pages/ForecastPage";
import HierarchyExplorerPage from "./pages/HierarchyExplorerPage";
import ScenarioSimulatorPage from "./pages/ScenarioSimulatorPage";
import BacktestPage from "./pages/BacktestPage";
import SavingsPage from "./pages/SavingsPage";
import MethodAndLimitsPage from "./pages/MethodAndLimitsPage";
import "./App.css";

const PAGES = [
  { id: "overview", label: "Overview", icon: "⚡" },
  { id: "forecast", label: "Forecast", icon: "📈" },
  { id: "hierarchy", label: "Hierarchy Explorer", icon: "🌳" },
  { id: "scenario", label: "Scenario Simulator", icon: "🎛️" },
  { id: "backtest", label: "Holdout Backtest", icon: "🧪" },
  { id: "savings", label: "Avoided Mismatch", icon: "💰" },
  { id: "method", label: "Method & Limits", icon: "📖" },
];

function getInitialPage() {
  const hash = window.location.hash.replace("#", "");
  const match = PAGES.find((p) => p.id === hash);
  return match ? match.id : "overview";
}

// React Error Boundary to catch any page-level exceptions gracefully
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="panel error-state">
          <h3>Component Error</h3>
          <p>{this.state.error?.message || "An unexpected rendering error occurred."}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="btn btn-amber"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [connStatus, setConnStatus] = useState("connecting…");
  const [isOnline, setIsOnline] = useState(false);

  // Sync hash routing with window state
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.replace("#", "");
      if (PAGES.some((p) => p.id === hash)) {
        setCurrentPage(hash);
      }
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function navigate(pageId) {
    setCurrentPage(pageId);
    window.history.pushState(null, "", `#${pageId}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Health check on mount and interval
  useEffect(() => {
    async function verifyHealth() {
      try {
        const health = await checkHealth();
        if (health && health.status === "ok") {
          setConnStatus(`connected — ${health.version || "ok"}`);
          setIsOnline(true);
        } else {
          setConnStatus("API connected (degraded)");
          setIsOnline(true);
        }
      } catch {
        setConnStatus("cannot reach API (uvicorn 127.0.0.1:8000)");
        setIsOnline(false);
      }
    }
    verifyHealth();
    const interval = setInterval(verifyHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      {/* Top Header */}
      <header>
        <div className="brand">
          <div className="brand-icon">⚡</div>
          <div>
            <h1>TerraWatt <span className="version-pill mono">v2.0</span></h1>
            <div className="brand-sub mono">National Grid Hierarchical Demand &amp; Stress Platform</div>
          </div>
        </div>
        <div className="header-right">
          <div className={`status ${isOnline ? "online" : "offline"}`}>
            <span className="dot"></span>
            <span className="mono">{connStatus}</span>
          </div>
        </div>
      </header>

      {/* Main Navigation Bar */}
      <nav className="main-nav" aria-label="Main Navigation">
        {PAGES.map((page) => (
          <button
            key={page.id}
            onClick={() => navigate(page.id)}
            className={`nav-btn ${currentPage === page.id ? "active" : ""}`}
            aria-current={currentPage === page.id ? "page" : undefined}
          >
            <span className="nav-icon">{page.icon}</span>
            <span className="nav-label">{page.label}</span>
          </button>
        ))}
      </nav>

      {/* Page Routing wrapped in Error Boundary */}
      <main id="main-content">
        <ErrorBoundary key={currentPage}>
          {currentPage === "overview" && <OverviewPage />}
          {currentPage === "forecast" && <ForecastPage />}
          {currentPage === "hierarchy" && <HierarchyExplorerPage />}
          {currentPage === "scenario" && <ScenarioSimulatorPage />}
          {currentPage === "backtest" && <BacktestPage />}
          {currentPage === "savings" && <SavingsPage />}
          {currentPage === "method" && <MethodAndLimitsPage />}
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer>
        <div className="footer-content mono">
          <div>
            Data: GRID-INDIA (POSOCO) NLDC daily reports | Compiled by Robbie Andrew
          </div>
          <div>
            TerraWatt v2.0.0 • Machine-precision MinTrace Coherence (&lt; 10⁻¹² MU)
          </div>
        </div>
      </footer>
    </div>
  );
}
