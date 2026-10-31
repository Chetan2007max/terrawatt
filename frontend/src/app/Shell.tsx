import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { TopBar } from '../components/TopBar/TopBar';
import { useUrlState } from '../lib/url-state';
import styles from './Shell.module.css';

export const Shell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useUrlState();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const params = new URLSearchParams(window.location.search);
    const paramTheme = params.get('theme');
    if (paramTheme === 'dark' || paramTheme === 'light') return paramTheme;
    const saved = localStorage.getItem('tw_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('tw_theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('tw_theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Determine active page ID from path
  const currentPath = location.pathname.replace(/^\//, '') || 'overview';
  const activePageId = currentPath.split('/')[0] || 'overview';

  const handlePageSelect = (pageId: string) => {
    navigate(`/${pageId}${location.search}`);
  };

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>

      <TopBar
        activePageId={activePageId}
        onPageSelect={handlePageSelect}
        dataAsOfDate={state.date}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      <main id="main-content" className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer} role="contentinfo">
        <div className="container">
          <div className={styles.footerInner}>
            <p className={styles.footerText}>
              TerraWatt v2 · Coherent Hierarchical Electricity Demand Intelligence. Data compiled daily from Grid Controller of India reports.
              Forecasts are statistical predictions; scenarios are mathematical redistributions; alerts are heuristic indicators.
            </p>
            <div className={styles.footerLinks}>
              <Link to="/method" className={styles.footerLink}>Method &amp; Limits</Link>
              <span className={styles.sep}>·</span>
              <Link to="/styleguide" className={styles.footerLink}>Internal Style Guide</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
