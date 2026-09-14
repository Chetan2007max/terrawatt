# TerraWatt
### Multi-Region Energy Demand Forecasting & Reconciliation Engine

> A production-grade hierarchical time series forecasting system that predicts daily electricity energy consumption across India's real 3-level grid hierarchy — **States/UTs/bulk-consumers → 5 Regions (Northern, Western, Southern, Eastern, North-Eastern) → National total** — while guaranteeing that all forecasts are mathematically coherent using MinT (Minimum Trace) reconciliation. Served in real time via a FastAPI microservice simulating streaming telemetry.
>
> **Dataset (verified):** [GRID-INDIA (POSOCO) daily energy data](https://robbieandrew.github.io/india/) — 2 January 2013 to 11 September 2026 (~4,997 daily rows, 140 columns), sourced from India's official national grid operator. Hierarchy coherence validated on real data before pipeline build began — see Section 5.1.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Why This Problem Matters](#2-why-this-problem-matters)
3. [Proposed Solution](#3-proposed-solution)
4. [System Architecture / Pipeline Overview](#4-system-architecture--pipeline-overview)
5. [Detailed Component Breakdown](#5-detailed-component-breakdown)
6. [Tech Stack](#6-tech-stack)
7. [Repository Structure](#7-repository-structure)
8. [Evaluation Metrics](#8-evaluation-metrics)
9. [Full Plan of Action — Day-by-Day (1 hr/day)](#9-full-plan-of-action--day-by-day-1-hrday)
10. [Agent Instructions — How to Use This README](#10-agent-instructions--how-to-use-this-readme)
11. [Success Criteria / Definition of Done](#11-success-criteria--definition-of-done)
12. [Future Extensions](#12-future-extensions)

---

## 1. Problem Statement

India's electricity grid is officially organized into a 3-level structure, defined and operated by GRID-INDIA (formerly POSOCO), the national grid operator:

- **State/UT level (bottom)** — ~30 states/UTs, plus a handful of large bulk consumers metered directly on the interstate transmission system (e.g., major steel plants, railways, large industrial consumers)
- **Regional level (middle)** — 5 Regional Load Despatch Centres (RLDCs): Northern (NR), Western (WR), Southern (SR), Eastern (ER), North-Eastern (NER)
- **National level (top)** — managed by the National Load Despatch Centre (NLDC), representing the all-India total

Each level is typically forecast **independently** in naive systems (a separate model per state, a separate model per region, a separate model for the national total). This creates a critical flaw:

> **The sum of individual state-level forecasts almost never equals the regional forecast, and the sum of regional forecasts almost never equals the national forecast, when each is modeled independently.**

## 2. Why This Problem Matters

- Electricity **cannot be stored cheaply at scale** — supply must match demand in near real time. Wrong forecasts mean blackouts (under-supply) or wasted generation cost (over-supply).
- India's rapid renewable energy expansion (solar/wind, visible directly in this dataset's generation-mix columns) makes demand-supply matching *harder*, increasing the value of accurate, coherent, multi-level forecasting.
- Grid operators, state electricity boards, and energy trading desks all consume forecasts at different levels of this same hierarchy — if the numbers don't agree with each other, downstream planning and automated systems receive contradictory signals.
- This project simulates a **real production ML system** used in an actual government-operated grid, not a synthetic textbook exercise — every component maps to something GRID-INDIA genuinely has to solve operationally.

---

## 3. Proposed Solution

Build **TerraWatt**, an end-to-end system that:

1. Ingests 13+ years of daily electricity energy-consumption data (`EnergyMet`) across India's real 3-level hierarchy (State/bulk-consumer → Region → National).
2. Engineers time-aware features suited to **daily** granularity (calendar effects, holidays, day-of-week/month/year, lag variables at 1/7/30-day horizons, rolling statistics).
3. Trains **base forecasting models** (LightGBM / XGBoost) independently at every level and every node of the hierarchy.
4. Applies **MinT (Minimum Trace) reconciliation** so that state-level forecasts sum exactly into their region, and regions sum exactly into the national total, while minimizing total forecast error variance.
5. Wraps the trained, reconciled forecasting system in a **FastAPI microservice** that simulates streaming daily telemetry ingestion and serves real-time coherent forecasts via REST endpoints.

---

## 4. System Architecture / Pipeline Overview

```
+------------------+     +--------------------+     +------------------------+
|  Raw Data Layer   |---->| Feature Engineering |---->|  Hierarchy Definition   |
| (GRID-INDIA/POSOCO |     | (calendar, daily    |     | (State/bulk-consumer -> |
|  daily CSV, 2013-  |     |  lags, rolling      |     |  Region -> National     |
|  present)          |     |  stats)             |     |  summing matrix S)      |
+------------------+     +--------------------+     +------------------------+
                                                              |
                                                              v
                                              +---------------------------------+
                                              |   Base Forecast Models           |
                                              | (LightGBM / XGBoost per node)    |
                                              +---------------------------------+
                                                              |
                                                              v
                                              +---------------------------------+
                                              |  MinT Reconciliation Layer       |
                                              | (scikit-hts / hierarchicalforecast)|
                                              |  -> coherent forecasts            |
                                              +---------------------------------+
                                                              |
                                                              v
                                              +---------------------------------+
                                              |   Evaluation & Backtesting       |
                                              | (MAPE, RMSE, coherence check)    |
                                              +---------------------------------+
                                                              |
                                                              v
                                              +---------------------------------+
                                              |   FastAPI Microservice           |
                                              | (REST endpoints + streaming      |
                                              |  telemetry simulator)            |
                                              +---------------------------------+
                                                              |
                                                              v
                                              +---------------------------------+
                                              |  Deployment / Docker / Cloud     |
                                              +---------------------------------+
```

---

## 5. Detailed Component Breakdown

### 5.1 Raw Data Layer
**Purpose:** Source of truth for historical electricity energy consumption, at the real 3-level hierarchy GRID-INDIA actually operates.

- **Dataset:** [GRID-INDIA (POSOCO) daily energy data](https://robbieandrew.github.io/india/) — direct CSV: `https://robbieandrew.github.io/india/data/POSOCO_data.csv`
- **Shape:** ~4,997 rows x 140 columns (grows daily as the source updates).
- **Confirmed date range:** **2 January 2013 to 11 September 2026** — verified directly, not assumed.
- **Granularity: DAILY, not hourly.** The date column `yyyymmdd` is one row per calendar day. This is a deliberate, verified constraint — do not build hourly features (hour-of-day, t-1h lags) against this data; all feature engineering must use daily-appropriate lags (see 5.2).
- **The unified hierarchy metric is `EnergyMet` (measured in MU — million units).** This is the only metric available at all 3 levels consistently (regions and national also have `DemandMet`, a peak/instantaneous MW figure, but states only report `EnergyMet` — so `EnergyMet` is what the hierarchy and reconciliation must be built on).
- **Hierarchy structure (verified real, not invented):**
  - **Bottom (~35 nodes):** States/UTs (e.g., `Punjab: EnergyMet`, `Maharashtra: EnergyMet`, `Tamil Nadu: EnergyMet`, ...) **plus** large bulk consumers metered directly on the interstate system, tagged by region suffix (e.g., `Railways_NR ISTS: EnergyMet`, `RIL JAMNAGAR: EnergyMet`, `Bulk Consumer_NR ISTS: EnergyMet`). These bulk-consumer nodes must be assigned to their region, not treated as states.
  - **Middle (5 nodes):** `NR`, `WR`, `SR`, `ER`, `NER` — India's 5 official Regional Load Despatch Centres.
  - **Top (1 node):** `India: EnergyMet` — the national total, managed by the NLDC.
- **Missing values:** ~111-112 missing days (~2.2%) in region-level columns, disclosed by the source maintainer as due to unreadable source reports on those dates. State-level columns show zero missing in the columns checked.
- **Hierarchy coherence validation (performed before pipeline build began — do not skip re-verifying this on the full, current dataset on Day 1):**
  ```python
  diff = df['NR: EnergyMet'] - df[nr_member_columns].sum(axis=1)
  # Result on Northern Region: mean = 0.257, median = 0.0, std = 18.2, max = 1268 (n=4886 valid days)
  ```
  **99.6%+ of days reconcile near-exactly** (median difference = 0). A small number of days show real, non-trivial gaps — most under 20 MU, with **one confirmed outlier on 2020-09-30 (diff = 1268)** that must be investigated as an explicit early task, not silently dropped or averaged away.
- **Known data-quality items to handle explicitly (not hidden, not skipped):**
  - The 2020-09-30 outlier (likely a missing/zero state submission that day — confirm by inspecting individual state columns for that date)
  - ~19 other days with smaller (0.5-75 MU) reconciliation gaps, scattered randomly across 2013-2025 with no clustering around known structural events (Telangana 2014 split, J&K 2019 bifurcation) — this scattering pattern indicates isolated reporting noise, not a structural hierarchy-definition error
  - Recommended handling: add a synthetic **"Other/Unmetered"** leaf node per region, computed as `region_total - sum(known members)`. This guarantees exact coherence by construction (a standard technique in official statistics) while being transparent that some residual load isn't individually attributed. Document this choice explicitly in your final report.
  - Bulk-consumer-to-region assignments should be confirmed against GRID-INDIA's official RLDC member documentation where the region suffix in the column name (`_NR`, `_ER`, etc.) is not already explicit.

### 5.2 Feature Engineering Layer
**Purpose:** Convert raw daily energy data into a supervised learning-ready feature matrix, appropriate for **daily**, not hourly, granularity.

- **Calendar features:** day-of-week, day-of-month, day-of-year, month, is_weekend, is_holiday (Indian national + regional holiday calendar via the `holidays` library)
- **Lag features (daily-appropriate):** EnergyMet at t-1 day, t-7 days, t-30 days, t-365 days — captures weekly and yearly seasonality
- **Rolling statistics:** rolling mean/std over 7-day and 30-day windows
- **Seasonal/monsoon indicators:** India's demand has strong summer (cooling load) and monsoon-related patterns — encode month/season explicitly rather than relying only on raw date features
- **Generation-mix features (optional, available in this dataset):** solar/wind/hydro generation columns per region could be added as exogenous features, since renewable generation share affects net grid demand patterns
- **Region/node encoding:** categorical encoding of hierarchy node identity (state, bulk-consumer, or region)
- **Data leakage check:** since lags now span up to a full year (t-365), be extra careful that walk-forward validation splits never let a training window see a "future" value through a long lag window

### 5.3 Hierarchy Definition Layer
**Purpose:** Formally define the real 3-level summing structure so reconciliation is mathematically valid.

- Build a **summing matrix S** encoding: ~35 state/bulk-consumer nodes -> 5 regional nodes -> 1 national node.
- Explicitly assign every bulk-consumer column to its region using the column name suffix (`_NR`, `_ER`, `_SR`, etc.) or official documentation where the suffix is absent.
- Add the "Other/Unmetered" residual node per region (see 5.1) so that `sum(children) == parent` holds by construction, rather than approximately.
- Tools: `scikit-hts` or `hierarchicalforecast` (Nixtla) — both accept a hierarchy specification (parent-child mapping) and construct S automatically.
- Unit test this component against the real validated numbers from Section 5.1 (median diff = 0, and confirm the "Other" node absorbs the residual correctly on the 2020-09-30 outlier date specifically).

### 5.4 Base Forecast Models
**Purpose:** Generate an independent forecast at every node of the hierarchy (every state/bulk-consumer, every region, and the national total).

- **Models:** LightGBM and XGBoost — chosen for their strength on tabular lag/calendar features and fast training across ~40 hierarchy nodes.
- Train one model per node, or one global model with node identity as a categorical feature (try both and compare).
- Forecast horizon: since data is daily, a sensible horizon is **next 7 or 14 days** (rather than "next 24 hours" as in an hourly setup).
- Output: base (incoherent) forecasts at every level, for the chosen horizon.

### 5.5 MinT Reconciliation Layer
**Purpose:** The core advanced component — makes forecasts coherent across all 3 real levels.

- **What MinT does:** Takes incoherent base forecasts from every level and, using the summing matrix S plus the covariance structure of historical forecast errors, computes reconciled forecasts that (a) sum correctly across all 3 levels and (b) have minimum total forecast error variance among coherent reconciliation methods.
- **Why MinT over simpler methods:**
  - *Bottom-up* (sum states to get regions, sum regions to get national): ignores that national/regional forecasts often benefit from more stable, aggregated signal.
  - *Top-down* (split national forecast down by historical proportions): ignores genuine state-level and bulk-consumer dynamics (e.g., a single large industrial consumer's demand shock).
  - *MinT*: optimally blends information from all 3 levels, weighted by each series' historical error covariance.
- **Library:** `scikit-hts` or `hierarchicalforecast` (Nixtla) — evaluate both for MinT support and ease of use with a 3-level hierarchy.

### 5.6 Evaluation & Backtesting Layer
**Purpose:** Prove the system works, at both accuracy and coherence levels, across the real 3-level structure.

- **Accuracy metrics:** MAPE, RMSE, MAE — computed separately at state, region, and national levels, before vs. after reconciliation.
- **Coherence check:** Automated test asserting `sum(state/bulk-consumer forecasts + Other node) == region forecast` and `sum(region forecasts) == national forecast`. Use a realistic tolerance derived from Section 5.1's real validation (most days near 0, but allow for the disclosed noise ceiling) rather than a strict `== 0`.
- **Backtesting strategy:** Rolling-origin (walk-forward) validation on daily data — never train on future days relative to the test window.
- **Special test case:** explicitly backtest across the 2020-09-30 outlier date and the COVID-19 demand-shock period (March-June 2020) separately, since these represent genuine regime shifts worth reporting on rather than averaging away.

### 5.7 FastAPI Microservice Layer
**Purpose:** Simulate how this system would actually be consumed in production.

- **Endpoints to build:**
  - `POST /ingest` — simulates streaming daily telemetry (a new day's readings arriving)
  - `GET /forecast/{node_id}` — returns the latest coherent forecast for a given state, bulk-consumer, region, or national node
  - `GET /forecast/hierarchy` — returns the full coherent 3-level forecast tree at once
  - `GET /health` — service health check
- **Streaming simulation:** a background script that "replays" historical daily data at an accelerated rate (e.g., 1 simulated day per real second) to mimic live telemetry, triggering rolling re-forecasts.
- **Model serving:** load trained models + reconciliation matrix at startup; keep in memory for low-latency responses.

### 5.8 Deployment Layer
**Purpose:** Make the system runnable by anyone, and demonstrate DevOps competence.

- **Docker:** containerize the FastAPI app + model artifacts.
- **Optional cloud deployment:** Render / Railway / AWS EC2 / GCP Cloud Run — a live public demo URL is high-value for a resume link.
- **CI basics (optional stretch):** GitHub Actions to run tests on push.

---

## 6. Tech Stack

| Layer | Tool/Library |
|---|---|
| Language | Python 3.10+ |
| Data manipulation | pandas, numpy |
| Feature engineering | pandas, `holidays` library (India calendar) |
| Base models | LightGBM, XGBoost |
| Hierarchical reconciliation | scikit-hts, hierarchicalforecast (Nixtla) |
| Evaluation | scikit-learn (metrics), custom coherence tests |
| API layer | FastAPI, uvicorn |
| Data validation | pydantic |
| Testing | pytest |
| Containerization | Docker |
| Experiment tracking (optional) | MLflow or simple CSV logging |
| Visualization | matplotlib, plotly |

---

## 7. Repository Structure

```
terrawatt/
|-- README.md
|-- requirements.txt
|-- Dockerfile
|-- data/
|   |-- raw/                  # original POSOCO_data.csv snapshot
|   |-- processed/            # cleaned, feature-engineered data
|-- notebooks/
|   |-- 01_eda.ipynb
|   |-- 02_feature_engineering.ipynb
|   |-- 03_model_experiments.ipynb
|-- src/
|   |-- data_loader.py
|   |-- feature_engineering.py
|   |-- hierarchy.py          # summing matrix + region/state/bulk-consumer mapping
|   |-- train_base_models.py
|   |-- reconcile.py          # MinT reconciliation logic
|   |-- evaluate.py
|   |-- streaming_simulator.py
|-- api/
|   |-- main.py                # FastAPI app entrypoint
|   |-- schemas.py             # pydantic models
|   |-- model_service.py       # loads models, serves forecasts
|-- tests/
|   |-- test_hierarchy.py
|   |-- test_reconciliation_coherence.py
|   |-- test_api.py
|-- models/
    |-- artifacts/              # saved trained models
```

---

## 8. Evaluation Metrics

| Metric | Purpose |
|---|---|
| MAPE (Mean Absolute Percentage Error) | Standard forecasting accuracy metric |
| RMSE | Penalizes large errors more — important for demand-shock days |
| MAE | Robust, easy-to-explain baseline metric |
| Coherence error | `abs(sum(children) - parent)` — should be near 0 after reconciliation, with documented tolerance |
| Improvement % | Accuracy of reconciled forecasts vs. base (unreconciled) forecasts — headline result |

---

## 9. Full Plan of Action — Day-by-Day (1 hr/day)

> Total estimated duration: **~52 focused 1-hour sessions (~8 weeks)**. Mark each `[ ]` as `[x]` when done.

### Phase 1 — Setup & Data Validation (Days 1-7)

- [x] **Day 1 (done):** Downloaded the [GRID-INDIA/POSOCO dataset](https://robbieandrew.github.io/india/). Confirmed shape (~4,997 x 140), confirmed daily granularity, confirmed date range **2013-01-02 to 2026-09-11**, confirmed real 3-level hierarchy (State/bulk-consumer -> Region -> National) using `EnergyMet` as the unified metric, and ran initial coherence check on the Northern Region (median diff = 0, 99.6%+ days near-exact).
- [ ] **Day 2:** Set up repo structure (folders above), initialize git, create virtualenv, install core libraries (pandas, numpy, lightgbm, xgboost, fastapi, scikit-hts). Write `requirements.txt`.
- [ ] **Day 3:** Investigate the 2020-09-30 outlier (diff = 1268) specifically: inspect every state/bulk-consumer column under NR for that date to find the missing/anomalous entry. Document the root cause.
- [ ] **Day 4:** Build the complete State/bulk-consumer -> Region member mapping for all 5 regions (NR, WR, SR, ER, NER), confirming bulk-consumer suffixes and resolving any ambiguous columns (e.g., DVC, Sikkim placement) against GRID-INDIA's official RLDC documentation.
- [ ] **Day 5:** Run the same coherence validation check (Section 5.1) for the remaining 4 regions (WR, SR, ER, NER) and for Region -> National. Document all results.
- [ ] **Day 6:** Decide and implement the "Other/Unmetered" residual node approach per region so coherence holds exactly by construction. Re-run coherence check to confirm 100% exact coherence with this node included.
- [ ] **Day 7:** Write a data cleaning script: handle the ~111 missing region-level days (flag vs. interpolate — document the decision), confirm no duplicate dates, save cleaned data to `data/processed/`.

### Phase 2 — Feature Engineering (Days 8-14)

- [ ] **Day 8:** Implement daily calendar features (day-of-week, day-of-month, month, day-of-year, is_weekend) in `feature_engineering.py`.
- [ ] **Day 9:** Add Indian holiday features using the `holidays` library.
- [ ] **Day 10:** Implement daily lag features (t-1, t-7, t-30, t-365 days) per node.
- [ ] **Day 11:** Implement rolling statistics (7-day and 30-day rolling mean/std).
- [ ] **Day 12:** Add seasonal/monsoon indicator features; optionally integrate renewable generation-mix columns as exogenous features.
- [ ] **Day 13:** Assemble the final feature matrix per hierarchy node (state, bulk-consumer, region, national). Validate no data leakage, especially around the t-365 lag.
- [ ] **Day 14:** Save processed feature sets to disk; sanity-check feature distributions in a notebook.

### Phase 3 — Hierarchy & Summing Matrix (Days 15-18)

- [ ] **Day 15:** Implement the full 3-level summing matrix `S` in `hierarchy.py` (states/bulk-consumers + Other node -> 5 regions -> national).
- [ ] **Day 16:** Write unit tests confirming `S` reproduces the validated coherence results from Phase 1 exactly.
- [ ] **Day 17:** Integrate `scikit-hts` (or `hierarchicalforecast`) using this 3-level hierarchy specification.
- [ ] **Day 18:** Run a minimal end-to-end example on a small date slice to confirm the library pipeline works before scaling to the full 13+ years of data.

### Phase 4 — Base Forecasting Models (Days 19-27)

- [ ] **Day 19:** Set up rolling-origin (walk-forward) train/validation split strategy for daily data.
- [ ] **Day 20:** Train a baseline LightGBM model on ONE node (e.g., Punjab) to confirm the pipeline works end-to-end.
- [ ] **Day 21:** Evaluate that baseline with MAPE/RMSE/MAE; visually sanity-check predictions vs. actuals.
- [ ] **Day 22:** Scale up — train LightGBM models across all ~40 hierarchy nodes (loop, or global model with node identity as categorical feature — try both).
- [ ] **Day 23:** Repeat with XGBoost for comparison.
- [ ] **Day 24:** Compare LightGBM vs XGBoost per node; pick the stronger performer (or keep both for later ensembling).
- [ ] **Day 25:** Hyperparameter tuning pass on the chosen model.
- [ ] **Day 26:** Explicitly evaluate model performance during the COVID-19 demand-shock window (Mar-Jun 2020) as a stress-test case.
- [ ] **Day 27:** Save all trained base models to `models/artifacts/`. Document base (pre-reconciliation) accuracy — your "before" baseline.

### Phase 5 — MinT Reconciliation (Days 28-34)

- [ ] **Day 28:** Read up on MinT theory (Hyndman et al.) well enough to explain it in an interview.
- [ ] **Day 29:** Implement MinT reconciliation using base forecasts + summing matrix + residual covariance estimation.
- [ ] **Day 30:** Run reconciliation on trained base forecasts; get reconciled outputs at all 3 levels.
- [ ] **Day 31:** Write and run the coherence unit test: confirm `sum(state/bulk-consumer + Other) == region` and `sum(regions) == national`, within the documented tolerance.
- [ ] **Day 32:** Compare reconciled vs. base forecast accuracy at each level — this is your headline result.
- [ ] **Day 33:** Implement bottom-up and top-down reconciliation as comparison baselines.
- [ ] **Day 34:** Write a results summary comparing all reconciliation strategies with numbers and plots.

### Phase 6 — Evaluation & Backtesting Rigor (Days 35-38)

- [ ] **Day 35:** Implement full rolling-origin backtest across multiple time windows; report average metrics across folds.
- [ ] **Day 36:** Analyze error patterns — worst performance around festivals, extreme summer demand, or the COVID period?
- [ ] **Day 37:** Write `tests/test_reconciliation_coherence.py` as an automated pytest suite.
- [ ] **Day 38:** Clean up evaluation code; generate final result plots (actual vs predicted, per level).

### Phase 7 — FastAPI Microservice (Days 39-46)

- [ ] **Day 39:** Scaffold FastAPI app (`api/main.py`), define pydantic schemas (`api/schemas.py`).
- [ ] **Day 40:** Implement `GET /health` and `GET /forecast/{node_id}` endpoints.
- [ ] **Day 41:** Implement `GET /forecast/hierarchy` returning the full coherent 3-level tree.
- [ ] **Day 42:** Build `streaming_simulator.py` replaying historical daily data at accelerated speed.
- [ ] **Day 43:** Implement `POST /ingest` triggering a rolling re-forecast on new simulated data.
- [ ] **Day 44:** Test the full API locally with `uvicorn`; confirm correct coherent outputs via curl/Postman.
- [ ] **Day 45:** Write `tests/test_api.py` using FastAPI's TestClient.
- [ ] **Day 46:** Add error handling, input validation, and logging to the API.

### Phase 8 — Deployment & Polish (Days 47-52)

- [ ] **Day 47:** Write `Dockerfile`, build and run the container locally.
- [ ] **Day 48:** (Optional, high-value) Deploy to Render/Railway/GCP Cloud Run for a live public URL.
- [ ] **Day 49:** Write comprehensive docstrings and inline comments across `src/` and `api/`.
- [ ] **Day 50:** Finalize this README with actual results (replace placeholders with real MAPE/RMSE numbers and plots).
- [ ] **Day 51:** Record a short demo showing the API returning coherent 3-level forecasts.
- [ ] **Day 52:** Final review: clean commit history, tag `v1.0`, write a short portfolio summary.

---

## 10. Agent Instructions — How to Use This README

If you are an AI coding agent (Claude, GPT, etc.) picking up this project:

1. **Follow the phases in order** — each phase depends on artifacts from the previous one.
2. **Treat each Day as one atomic task.** Implement exactly what that day specifies, test it, then stop.
3. **This data is DAILY, not hourly.** Do not introduce hourly features, hourly lags, or hourly forecast horizons anywhere in this pipeline — this was explicitly verified in Section 5.1 and is a hard constraint, not a simplification.
4. **The hierarchy is 3 real levels: State/bulk-consumer -> Region -> National.** Do not collapse this back to 2 levels; the 3rd level (state/bulk-consumer) is the entire point of this version of the project and was specifically obtained to satisfy that requirement.
5. **Always validate before proceeding** — run relevant tests in `tests/` after each phase. Time series bugs (data leakage, lookahead bias, incorrect hierarchy membership) are silent and compounding.
6. **Preserve the tech stack in Section 6** unless explicitly told to substitute a tool.
7. **Never use a random train/test split for time series data** — always rolling-origin / walk-forward validation.
8. **The 2020-09-30 outlier and the ~19 other reconciliation-gap days are known, documented, real data-quality issues** — investigate and handle them explicitly (Days 3 and 6), do not silently smooth them away without documentation.
9. **When reconciliation coherence tests fail, stop and debug immediately** before proceeding to later phases.
10. **Document every deviation from this plan** in a `DECISIONS.md` file with a one-line justification.

---

## 11. Success Criteria / Definition of Done

- [ ] Reconciled forecasts are mathematically coherent (coherence error near 0, per documented tolerance) across all 3 hierarchy levels
- [ ] Reconciled forecasts show measurable accuracy improvement over unreconciled base forecasts (document the % improvement)
- [ ] The 2020-09-30 outlier and other known data-quality issues are explicitly documented, not silently hidden
- [ ] FastAPI service runs locally and (ideally) is deployed with a public URL
- [ ] All core logic has automated test coverage (hierarchy construction, reconciliation coherence, API endpoints)
- [ ] README is fully filled in with real results, not placeholders
- [ ] You can explain, without notes, why MinT beats bottom-up/top-down reconciliation, why the data is daily not hourly, and how the "Other/Unmetered" node works

## 12. Future Extensions

- Add probabilistic forecasting (prediction intervals) — quantile LightGBM or conformal prediction
- Add anomaly detection to flag demand shocks (e.g., a repeat of the COVID-19 pattern, or the 2020-09-30-style reporting gap)
- Add a lightweight frontend dashboard (Streamlit/React) visualizing live reconciled forecasts
- Extend the hierarchy with a 4th cross-sectional level by generation source (Thermal/Hydro/Nuclear/Gas/RES), which this dataset already provides at region and national level

---

*Maintainer note: This project is designed to be defensible in a technical interview or academic review at the level of an ML Engineer or Data Scientist. Every component above, including the data-quality decisions, should be something you can explain the "why," not just the "what," of.*
