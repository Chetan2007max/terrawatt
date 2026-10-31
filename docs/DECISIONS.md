# TerraWatt v2: Architectural & Data Decisions Log (DECISIONS.md)

This log records foundational data engineering, modeling, and architectural decisions, assumptions, and physical interpretations for the TerraWatt v2 project.

---

## Decision 001: Baseline Reliable Cutoff Date (2013-03-31)
* **Date:** 2026-10-30
* **Status:** Implemented in `src/data_loader.py` and `src/split.py`
* **Empirical Context:** In the published GRID-INDIA (POSOCO) dataset, between 2013-01-03 and 2013-03-30 (~87 days), state, regional, and national demand and generation columns are simultaneously unpopulated (NaN).
* **Decision:**
  1. Rows in this 87-day window are flagged via `is_data_reliable = False`. They are never interpolated (interpolating 87 consecutive days would fabricate numbers).
  2. All training, validation, feature tuning, and test evaluation sets strictly require `is_data_reliable == True`, establishing **2013-03-31** as the first reliable date.
  3. Isolated corrupted values in POSOCO logs (Assam on 2014-11-25 with unscaled 1190 MU; Western Region state breakdown scaling anomaly on 2015-01-19) are set to NaN and interpolated using time-based linear interpolation with a maximum gap limit of 3 days.
  4. Physically non-negative columns (`SolarGen`, `EnergyShortage`, `PeakShortage`) with isolated negative sensor or reporting anomalies (e.g. NR SolarGen down to -2.94 MU, regional peak shortages down to -385 MW) are strictly clipped to `0.0`.

---

## Decision 002: Chronological 80/20 Holdout Split with 10% Validation Block
* **Date:** 2026-10-30
* **Status:** Implemented in `src/split.py`, verified in `tests/test_split.py`, saved to `artifacts/split.json`
* **Context:** Time-series forecasting models must never be evaluated using random k-fold or random shuffle splits, which leak future information. We require an 80% train / 20% test chronological holdout on reliable dates. Inside the 80% development set, the final 10% forms a validation block for tuning and candidate comparison.
* **Decision:**
  * Total reliable days: **4,914 days** (2013-03-31 to 2026-09-12).
  * **Train Set (72.0% of total):** 3,538 days (2013-03-31 to 2022-12-06).
  * **Validation Block (8.0% of total = 10% of 80%):** 393 days (2022-12-07 to 2024-01-03).
  * **Full Train (80.0% of total):** 3,931 days (2013-03-31 to 2024-01-03) — used for final model fit prior to test evaluation.
  * **Test Holdout (20.0% of total):** 983 days (2024-01-04 to 2026-09-12) — strictly frozen; only evaluated once.
  * **Leakage Defense:** Automated tests in `tests/test_split.py` verify that `test_dates ∩ train_dates = ∅`, `test_dates ∩ val_dates = ∅`, and `max(train) < min(val) < min(test)`.

---

## Decision 003: Physical Units (Inferred Status)
* **Date:** 2026-10-30
* **Status:** Documented in `data_dictionary.md`
* **Designation:** Units and column definitions are marked **(Inferred)** based on daily numerical magnitudes, standard Indian power sector conventions, and NLDC daily reports, unless confirmed by an official `POSOCO_metadata.json` schema.
* **Inferred Units:**
  * **`EnergyMet` (MU/day, Inferred):** Million Units per day ($1\text{ MU} = 1\text{ GWh} = 1,000,000\text{ kWh}$). Cumulative electrical work over 24 hours.
  * **`DemandMet` (MW, Inferred):** Megawatts. Peak instantaneous power supplied during the day.
  * **`MaximumDemand` (MW, Inferred):** Megawatts. Peak instantaneous power demanded across the grid.
  * **`PeakShortage` (MW, Inferred):** Megawatts. Deficit between demand and supply at peak load hour.
  * **`EnergyShortage` (MU/day, Inferred):** Million Units per day. Cumulative unserved electrical energy over 24 hours.
  * **Generation Metrics (`Total`, `Coal`, `Lignite`, `Gas`, `Hydro`, `Nuclear`, `RES`, `HydroGen`, `WindGen`, `SolarGen`) (MU/day, Inferred):** Million Units generated per calendar day.

