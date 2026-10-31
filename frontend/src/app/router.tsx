import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Shell } from './Shell';
import OverviewPage from '../pages/OverviewPage';
import ForecastPage from '../pages/ForecastPage';
import EnergyFlowPage from '../pages/EnergyFlowPage';
import ScenarioSimulatorPage from '../pages/ScenarioSimulatorPage';
import BacktestPage from '../pages/BacktestPage';
import SavingsPage from '../pages/SavingsPage';
import MethodAndLimitsPage from '../pages/MethodAndLimitsPage';
import { StyleGuidePage } from '../pages/StyleGuidePage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'forecast', element: <ForecastPage /> },
      { path: 'energy-flow', element: <EnergyFlowPage /> },
      { path: 'scenario', element: <ScenarioSimulatorPage /> },
      { path: 'backtest', element: <BacktestPage /> },
      { path: 'savings', element: <SavingsPage /> },
      { path: 'method', element: <MethodAndLimitsPage /> },
      { path: 'styleguide', element: <StyleGuidePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
