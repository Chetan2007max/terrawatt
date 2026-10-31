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
    title: 'Forecast for India, next day',
    question: 'How much electricity is India forecast to use tomorrow, and how does demand split across regions?',
    dataSentenceTemplate: 'For 13 Sep 2026, made on 12 Sep 2026: {value} MU. That is {trend} above the same weekday last week.',
    helpDrawer: {
      plotted: 'Daily electricity demand forecast for India and the five electrical regions (Northern, Western, Southern, Eastern, North Eastern) in Million Units (MU per day).',
      howToRead: 'The headline number shows total national electricity needed tomorrow (for 13 Sep 2026, made on 12 Sep 2026). The regional cards show the geographical split.',
      caveat: 'Statistical forecast based on historical calendar, weather, and load patterns. Not a physical dispatch instruction.',
    },
  },
  forecast: {
    title: 'India demand, next 14 days',
    question: 'How does daily electricity demand evolve over 1 to 14 days, and what are the expected ranges?',
    dataSentenceTemplate: 'At 14-day horizon, national demand is expected at {value} MU with an expected range of {lower} to {upper} MU.',
    helpDrawer: {
      plotted: 'Forecast demand curve from tomorrow (Day 1) out to two weeks (Day 14), with calibrated prediction intervals.',
      howToRead: 'The solid blue line is the reconciled forecast. Shaded bands show the expected range. On past data the real value fell inside the dark band 90 percent of the time.',
      caveat: 'Prediction bands reflect historical out-of-sample forecast variance; extreme grid disruptions (storms, unplanned generation outages) may fall outside.',
    },
  },
  'energy-flow': {
    title: 'Hierarchical energy flow & coherence',
    question: 'How does electricity demand split across India’s regions and states, and do the parts add up to the whole?',
    dataSentenceTemplate: 'The five regions add up to the national total to zero error ({gap} MU gap).',
    helpDrawer: {
      plotted: 'Sankey diagram tracing the distribution of electricity demand from the National Total through 5 Regions to 45 individual States and industrial bulk consumers.',
      howToRead: 'Ribbon thickness is proportional to daily electricity volume (MU). Hovering any path shows that node’s exact share of parent and national total.',
      caveat: 'Shows demand volume allocation across reporting accounts, not physical electrical power flows or transmission line power transfers.',
    },
  },
  scenario: {
    title: 'Stress scenario simulator',
    question: 'What happens to the power grid if one state or region suffers an extreme heatwave or demand surge?',
    dataSentenceTemplate: 'Simulated a {shock}% demand shock on {target}. The mathematical solver redistributed {delta} MU across related nodes.',
    helpDrawer: {
      plotted: 'Impact of an artificial demand shift across all 51 nodes, comparing a naive percentage scale against a covariance-aware KKT quadratic optimization.',
      howToRead: 'Adjust the shock slider or pick a node to increase or decrease demand. Pinned nodes stay strictly fixed while the rest absorb the adjustment coherently.',
      caveat: 'Scenarios test mathematical additivity and historical co-movement; they do not simulate transmission line capacity limits or generator ramp rates.',
    },
  },
  backtest: {
    title: 'Hold-out backtest & accuracy audit',
    question: 'How accurate was the forecasting model on 983 frozen test days that the algorithm never saw during training?',
    dataSentenceTemplate: 'Across 983 holdout test days, reconciled forecasting achieved {wape}% WAPE, outperforming separate forecasts for each place by {gain}%.',
    helpDrawer: {
      plotted: 'Side-by-side accuracy comparison across 983 hold-out days (2024 to 2026) between separate unadjusted forecasts and MinTrace reconciled forecasts.',
      howToRead: 'Lower error is better. WAPE (Weighted Absolute Percentage Error) weights errors by demand volume so large errors on big days matter more.',
      caveat: 'Evaluation uses strict rolling chronological evaluation with zero future information leakage.',
    },
  },
  savings: {
    title: 'What could better forecasts be worth?',
    question: 'How much mismatch volume and imbalance cost is avoided by using reconciled forecasts instead of separate desk guesses?',
    dataSentenceTemplate: 'Forecast error avoided: about 6,900 MU a year, 11 percent less than the baseline.',
    helpDrawer: {
      plotted: 'Avoided electricity mismatch volumes and economic valuation under deviation settlement assumptions.',
      howToRead: 'How to read this number: Shows reduction in scheduling penalties when grid operators align on a mathematically coherent forecast.',
      caveat: 'Financial figures are indicative valuations using stated penalty brackets; actual dispatch costs depend on real-time market clearing prices.',
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