---

## Decision 004: Generation-Minus-Demand Gap & National Calibration
* **Date:** 2026-10-30
* **Status:** Verified empirically in Section 4 column audit
* **Decision & Nomenclature:**
  1. The algebraic difference between generation and demand met is designated as the **'generation-minus-demand gap'**. It is **not** called inter-regional physical flow because the dataset does not meter boundary transmission tie-lines directly.
  2. **National Auxiliary Consumption & Transmission Losses:** Gross national generation (`India: Total`, mean 4,272.4 MU/day) exceeds met national demand (`India: EnergyMet`, mean 4,060.5 MU/day) by ~`4.59%` (`211.9 MU/day`). This matches standard power systems operation where generating station auxiliary power (boiler pumps, cooling fans) consumes 5-8% of gross thermal output, alongside interstate/intrastate transmission losses.
  3. **Calibrated Gap Formulation:**
     To account for national losses so regional balances sum to approximately zero across the grid, we calibrate regional generation by the daily national delivery ratio $\alpha_t = \frac{\text{India: EnergyMet}_t}{\text{India: Total}_t}$ ($\text{mean } \alpha = 0.9541$):
     $$\text{Calibrated Gap}_r = (\alpha_t \times \text{Total}_r) - \text{EnergyMet}_r$$
     * Regional calibrated gaps sum to **`+0.10 MU/day` ($\approx 0$)** across all 5 regions.
     * **WR:** Mean Calibrated Gap = `+205.6 MU/day` (net generation surplus).
     * **ER:** Mean Calibrated Gap = `+121.6 MU/day` (net generation surplus).
     * **NER:** Mean Calibrated Gap = `+2.1 MU/day` (balanced).
     * **SR:** Mean Calibrated Gap = `-113.4 MU/day` (net demand deficit).
     * **NR:** Mean Calibrated Gap = `-215.8 MU/day` (net demand deficit; P05 = `-384.6 MU`, P95 = `-78.6 MU`).

---

## Decision 005: Generation Windows & Materiality-Threshold Shortage Analysis
* **Date:** 2026-10-30
* **Status:** Verified empirically in Section 4 column audit
* **Findings & Rules:**
  1. **Generation Columns Availability:** Generation breakdown columns are almost unpopulated before late 2017 / 2018. `HydroGen` and `WindGen` are active from `2013-03-31`. `SolarGen` is active from `2016-09-27`. `Total`, `Gas`, `Hydro`, `Nuclear`, `RES` are active from `2017-08-28`. `Thermal` appears only between `2017-08-28` and `2018-12` (578 days total), and is not a historical pre-2018 aggregate. `Coal` and `Lignite` are active from `2018-11-29`.
  2. **`EnergyShortage` Activation Date:** First non-null date is **`2017-05-08`** (3,413 non-null rows out of 4,914 reliable rows). It is unrecorded (NaN) in 2013-2016 reports.
  3. **Materiality Thresholds for Shortage Analysis:** Rather than treating any $>0$ floating-point epsilon as a shortage, analysis on recent reliable years (2018-01-01 to 2026-09-12, $N = 3,177$ reliable days) requires explicit materiality thresholds:
     - Material Energy Shortage: $\ge 1.0\text{ MU/day}$ (1 GWh unserved energy).
     - Material Peak Shortage: $\ge 50.0\text{ MW}$ deficit.

---

