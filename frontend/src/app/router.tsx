import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Shell } from './Shell';
import OverviewPage from '../pages/OverviewPage.tsx';
import ForecastPage from '../pages/ForecastPage.tsx';
import EnergyFlowPage from '../pages/EnergyFlowPage.tsx';
import ScenarioSimulatorPage from '../pages/ScenarioSimulatorPage.tsx';
import BacktestPage from '../pages/BacktestPage.tsx';
import SavingsPage from '../pages/SavingsPage.tsx';
import MethodAndLimitsPage from '../pages/MethodAndLimitsPage.tsx';
import { StyleGuidePage } from '../pages/StyleGuidePage.tsx';
import { NotFoundPage } from '../pages/NotFoundPage.tsx';

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
