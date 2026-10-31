import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button/Button';
import { Panel } from '../components/Panel/Panel';
import styles from './NotFoundPage.module.css';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)' }}>
      <div className={styles.centerBox}>
        <Panel
          title="Page not found (404)"
          subtitle="The requested URL does not match any route in the TerraWatt v2 hierarchy."
        >
          <div className={styles.content}>
            <p className={styles.message}>
              You may have followed an outdated link or mistyped the URL. Use the navigation links above or return to the national demand overview.
            </p>
            <div className={styles.actions}>
              <Link to="/overview" style={{ textDecoration: 'none' }}>
                <Button variant="primary">Go to National Overview</Button>
              </Link>
              <Link to="/energy-flow" style={{ textDecoration: 'none' }}>
                <Button variant="secondary">View Energy Flow</Button>
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
};