## Decision 006: Controlled Wording and Heuristic Tagging
* **Date:** 2026-10-30
* **Status:** Mandatory rule across codebase, API, and UI
* **Decisions:**
  1. **"Stress Indicator" (never "blackout prediction"):** Grid supply/demand tension must be described strictly as a heuristic *stress indicator* based on historical percentiles and capability proxies. The system does not run AC power flow simulations, dynamic contingency analysis, or transmission line thermal rating models.
  2. **"Estimated Avoided Mismatch" (never "guaranteed savings"):** Reductions in forecast error relative to baselines must be termed *estimated avoided mismatch*, with explicit rupee conversion formulas and stated caveats regarding procurement mechanics.
  3. **Heuristics Labeling:** All threshold-based alert flags (Phase D) must carry explicit metadata labeling them as heuristics with cited sample sizes and evidence values.

---

## Decision 007: What-If Scenario Engine Allocation & Coherence Enforcement
* **Date:** 2026-10-30
* **Status:** Implemented in `src/scenario.py` and verified in `tests/test_scenario.py`
* **Architectural Decisions:**
  1. **Dual Allocation Modes:**
     - **Proportional Allocation:** Preserves base forecast proportions among unpinned peers when propagating shocks up or down the hierarchy.
     - **Covariance-Aware Allocation:** Formulates shock distribution as an equality-constrained weighted least-squares problem:
       $$\min_{y_b^*} \frac{1}{2} (y_b^* - y_b^0)^T (S^T W S) (y_b^* - y_b^0) \quad \text{s.t.} \quad C y_b^* = d$$
       where $W = \text{diag}(1 / \sigma_i^2)$ weights each node inversely by its historical forecast error variance, $C$ enforces equality for shocked and pinned nodes, and $S$ is the summing matrix. Solved via KKT linear system with minimum-norm fallback (`scipy.linalg.lstsq`). High-volatility nodes (e.g. NR) absorb larger shock shares, protecting low-volatility regions (e.g. NER) from unrealistic distortion.
  2. **Exact Mathematical Coherence Guarantee:** Every simulated scenario vector $y^*$ satisfies $y^* = S y_b^*$, guaranteeing that every parent node equals the sum of its children to machine precision ($< 10^{-12}$), strictly satisfying the project requirement of $< 10^{-6}$.
  3. **Pinned Node Behavior:** When a user pins specific regions or states, those nodes are held strictly fixed at base values ($y_p^* = y_p^0$), and only the unpinned remainder of the network absorbs the demand delta.
  4. **Plausibility & Safety Safeguards:**
     - **Historical Range Warnings:** Flags when a shock pushes demand beyond historical $[P_{01}, P_{99}]$ or all-time extremes based on reliable historical data (`artifacts/metrics/historical_ranges.json`).
     - **Non-Negative Real Node Flags:** Real nodes (excluding synthetic `Other_*` residual nodes) that drop below zero are flagged for review.
  5. **Mandatory Disclaimer:** Every API response and UI component displaying scenario outcomes must display: `"This is a statistical redistribution, not a power-flow simulation."`

---

