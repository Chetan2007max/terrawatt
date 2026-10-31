export interface PageHeaderCopy {
  title: string;
  question: string;
  dataSentenceTemplate: string;
  helpDrawer: {
    plotted: string;
    howToRead: string;
    caveat: string;
  };
}

export const PAGE_COPY: Record<string, PageHeaderCopy> = {
  overview: {
    title: 'National Electricity Demand Overview',
    question: 'How much electricity is India forecast to use, and how is demand trending across regions?',
    dataSentenceTemplate: 'Forecast for {date}: {value} MU. That is {trend} above the same weekday last week.',
    helpDrawer: {
      plotted: 'Daily electricity demand forecast for India and the five electrical regions (Northern, Western, Southern, Eastern, North Eastern) in Million Units (MU/day).',
      howToRead: 'The headline number shows total national electricity needed tomorrow. The sparkline illustrates the 14-day trajectory. Below it, regional cards show the geographical split.',
      caveat: 'Statistical forecast based on historical calendar, weather, and load patterns. Not a physical dispatch instruction.',
    },
  },
  forecast: {
    title: 'Multi-Horizon Electricity Forecast',
    question: 'How does daily electricity demand evolve over 1 to 14 days, and what are the confidence bounds?',
    dataSentenceTemplate: 'At 14-day horizon, national demand is expected at {value} MU with a 90% range of {lower} to {upper} MU.',
    helpDrawer: {
      plotted: 'Forecast demand curve from tomorrow (Day 1) out to two weeks (Day 14), with 90% and 95% split-conformal prediction intervals.',
      howToRead: 'The solid blue line is the reconciled forecast. The shaded band shows the range where actual demand is expected to land 90% of the time based on past test accuracy.',
      caveat: 'Prediction bands reflect historical out-of-sample forecast variance; extreme grid disruptions (storms, unplanned generation outages) may fall outside.',
    },
  },
  'energy-flow': {
    title: 'Hierarchical Energy Flow & Coherence',
    question: 'How does electricity demand split across India’s regions and states, and do the parts add up to the whole?',
    dataSentenceTemplate: 'All 51 nodes add up: state sums match regional totals, and regional totals match India to zero error ({gap} MU gap).',
    helpDrawer: {
      plotted: 'Sankey diagram tracing the distribution of electricity demand from the National Total through 5 Regions to 45 individual States and industrial bulk consumers.',
      howToRead: 'Ribbon thickness is proportional to daily electricity volume (MU). Hovering any path shows that node’s exact share of parent and national total.',
      caveat: 'Shows demand volume allocation across reporting accounts, not physical electrical power flows or transmission line power transfers.',
    },
  },
  scenario: {
    title: 'Stress Scenario Simulator',
    question: 'What happens to the power grid if one state or region suffers an extreme heatwave or demand surge?',
    dataSentenceTemplate: 'Simulated a {shock}% demand shock on {target}. The mathematical solver redistributed {delta} MU across related nodes.',
    helpDrawer: {
      plotted: 'Impact of an artificial demand shift across all 51 nodes, comparing a naive percentage scale against a covariance-aware KKT quadratic optimization.',
      howToRead: 'Adjust the shock slider or pick a node to increase or decrease demand. Pinned nodes stay strictly fixed while the rest absorb the adjustment coherently.',
      caveat: 'Scenarios test mathematical additivity and historical co-movement; they do not simulate transmission line capacity limits or generator ramp rates.',
    },
  },
  backtest: {
    title: 'Hold-Out Backtest & Accuracy Audit',
    question: 'How accurate was the forecasting model on 983 frozen test days that the algorithm never saw during training?',
    dataSentenceTemplate: 'Across 983 holdout test days, reconciled forecasting achieved {wape}% WAPE, outperforming the seasonal naive baseline by {gain}%.',
    helpDrawer: {
      plotted: 'Side-by-side accuracy comparison across 983 hold-out days (2024 to 2026) between unreconciled and MinTrace reconciled forecasts.',
      howToRead: 'Lower error is better. WAPE (Weighted Absolute Percentage Error) weights errors by demand volume so large errors on big days matter more.',
      caveat: 'Evaluation uses strict rolling chronological evaluation with zero future information leakage.',
    },
  },
  savings: {
    title: 'Avoided Imbalance Cost Valuation',
    question: 'How much money is saved by using reconciled demand forecasts instead of raw desk guesses or persistence?',
    dataSentenceTemplate: 'MinTrace reconciliation avoids {avoided} MU of daily mismatch, generating estimated annual avoided costs of ₹{savings} Crore.',
    helpDrawer: {
      plotted: 'Avoided electricity mismatch volumes and economic valuation under standard CERC DSM (Deviation Settlement Mechanism) price tiers.',
      howToRead: 'Shows reduction in over-scheduling and under-scheduling penalties when grid operators align on a mathematically coherent forecast.',
      caveat: 'Financial figures are indicative valuations using average CERC settlement brackets; actual dispatch costs depend on real-time market clearing prices.',
    },
  },
  method: {
    title: 'Methodology, Models & Operating Limits',
    question: 'How does TerraWatt v2 work under the hood, and what are the system boundaries?',
    dataSentenceTemplate: 'Built on 51 LightGBM models trained on Grid-India reports with MinTrace covariance shrinkage and split-conformal calibration.',
    helpDrawer: {
      plotted: 'Technical summary of model architecture, Fourier calendar features, MinTrace reconciliation formulas, and known boundary conditions.',
      howToRead: 'Review data dictionary, model card parameters, and step-by-step math for the summing matrix S and covariance matrix W.',
      caveat: 'All code, model artifacts, and evaluation splits are open and reproducible.',
    },
  },
};

