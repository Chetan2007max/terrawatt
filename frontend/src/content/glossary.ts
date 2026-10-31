/**
 * Plain-language glossary of energy, statistics, and modeling terms (Section 5)
 * Aimed at grade 8 reading level.
 */

export interface GlossaryEntry {
  term: string;
  definition: string;
  example?: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  MU: {
    term: 'MU (Million Units)',
    definition: 'One million kilowatt-hours (kWh). One unit is 1 kWh, roughly the electricity used by a typical Indian household in 2–3 days.',
  },
  forecast: {
    term: 'Forecast',
    definition: 'A statistical estimate of how much electricity will be needed in the future based on past demand, seasons, and calendar dates.',
  },
  reconciled: {
    term: 'Reconciled (MinTrace)',
    definition: 'Adjusted using math so numbers match: state forecasts add up to their region, and region forecasts add up to the national total.',
  },
  'prediction range': {
    term: 'Prediction Range (Conformal Band)',
    definition: 'A range where actual electricity demand is very likely to fall (95% of the time), based on past model accuracy rather than assumptions.',
  },
  WAPE: {
    term: 'WAPE (Weighted Absolute Percentage Error)',
    definition: 'A measure of overall forecast error: total missed electricity divided by total actual electricity. Lower is better.',
  },
  MAPE: {
    term: 'MAPE (Mean Absolute Percentage Error)',
    definition: 'Average percentage error across days. Can look misleadingly high on days with small numbers.',
  },
  'hold-out test': {
    term: 'Hold-Out Test',
    definition: 'A strict evaluation on 983 recent days (2024 to 2026) that the computer model was never allowed to see during training.',
  },
  backtest: {
    term: 'Backtest',
    definition: 'Testing a forecast method on historical days to check how well it would have worked if used back then.',
  },
  scenario: {
    term: 'Scenario',
    definition: 'A what-if statistical redistribution showing how demand shifts across India if a state or region uses more or less electricity.',
  },
  'stress indicator': {
    term: 'Stress Indicator',
    definition: 'A rule-based check flagging when forecasted demand nears historical records or regional transmission buffer limits.',
  },
  'Other node': {
    term: 'Other Node',
    definition: 'Electricity demand in this region not assigned to any listed state or large direct consumer (e.g. railway lines or special utilities).',
  },
};