## Decision 008: Heuristic Stress Indicators & Evidence-Backed Alerting
* **Date:** 2026-10-30
* **Status:** Implemented in `src/alerts.py` and verified in `tests/test_alerts.py`
* **Architectural Decisions:**
  1. **Strict Terminology & Heuristic Labeling:** Grid supply/demand tension is designated strictly as a heuristic *stress indicator* (never "blackout prediction"). Every alert dictionary includes `"is_heuristic": True` and explicit numeric evidence values with dates and physical units (`MU/day`, `MW`).
  2. **Seasonal Demand Stress:** Evaluated per calendar month against historical distributions ($P_{95}, P_{99}$) and all-time recorded peaks. For example, in NR, January $P_{99}$ is 1,377.0 MU/day while July $P_{99}$ is 2,018.1 MU/day; month-specific quantiles prevent false-negatives during winter or false-positives during summer.
  3. **Observed Supply Capability Proxy + P95 Import:** Regional capability proxy is computed as the trailing 365-day maximum calibrated regional generation ($\alpha_t \times \text{Total}_r$). Typical net import capacity is computed as the empirical 95th percentile of the generation-minus-demand deficit ($P_{95}$). When scenario demand exceeds capability plus $P_{95}$ import, a critical supply deficit alert is raised.
  4. **Material Shortage Frequency with Sample Size Gate ($N \ge 30$):** Computed exclusively from recent reliable years (2018–2026) when generation and shortage reporting were active, with an explicit materiality threshold of $\ge 1.0\text{ MU/day}$ unserved energy. In accordance with the prompt specification, whenever sample size is fewer than 30 days ($N < 30$, e.g. NR at $\ge 95\%$ of peak with $N=15$), the percentage metric is suppressed and the sample count is reported with an "insufficient sample size" caveat.
  5. **Low-Demand Backing-Down Indicator:** Detects scenario demand $< 5\text{th}$ percentile for that calendar month, warning operators of thermal plant backing-down constraints or potential renewable curtailment.
  6. **Mandatory Grid Caveat:** Every alert object carries the required caveat:
     > *"Ignores transmission limits, plant outages, inter-regional transfer limits, and intraday peaks, because the data is daily."*

---

## Decision 009: Savings Estimator Methodology, Rupee Valuation & Planning Inconsistency
* **Date:** 2026-10-30
* **Status:** Implemented in `src/savings.py` and verified in `tests/test_savings.py`
* **Architectural Decisions:**
  1. **Regional Mismatch Formulation:** Evaluated strictly on the frozen 20% holdout test set (`2024-01-04` to `2026-09-12`, 983 days). Daily regional mismatch is defined as:
     $$\text{Daily Mismatch}_t = \sum_{r \in \{\text{NR}, \text{WR}, \text{SR}, \text{ER}, \text{NER}\}} |y_{r, t} - \hat{y}_{r, t}|$$
     Avoided mismatch is computed against user-selectable baselines: Unreconciled Base Models, Seasonal Naive (7-day), Seasonal Naive (364-day), and Day-Ahead Persistence.
  2. **Week-Block Bootstrap Confidence Interval (Block Size = 7 Days):** Time-series residuals exhibit weekly autocorrelation. Standard IID bootstrap would artificially compress the confidence bounds. We partition the 983 test days into 141 contiguous 7-day blocks and draw $B = 1,000$ bootstrap replications to establish the empirical 95% confidence interval ($[P_{2.5}, P_{97.5}]$).
  3. **Rupee Valuation & Citable Market Benchmarks:**
     $$\text{Value} = (\Delta\text{Shortfall MU} \times P_{\text{under}} + \Delta\text{Surplus MU} \times P_{\text{over}}) \times 10^6\text{ kWh/MU}$$
     - **Base Case (₹6.50 under / ₹3.50 over, blended ₹5.00/kWh):** CERC Report on Market Monitoring of Power Exchanges in India (FY 2023-24) and CERC Deviation Settlement Mechanism (DSM) Regulations 2024.
     - **Low Case (₹4.50 under / ₹2.50 over, blended ₹3.50/kWh):** CERC Multi-Year Tariff Regulations 2024-29 baseload energy charges.
     - **High Case (₹9.50 under / ₹4.50 over, blended ₹7.00/kWh):** CERC High-Price Day Ahead Market (HP-DAM) ceiling order dated March 2024.
  4. **Strict Separation of Planning Inconsistency:** The daily mismatch between unreconciled regional sum and the national forecast ($|\sum \hat{y}_{r, t} - \hat{y}_{\text{India}, t}| = 91.03\text{ MU/day}$, or $33,249.8\text{ MU/year}$) reflects desk-to-desk planning incoherence. Per project specifications, it is reported strictly as an independent diagnostic and **never added to avoided mismatch savings**.
  5. **Mandatory Caveat Note:** Every savings report carries the explicit caveat:
     > *"This estimates avoided over- or under-procurement relative to the stated baseline; it is not electricity physically saved and not evidence of what a government would save."*

