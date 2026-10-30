#!/usr/bin/env bash
set -e

echo "=== Starting 15-Commit Structured Push ==="

# 1. Pipeline & Split
echo "--- Commit 1/15: Data pipeline & split architecture ---"
git add src/split.py src/data_loader.py artifacts/split.json tests/test_split.py
git commit -m "feat(pipeline): implement chronological 80/20 train-test split with zero-leakage guarantee"

# 2. Features & Baselines
echo "--- Commit 2/15: Features & Baselines ---"
git add src/features.py src/baselines.py data_dictionary.md
git commit -m "feat(models): implement calendar/fourier feature engineering and seasonal naive baselines"

# 3. Direct LightGBM
echo "--- Commit 3/15: Direct LightGBM models ---"
git add src/models.py tests/test_phase_b.py
git commit -m "feat(models): build 51 direct LightGBM models with ratio targets for peak demand extrapolation"

# 4. Reconciliation
echo "--- Commit 4/15: MinTrace Reconciliation Pipeline ---"
git add src/reconcile_pipeline.py src/validation_experiment.py artifacts/metrics/validation_comparison.csv artifacts/metrics/test_metrics_by_level.csv artifacts/metrics/test_metrics_by_horizon.csv
git commit -m "feat(reconciliation): implement MinTrace shrinkage reconciliation across 51-node grid hierarchy"

# 5. Split-Conformal Calibration
echo "--- Commit 5/15: Conformal Calibration ---"
git add src/conformal.py artifacts/metrics/conformal_coverage.csv artifacts/metrics/historical_ranges.json artifacts/metrics/node_residual_variances.json
git commit -m "feat(uncertainty): calibrate distribution-free split-conformal 80% and 95% prediction intervals"

# 6. Reconciled Test Forecasts
echo "--- Commit 6/15: Reconciled Test Forecasts Artifacts ---"
git add artifacts/metrics/reconciled_test_forecasts.csv artifacts/metrics/stress_reference_metrics.json
git commit -m "chore(artifacts): store 983-day holdout reconciled multi-horizon forecasts and reference metrics"

# 7. Scenario Engine
echo "--- Commit 7/15: Scenario Engine (KKT Solver) ---"
git add src/scenario.py tests/test_scenario.py
git commit -m "feat(scenario): add quadratic programming KKT solver for covariance-aware grid stress redistribution"

# 8. Operational Stress Alerts
echo "--- Commit 8/15: Operational Stress Alerts ---"
git add src/alerts.py tests/test_alerts.py
git commit -m "feat(alerts): add multi-level operational stress indicators and reserve threshold rules"

# 9. Avoided Mismatch & Valuation
echo "--- Commit 9/15: Avoided Mismatch & Valuation ---"
git add src/savings.py artifacts/metrics/savings_baseline_summary.json tests/test_savings.py
git commit -m "feat(valuation): implement avoided mismatch calculation with CERC/IEX benchmarks and bootstrap CI"

# 10. Operational Scripts & CLI
echo "--- Commit 10/15: Operational Scripts & CLI ---"
git add scripts/audit_columns.py scripts/cli.py scripts/drift_check.py scripts/create_commits_and_push.sh artifacts/metrics/drift_status.json
git commit -m "feat(scripts): add column auditing tool, model drift monitor, and unified operator CLI"

# 11. Production Containerization & CI
echo "--- Commit 11/15: Docker & CI Workflow ---"
git add Dockerfile.api Dockerfile.frontend docker-compose.yml nginx.conf .env.example .github/workflows/ci.yml
git commit -m "ci(docker): add multi-stage containerization, nginx reverse proxy, and GitHub Actions CI workflow"

# 12. Documentation & Model Card
echo "--- Commit 12/15: Documentation & Model Card ---"
git add README.md MODEL_CARD.md DECISIONS.md
git commit -m "docs: update system architecture, comprehensive Model Card, and architectural decision records"

# 13. REST Microservice Endpoints
echo "--- Commit 13/15: REST Microservice Endpoints ---"
git add api/main.py api/model_service.py api/schemas.py tests/conftest.py tests/test_api.py
git commit -m "feat(api): expand REST microservice with scenario, backtest, savings, and hierarchy endpoints"

# 14. Frontend Modular Views
echo "--- Commit 14/15: Frontend Modular Views ---"
git add frontend/src/api.js frontend/src/pages/
git commit -m "feat(frontend): implement 7 modular control-room views with Chart.js telemetry integration"

# 15. Frontend Design System & Typography
echo "--- Commit 15/15: Frontend Design System & Typography ---"
git add frontend/src/App.css frontend/src/App.jsx
git commit -m "style(frontend): enhance UI theme with safety blue, electric blue, high-vis yellow, and Outfit fonts"

echo "=== All 15 Commits Created Successfully! ==="
git log -n 16 --oneline

echo "=== Pushing to GitHub (origin/main) ==="
git push origin main

echo "=== Git Push Completed Successfully! ==="