---

## Decision 010: FastAPI Microservice Architecture & Zero In-Request Training
* **Date:** 2026-10-30
* **Status:** Implemented in `api/main.py`, `api/model_service.py`, `api/schemas.py`, and verified in `tests/test_api.py`
* **Architectural Decisions:**
  1. **Versioned REST API (`/api/v1`):** Complete REST API implemented with Pydantic v2 schemas across 10 versioned endpoints:
     - `GET /api/v1/health`: Service health and version (`v2.0`).
     - `GET /api/v1/meta`: Model version, reliable date spans (`2013-03-31` to `2026-09-12`), split cutoff dates, library versions, and git hash.
     - `GET /api/v1/nodes`: 51-node hierarchy list with metadata, levels, parent-child links, and historical ranges.
     - `GET /api/v1/forecast`: Multi-horizon forecasts with 90% and 95% split-conformal prediction intervals.
     - `GET /api/v1/hierarchy`: 3-level tree snapshot with exact mathematical coherence gap tracking in MU/day.
     - `POST /api/v1/scenario`: What-if simulation returning Proportional and Covariance-Aware allocations, historical bounds warnings, and heuristic stress alerts.
     - `GET /api/v1/alerts`: Seasonal demand, supply deficit, shortage frequency (sample-gated $N \ge 30$), and low-demand indicators.
     - `GET /api/v1/backtest`: Side-by-side comparison of actuals vs. unreconciled vs. reconciled forecasts on holdout test set with error metrics.
     - `GET /api/v1/metrics`: Official test metrics by level and horizon from frozen artifacts.
     - `POST /api/v1/savings`: Avoided mismatch, 95% week-block bootstrap CI, rupee valuations (Low, Base, High), and planning inconsistency.
  2. **Startup Caching (Zero In-Request Retraining):** All static artifacts, summing matrices, precomputed baseline tables, and calibrated conformal intervals load once during service startup via FastAPI `lifespan`. No model training occurs inside HTTP request cycles.
  3. **Backward Compatibility:** Legacy endpoints (`/health`, `/forecast/hierarchy/nodes`, `/forecast/hierarchy`, `/forecast/{node_id}`, `/ingest`) are preserved to prevent breaking legacy frontend components while transitioning to `/api/v1`.
  4. **Runtime Stability Configuration:** `OMP_NUM_THREADS=1` and `MPLCONFIGDIR=/tmp/mplconfig` configured via `tests/conftest.py` ensuring process stability across Python 3.14 on macOS.


---

## Decision 011: Multi-Page Control-Room Dashboard Architecture (Phase G)
* **Date:** 2026-10-30
* **Status:** Implemented in `frontend/src/` (App.jsx, App.css, api.js, and `pages/`) and verified via `vite build`
* **Architectural Decisions:**
  1. **7-Page Modular Structure:** Implemented the full suite of pages required by Section 10:
     - `OverviewPage.jsx`: Headline national forecast with origin/target dates, 5 regional cards with coherence verification badge, 14-day conformal interval chart, holdout accuracy summary, and data freshness metrics.
     - `ForecastPage.jsx`: Node selector spanning all 51 hierarchy nodes, 1..14 day horizon slider, conformal interval toggle (80% and 95%), forecast timeseries chart, daily tabular breakdown, and CSV export.
     - `HierarchyExplorerPage.jsx`: 3-level expandable grid tree (National → 5 Regions → 45 States/Residuals), view mode switcher (Reconciled, Unreconciled, Actual), and real-time coherence gap banner reporting exact discrepancies down to machine precision.
     - `ScenarioSimulatorPage.jsx`: Interactive what-if engine with $\pm 15\%$ slider, target node selection, pinned node locks, Proportional vs. Covariance-Aware KKT divergence table, live heuristic stress alerts with evidence numbers, and the mandatory statistical redistribution disclaimer.
     - `BacktestPage.jsx`: Holdout test day picker (2024-01-04 to 2026-09-12), side-by-side comparison cards (Actual vs. Unreconciled vs. Reconciled), error trajectory chart, and accuracy tables by horizon and level.
     - `SavingsPage.jsx`: Baseline selector, user-editable power prices with cited CERC/IEX benchmarks, prominent avoided mismatch headline (6,911.5 MU/year), 95% week-block bootstrap confidence interval, 3 valuation scenarios (Low/Base/High), separately reported desk planning inconsistency (91.03 MU/day), and mandatory accounting caveat.
     - `MethodAndLimitsPage.jsx`: Full documentation of data credits (GRID-INDIA/POSOCO, Robbie Andrew), mathematical formulations, system operational limits (what it cannot do), and release changelog.
  2. **URL Hash Routing with Zero Dependencies:** Single-page hash routing (`#overview`, `#forecast`, `#hierarchy`, `#scenario`, `#backtest`, `#savings`, `#method`) with browser history integration (`pushState` and `hashchange`), ensuring instant zero-latency page transitions without external routing library incompatibilities or nginx rewrite 404 hazards.
  3. **Control-Room Styling System:** Strict palette implementation matching operational control centers: dark teal background (`#0E1A1D`), slate panels (`#152528`), panel borders (`#223638`), amber accents (`#E8A33D`), cyan status indicators (`#4FD1C5`), and red alert highlights (`#D9695A`), paired with Space Grotesk and IBM Plex Mono typography.
  4. **Strict Audit Discipline:** Every figure rendered across all 7 pages originates from reproducible backend artifacts and displays an associated date and physical unit (`MU/day`, `MW`, `₹ Cr`).


---

## Decision 012: Production Readiness, Containerization, and Drift Detection (Phase H)
* **Date:** 2026-10-30
* **Status:** Implemented in `Dockerfile.api`, `Dockerfile.frontend`, `docker-compose.yml`, `scripts/cli.py`, `scripts/drift_check.py`, and `.github/workflows/ci.yml`
* **Architectural Decisions:**
  1. **Dual Container Topology:**
     - **API Container (`Dockerfile.api`):** Python 3.11-slim container with `libgomp1` (OpenMP) support for LightGBM, `OMP_NUM_THREADS=1` to prevent threading deadlocks, health check against `/api/v1/health`, preloaded model artifacts, and non-root execution path.
     - **Frontend Container (`Dockerfile.frontend`):** Multi-stage alpine build serving static production assets via high-performance Nginx with gzip compression, reverse proxy for `/api/`, and SPA route fallback.
     - **Orchestration (`docker-compose.yml`):** Connects API (port 8000) and Frontend (port 3000) with container health dependency gating.
  2. **Reproducible Seed-Pinned CLI (`scripts/cli.py`):**
     - Provides deterministic execution (`seed=42`) for `train`, `evaluate`, and `export`.
     - Validates that training sets precede holdout test sets without date overlap before calculating evaluation metrics.
  3. **Operational Drift & Staleness Monitor (`scripts/drift_check.py`):**
     - Computes rolling 30-day tracking error (WAPE, MAE) against the holdout baseline.
     - Detects data staleness (> 14 days older than reference date) and distribution drift (WAPE > 8.0%).
     - Serializes status to `artifacts/metrics/drift_status.json`, which is dynamically injected into `/api/v1/meta` alongside model retraining instructions.
  4. **Continuous Integration Pipeline (`.github/workflows/ci.yml`):**
     - Automated workflow verifying backend tests (`pytest`), code formatting/linting (`ruff`), frontend build (`vite build` & `oxlint`), and multi-stage Docker container builds on every pull request and push to main.
