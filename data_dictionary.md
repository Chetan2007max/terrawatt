# TerraWatt Data Dictionary & Supply-Side Column Audit

> **Dataset:** GRID-INDIA (POSOCO) Daily Energy Reports (2013-01-02 to 2026-09-12).
> **Total Raw Rows:** 5,002 | **Reliable Rows (from 2013-03-31):** 4,914.
> **Status:** Verified and updated with Phase A refinements.

---

## 1. Verified Physical Units

> **Note on Provenance:** Units and descriptions below are **Inferred** based on reported daily numerical magnitudes, standard Indian power sector definitions (1 MU = 1 Million Units = 1 GWh = $10^6$ kWh), and NLDC operational reporting conventions, unless confirmed by an official `POSOCO_metadata.json` schema.

| Metric Category | Unit (Status) | Physical Meaning & Magnitude |
|---|---|---|
| **Energy Metrics** (`EnergyMet`, `EnergyShortage`) | **MU/day** *(Inferred)* | Million Units ($10^6\text{ kWh} = 1\text{ GWh}$). Cumulative electrical work over 24-hour day. |
| **Demand Power Metrics** (`DemandMet`, `MaximumDemand`, `PeakShortage`) | **MW** *(Inferred)* | Megawatts ($10^6\text{ W}$). Instantaneous power capacity measured at the peak load hour. |
| **Generation Metrics** (`Total`, `Coal`, `Lignite`, `Gas`, `Hydro`, `Nuclear`, `RES`, `HydroGen`, `WindGen`, `SolarGen`) | **MU/day** *(Inferred)* | Million Units generated per calendar day by specific fuel/technology. |

---

## 2. Generation Reporting Windows & First Non-Null Dates

Generation fuel breakdown columns are **almost completely unpopulated before late 2017 / 2018**. The table below documents the exact first non-null date and reliable non-null row count for each column.

| Column | First Non-Null Date | Non-Null Rows (out of 4,914) | Coverage (%) | Reporting Period Note |
|---|---|---|---|---|
| `India: EnergyMet` | **2013-03-31** | 4914 / 4,914 | 100.0% | Continuously populated across reliable era |
| `India: DemandMet` | **2013-03-31** | 4889 / 4,914 | 99.5% | Continuously populated across reliable era |
| `India: PeakShortage` | **2013-03-31** | 4890 / 4,914 | 99.5% | Continuously populated across reliable era |
| `India: HydroGen` | **2013-03-31** | 4890 / 4,914 | 99.5% | Continuously populated across reliable era |
| `India: WindGen` | **2013-03-31** | 4890 / 4,914 | 99.5% | Continuously populated across reliable era |
| `India: SolarGen` | **2016-09-27** | 3637 / 4,914 | 74.0% | Introduced mid-2016 as solar utility tracking expanded |
| `India: MaximumDemand` | **2017-04-20** | 3429 / 4,914 | 69.8% | Active from 2017-04-20 |
| `India: EnergyShortage` | **2017-05-08** | 3413 / 4,914 | 69.5% | Introduced mid-2017; empty in 2013-2016 reports |
| `India: Total` | **2017-08-28** | 3301 / 4,914 | 67.2% | Introduced late August 2017; fully active from 2018 onward |
| `India: Thermal` | **2017-08-28** | 578 / 4,914 | 11.8% | Active only 2017-08 to 2018-12 (578 days total), then unpopulated |
| `India: Gas` | **2017-08-28** | 3301 / 4,914 | 67.2% | Introduced late August 2017; fully active from 2018 onward |
| `India: Hydro` | **2017-08-28** | 3301 / 4,914 | 67.2% | Introduced late August 2017; fully active from 2018 onward |
| `India: Nuclear` | **2017-08-28** | 3301 / 4,914 | 67.2% | Introduced late August 2017; fully active from 2018 onward |
| `India: RES` | **2017-08-28** | 3301 / 4,914 | 67.2% | Introduced late August 2017; fully active from 2018 onward |
| `India: Coal` | **2018-11-29** | 2843 / 4,914 | 57.9% | Introduced late 2018 when fuel breakdown detailed coal/lignite |
| `India: Lignite` | **2018-11-29** | 2843 / 4,914 | 57.9% | Introduced late 2018 when fuel breakdown detailed coal/lignite |

---

## 3. Hierarchy Additivity & Failure Audit

### 3.1 Demand Additivity (`India: EnergyMet` vs Sum of 5 Regions)
- **Days within 1.0 MU:** **4882 / 4914 days (99.35%)**.
- **Days failing additivity (> 1.0 MU discrepancy):** Exactly **32 days**.
- **Root Cause Analysis of Failures:**
  - 31 of the 32 failing days exhibit a discrepancy of exactly $\pm 2.0\text{ MU}$, stemming from integer-rounding of state/regional reports in historical POSOCO publications.
  - Exactly **1 single non-rounding outlier exists:** `2025-09-21` (India: 4882.63 MU, Regions Sum: 4800.53 MU, Diff: `+82.10 MU`).

| Date | National EnergyMet | Sum of 5 Regions | Discrepancy (MU) | Nature of Discrepancy |
|---|---|---|---|---|
| 2013-07-20 | 2592.00 MU | 2594.00 MU | -2.00 MU | Historical integer-rounding artifact |
| 2013-07-28 | 2579.00 MU | 2581.00 MU | -2.00 MU | Historical integer-rounding artifact |
| 2013-08-19 | 2533.00 MU | 2535.00 MU | -2.00 MU | Historical integer-rounding artifact |
| 2013-12-05 | 2624.00 MU | 2622.00 MU | +2.00 MU | Historical integer-rounding artifact |
| 2014-10-14 | 2828.00 MU | 2830.00 MU | -2.00 MU | Historical integer-rounding artifact |
| 2014-11-25 | 2816.00 MU | 2818.00 MU | -2.00 MU | Historical integer-rounding artifact |
| 2014-12-25 | 2824.00 MU | 2826.00 MU | -2.00 MU | Historical integer-rounding artifact |
| 2015-07-29 | 3011.00 MU | 3013.00 MU | -2.00 MU | Historical integer-rounding artifact |
| 2016-09-23 | 3255.00 MU | 3257.00 MU | -2.00 MU | Historical integer-rounding artifact |
| 2017-08-25 | 3306.00 MU | 3308.00 MU | -2.00 MU | Historical integer-rounding artifact |
| ... (21 additional days) | ... | ... | $\pm 2.00$ MU | Historical integer-rounding artifact |
| **2025-09-21** | **4882.63 MU** | **4800.53 MU** | **+82.10 MU** | **Isolated reporting gap on 2025-09-21** |

### 3.2 Generation Additivity (`India: Total` vs Sum of 5 Regions)
- **Days within 1.0 MU:** **3254 / 3301 days (98.58%)** (evaluated on 3,301 days with generation data).
- **Days failing additivity (> 1.0 MU discrepancy):** Exactly **47 days**.
- **Largest 5 Generation Additivity Discrepancies:**

| Date | National Total Gen | Sum of 5 Regions | Discrepancy (MU) | Note |
|---|---|---|---|---|
| 2023-09-01 | 5317.20 MU | 5549.97 MU | -232.77 MU | Outlier in national summary vs regional breakdown |
| 2022-11-08 | 3939.00 MU | 3986.00 MU | -47.00 MU | Outlier in national summary vs regional breakdown |
| 2023-06-19 | 5086.51 MU | 5100.12 MU | -13.61 MU | Outlier in national summary vs regional breakdown |
| 2026-08-15 | 5522.00 MU | 5510.68 MU | +11.32 MU | Outlier in national summary vs regional breakdown |
| 2024-03-20 | 4878.00 MU | 4868.47 MU | +9.53 MU | Outlier in national summary vs regional breakdown |

---

## 4. Generation-Minus-Demand Gap & National Calibration

### 4.1 Physical Interpretation
The algebraic difference $\text{Total} - \text{EnergyMet}$ is designated as the **'generation-minus-demand gap'**. It is **not** called inter-regional physical flow because:
1. This dataset does not meter boundary transmission tie-lines directly.
2. At the national level, gross generation exceeds met demand by ~`4.59%` (`211.9 MU/day`) due to internal generating station auxiliary consumption and grid transmission losses.

### 4.2 Calibration Formula
To account for national auxiliary consumption and transmission losses so that regional balances sum to approximately zero across the grid, we define the daily national delivery ratio:
$$\alpha_t = \frac{\text{India: EnergyMet}_t}{\text{India: Total}_t} \quad (\text{Mean } \alpha = 0.9541)$$
The **Calibrated Generation-Minus-Demand Gap** for region $r$ is:
$$\text{Calibrated Gap}_r = (\alpha_t \times \text{Total}_r) - \text{EnergyMet}_r$$
Because $\sum_r \text{Total}_r \approx \text{India: Total}$ and $\sum_r \text{EnergyMet}_r \approx \text{India: EnergyMet}$, the sum of calibrated gaps across all 5 regions equals **`+0.10 MU/day` ($pprox 0$)**.

| Region | Raw Gap Mean (`Total - EnergyMet`) | Calibrated Gap Mean | Calibrated P05 | Calibrated P95 | Grid Accounting Role |
|---|---|---|---|---|---|
| **NR** | `-163.5 MU/day` | **`-215.8 MU/day`** | `-384.6 MU` | `-78.6 MU` | Net Demand Deficit (Absorbs power from grid) |
| **WR** | `+283.3 MU/day` | **`+205.6 MU/day`** | `+65.6 MU` | `+331.9 MU` | Net Generation Surplus (Delivers power outward) |
| **SR** | `-65.4 MU/day` | **`-113.4 MU/day`** | `-259.5 MU` | `+31.1 MU` | Net Demand Deficit (Absorbs power from grid) |
| **ER** | `+152.8 MU/day` | **`+121.6 MU/day`** | `+40.8 MU` | `+214.8 MU` | Net Generation Surplus (Delivers power outward) |
| **NER** | `+4.8 MU/day` | **`+2.1 MU/day`** | `-10.2 MU` | `+15.4 MU` | Broadly balanced with seasonal swing |
| **All 5 Regions Sum** | `+211.9 MU/day` (Losses/Aux) | **`+0.10 MU/day` ($pprox 0$)** | `-1.2 MU` | `+1.3 MU` | **Mathematically balanced** |

---

## 5. Materiality-Threshold Shortage Analysis (Recent Years: 2018–2026)

To eliminate sensor floating-point noise, shortage frequencies are evaluated over **recent reliable years (2018-01-01 to 2026-09-12, $N = 3,177$ reliable days)** using explicit materiality thresholds:
- **Material Energy Shortage:** $\ge 1.0\text{ MU/day}$ (1 GWh unserved energy).
- **Material Peak Shortage:** $\ge 50.0\text{ MW}$ deficit.

| Region | Valid Days ($N$) | EnergyShortage $\ge 1.0\text{ MU}$ | EnergyShortage $\ge 5.0\text{ MU}$ | PeakShortage $\ge 50\text{ MW}$ | PeakShortage $\ge 500\text{ MW}$ | Mean Shortage (when $\ge 1.0\text{ MU}$) |
|---|---|---|---|---|---|---|
| **NR** | 3175 | **2190 (69.0%)** | 1619 (51.0%) | **2195 (69.1%)** | 1323 (41.7%) | `10.39 MU/day` |
| **WR** | 3175 | **340 (10.7%)** | 105 (3.3%) | **396 (12.5%)** | 103 (3.2%) | `5.82 MU/day` |
| **SR** | 3175 | **174 (5.5%)** | 57 (1.8%) | **202 (6.4%)** | 69 (2.2%) | `5.79 MU/day` |
| **ER** | 3175 | **962 (30.3%)** | 216 (6.8%) | **1229 (38.7%)** | 343 (10.8%) | `3.90 MU/day` |
| **NER** | 3175 | **745 (23.5%)** | 25 (0.8%) | **890 (28.0%)** | 12 (0.4%) | `1.98 MU/day` |
| **India** | 3175 | **2524 (79.5%)** | 1916 (60.3%) | **2565 (80.8%)** | 1821 (57.4%) | `12.65 MU/day` |

---

## 6. Region-by-Region Metrics Table

### 6.1 Northern Region (NR)

| Metric | Unit | Null % (All) | Null % (Rel) | Null % (2018+) | Min | Median | Mean | P95 | Max | Description |
|---|---|---|---|---|---|---|---|---|---|---|
| `NR: EnergyMet` | MU/day (Inferred) | 1.7% | 0.0% | 0.0% | 566.0 | 1051.0 | 1108.6 | 1702.3 | 2095.0 | Total electrical energy demand supplied over 24-hour day (1 MU = 1 GWh) |
| `NR: DemandMet` | MW (Inferred) | 2.2% | 0.5% | 0.1% | 24307.0 | 48122.0 | 50200.5 | 74703.0 | 91597.0 | Peak instantaneous electrical demand supplied during the day |
| `NR: MaximumDemand` | MW (Inferred) | 31.4% | 30.2% | 0.1% | 27775.0 | 56379.0 | 58093.8 | 80584.2 | 95027.0 | Maximum instantaneous electrical power demanded by grid customers |
| `NR: PeakShortage` | MW (Inferred) | 2.2% | 0.5% | 0.0% | 0.0 | 586.0 | 944.3 | 2804.2 | 8359.0 | Deficit between demand and supply at the peak load hour |
| `NR: EnergyShortage` | MU/day (Inferred) | 31.8% | 30.5% | 0.1% | 0.0 | 6.6 | 7.8 | 20.6 | 156.5 | Total unserved electrical energy across the entire 24-hour day |
| `NR: Total` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 545.0 | 1028.4 | 1050.4 | 1520.4 | 1877.1 | Total gross electrical energy generated by all sources within the region |
| `NR: Thermal` | MU/day (Inferred) | 88.4% | 88.2% | 85.8% | 0.0 | 540.0 | 442.8 | 647.1 | 704.0 | Thermal generation column (active only 2017-08 to 2018-12, 578 days total) |
| `NR: Coal` | MU/day (Inferred) | 43.2% | 42.1% | 10.5% | 261.0 | 661.7 | 645.3 | 858.9 | 1102.6 | Daily electrical energy generated by coal-fired thermal power plants |
| `NR: Lignite` | MU/day (Inferred) | 43.2% | 42.1% | 10.5% | 0.0 | 24.0 | 23.9 | 31.0 | 35.0 | Daily electrical energy generated by lignite-fired thermal power plants |
| `NR: Gas` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 0.5 | 22.0 | 23.7 | 49.0 | 74.0 | Daily electrical energy generated by natural gas-fired turbines |
| `NR: Hydro` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 86.8 | 176.0 | 215.3 | 394.8 | 508.4 | Daily electrical energy generated by conventional hydroelectric stations |
| `NR: Nuclear` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 5.4 | 28.0 | 29.1 | 45.5 | 53.2 | Daily electrical energy generated by civilian nuclear power reactors |
| `NR: RES` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 5.0 | 116.4 | 128.4 | 269.0 | 553.1 | Renewable Energy Sources total (Wind, Solar, Biomass, Small Hydro) |
| `NR: HydroGen` | MU/day (Inferred) | 2.2% | 0.5% | 0.0% | 80.0 | 175.0 | 211.1 | 380.2 | 508.4 | Hydro generation stream (tracked 2013-2026) |
| `NR: WindGen` | MU/day (Inferred) | 2.2% | 0.5% | 0.0% | 0.0 | 12.1 | 16.7 | 47.7 | 98.5 | Wind turbine generation stream (tracked 2013-2026) |
| `NR: SolarGen` | MU/day (Inferred) | 27.3% | 26.0% | 0.0% | 0.0 | 53.6 | 82.6 | 220.4 | 280.3 | Solar photovoltaic generation stream (tracked from 2016-09-27 onward) |

### 6.2 Western Region (WR)

| Metric | Unit | Null % (All) | Null % (Rel) | Null % (2018+) | Min | Median | Mean | P95 | Max | Description |
|---|---|---|---|---|---|---|---|---|---|---|
| `WR: EnergyMet` | MU/day (Inferred) | 1.7% | 0.0% | 0.0% | 668.0 | 1123.0 | 1165.8 | 1600.8 | 1789.5 | Total electrical energy demand supplied over 24-hour day (1 MU = 1 GWh) |
| `WR: DemandMet` | MW (Inferred) | 2.2% | 0.5% | 0.1% | 29217.0 | 47387.0 | 49400.5 | 67039.0 | 75708.0 | Peak instantaneous electrical demand supplied during the day |
| `WR: MaximumDemand` | MW (Inferred) | 31.4% | 30.2% | 0.1% | 34030.0 | 57153.0 | 58389.8 | 77362.0 | 83525.0 | Maximum instantaneous electrical power demanded by grid customers |
| `WR: PeakShortage` | MW (Inferred) | 2.2% | 0.5% | 0.0% | 0.0 | 0.0 | 130.0 | 647.1 | 4655.0 | Deficit between demand and supply at the peak load hour |
| `WR: EnergyShortage` | MU/day (Inferred) | 31.8% | 30.5% | 0.1% | 0.0 | 0.0 | 0.7 | 3.2 | 45.2 | Total unserved electrical energy across the entire 24-hour day |
| `WR: Total` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 657.0 | 1503.0 | 1565.5 | 2057.9 | 2336.5 | Total gross electrical energy generated by all sources within the region |
| `WR: Thermal` | MU/day (Inferred) | 88.4% | 88.2% | 85.8% | 0.0 | 1110.5 | 895.2 | 1235.2 | 1419.0 | Thermal generation column (active only 2017-08 to 2018-12, 578 days total) |
| `WR: Coal` | MU/day (Inferred) | 43.2% | 42.1% | 10.5% | 731.0 | 1305.0 | 1306.5 | 1632.7 | 1760.5 | Daily electrical energy generated by coal-fired thermal power plants |
| `WR: Lignite` | MU/day (Inferred) | 43.2% | 42.1% | 10.5% | 1.0 | 14.0 | 13.9 | 20.2 | 89.0 | Daily electrical energy generated by lignite-fired thermal power plants |
| `WR: Gas` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 0.0 | 36.0 | 37.2 | 81.0 | 118.8 | Daily electrical energy generated by natural gas-fired turbines |
| `WR: Hydro` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 7.0 | 41.0 | 47.5 | 107.8 | 135.9 | Daily electrical energy generated by conventional hydroelectric stations |
| `WR: Nuclear` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 0.0 | 33.0 | 38.3 | 65.0 | 321.7 | Daily electrical energy generated by civilian nuclear power reactors |
| `WR: RES` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 16.0 | 122.0 | 148.6 | 343.4 | 568.4 | Renewable Energy Sources total (Wind, Solar, Biomass, Small Hydro) |
| `WR: HydroGen` | MU/day (Inferred) | 2.2% | 0.5% | 0.0% | 7.0 | 41.0 | 47.0 | 105.0 | 167.0 | Hydro generation stream (tracked 2013-2026) |
| `WR: WindGen` | MU/day (Inferred) | 2.2% | 0.5% | 0.0% | 3.0 | 54.8 | 70.8 | 189.1 | 385.1 | Wind turbine generation stream (tracked 2013-2026) |
| `WR: SolarGen` | MU/day (Inferred) | 27.3% | 26.0% | 0.0% | 0.0 | 35.5 | 54.8 | 166.4 | 256.6 | Solar photovoltaic generation stream (tracked from 2016-09-27 onward) |

### 6.3 Southern Region (SR)

| Metric | Unit | Null % (All) | Null % (Rel) | Null % (2018+) | Min | Median | Mean | P95 | Max | Description |
|---|---|---|---|---|---|---|---|---|---|---|
| `SR: EnergyMet` | MU/day (Inferred) | 1.7% | 0.0% | 0.0% | 595.0 | 920.0 | 956.4 | 1326.5 | 1532.9 | Total electrical energy demand supplied over 24-hour day (1 MU = 1 GWh) |
| `SR: DemandMet` | MW (Inferred) | 2.2% | 0.5% | 0.1% | 23694.0 | 39433.0 | 40132.7 | 52596.0 | 61049.0 | Peak instantaneous electrical demand supplied during the day |
| `SR: MaximumDemand` | MW (Inferred) | 31.4% | 30.2% | 0.1% | 31110.0 | 47143.0 | 48975.4 | 65971.8 | 76695.0 | Maximum instantaneous electrical power demanded by grid customers |
| `SR: PeakShortage` | MW (Inferred) | 2.2% | 0.5% | 0.0% | 0.0 | 0.0 | 408.6 | 2353.0 | 6792.0 | Deficit between demand and supply at the peak load hour |
| `SR: EnergyShortage` | MU/day (Inferred) | 31.8% | 30.5% | 0.1% | 0.0 | 0.0 | 0.3 | 1.1 | 28.8 | Total unserved electrical energy across the entire 24-hour day |
| `SR: Total` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 594.0 | 954.0 | 976.7 | 1276.8 | 1500.1 | Total gross electrical energy generated by all sources within the region |
| `SR: Thermal` | MU/day (Inferred) | 88.4% | 88.2% | 85.8% | 0.0 | 526.0 | 431.6 | 658.1 | 730.0 | Thermal generation column (active only 2017-08 to 2018-12, 578 days total) |
| `SR: Coal` | MU/day (Inferred) | 43.2% | 42.1% | 10.5% | 223.0 | 563.8 | 560.2 | 764.1 | 912.0 | Daily electrical energy generated by coal-fired thermal power plants |
| `SR: Lignite` | MU/day (Inferred) | 43.2% | 42.1% | 10.5% | 11.0 | 46.3 | 46.1 | 64.0 | 101.0 | Daily electrical energy generated by lignite-fired thermal power plants |
| `SR: Gas` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 0.0 | 10.0 | 11.3 | 22.0 | 47.0 | Daily electrical energy generated by natural gas-fired turbines |
| `SR: Hydro` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 23.3 | 82.7 | 91.5 | 173.0 | 209.3 | Daily electrical energy generated by conventional hydroelectric stations |
| `SR: Nuclear` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 14.0 | 55.3 | 56.0 | 75.9 | 77.0 | Daily electrical energy generated by civilian nuclear power reactors |
| `SR: RES` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 56.0 | 197.8 | 220.3 | 395.0 | 559.8 | Renewable Energy Sources total (Wind, Solar, Biomass, Small Hydro) |
| `SR: HydroGen` | MU/day (Inferred) | 2.2% | 0.5% | 0.0% | 12.0 | 77.0 | 84.0 | 166.0 | 209.3 | Hydro generation stream (tracked 2013-2026) |
| `SR: WindGen` | MU/day (Inferred) | 2.2% | 0.5% | 0.0% | 2.0 | 48.8 | 77.0 | 230.2 | 405.3 | Wind turbine generation stream (tracked 2013-2026) |
| `SR: SolarGen` | MU/day (Inferred) | 27.3% | 26.0% | 0.0% | 7.2 | 90.6 | 88.7 | 154.3 | 214.5 | Solar photovoltaic generation stream (tracked from 2016-09-27 onward) |

### 6.4 Eastern Region (ER)

| Metric | Unit | Null % (All) | Null % (Rel) | Null % (2018+) | Min | Median | Mean | P95 | Max | Description |
|---|---|---|---|---|---|---|---|---|---|---|
| `ER: EnergyMet` | MU/day (Inferred) | 1.7% | 0.0% | 0.0% | 173.0 | 403.0 | 427.2 | 631.7 | 750.7 | Total electrical energy demand supplied over 24-hour day (1 MU = 1 GWh) |
| `ER: DemandMet` | MW (Inferred) | 2.2% | 0.5% | 0.1% | 9418.0 | 19555.0 | 20243.3 | 28370.2 | 33056.0 | Peak instantaneous electrical demand supplied during the day |
| `ER: MaximumDemand` | MW (Inferred) | 31.4% | 30.2% | 0.1% | 13708.0 | 21962.0 | 22778.5 | 30637.2 | 34900.0 | Maximum instantaneous electrical power demanded by grid customers |
| `ER: PeakShortage` | MW (Inferred) | 2.2% | 0.5% | 0.0% | 0.0 | 50.0 | 196.0 | 745.0 | 2370.0 | Deficit between demand and supply at the peak load hour |
| `ER: EnergyShortage` | MU/day (Inferred) | 31.8% | 30.5% | 0.1% | 0.0 | 0.1 | 1.2 | 5.7 | 30.8 | Total unserved electrical energy across the entire 24-hour day |
| `ER: Total` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 381.0 | 630.0 | 624.3 | 796.0 | 889.5 | Total gross electrical energy generated by all sources within the region |
| `ER: Thermal` | MU/day (Inferred) | 88.4% | 88.2% | 85.8% | 0.0 | 388.0 | 323.2 | 471.0 | 501.0 | Thermal generation column (active only 2017-08 to 2018-12, 578 days total) |
| `ER: Coal` | MU/day (Inferred) | 43.2% | 42.1% | 10.5% | 283.0 | 591.0 | 579.2 | 750.1 | 815.2 | Daily electrical energy generated by coal-fired thermal power plants |
| `ER: Lignite` | MU/day (Inferred) | 43.2% | 42.1% | 10.5% | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | Daily electrical energy generated by lignite-fired thermal power plants |
| `ER: Gas` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | Daily electrical energy generated by natural gas-fired turbines |
| `ER: Hydro` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 9.2 | 50.2 | 64.8 | 139.6 | 157.0 | Daily electrical energy generated by conventional hydroelectric stations |
| `ER: Nuclear` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | Daily electrical energy generated by civilian nuclear power reactors |
| `ER: RES` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 0.0 | 4.6 | 4.1 | 7.0 | 38.7 | Renewable Energy Sources total (Wind, Solar, Biomass, Small Hydro) |
| `ER: HydroGen` | MU/day (Inferred) | 2.2% | 0.5% | 0.0% | 7.0 | 47.3 | 59.2 | 135.9 | 157.0 | Hydro generation stream (tracked 2013-2026) |
| `ER: WindGen` | MU/day (Inferred) | 99.9% | 99.9% | 99.9% | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | Wind turbine generation stream (tracked 2013-2026) |
| `ER: SolarGen` | MU/day (Inferred) | 27.3% | 26.0% | 0.0% | 0.0 | 2.9 | 2.9 | 5.3 | 9.1 | Solar photovoltaic generation stream (tracked from 2016-09-27 onward) |

### 6.5 North-Eastern Region (NER)

| Metric | Unit | Null % (All) | Null % (Rel) | Null % (2018+) | Min | Median | Mean | P95 | Max | Description |
|---|---|---|---|---|---|---|---|---|---|---|
| `NER: EnergyMet` | MU/day (Inferred) | 1.7% | 0.0% | 0.0% | 22.0 | 44.0 | 46.3 | 68.8 | 82.7 | Total electrical energy demand supplied over 24-hour day (1 MU = 1 GWh) |
| `NER: DemandMet` | MW (Inferred) | 2.2% | 0.5% | 0.1% | 463.0 | 2482.0 | 2533.0 | 3491.0 | 4276.0 | Peak instantaneous electrical demand supplied during the day |
| `NER: MaximumDemand` | MW (Inferred) | 31.4% | 30.2% | 0.1% | 1490.0 | 2748.0 | 2824.5 | 3671.8 | 5404.0 | Maximum instantaneous electrical power demanded by grid customers |
| `NER: PeakShortage` | MW (Inferred) | 2.2% | 0.5% | 0.0% | 0.0 | 54.0 | 100.4 | 331.0 | 1737.0 | Deficit between demand and supply at the peak load hour |
| `NER: EnergyShortage` | MU/day (Inferred) | 31.8% | 30.5% | 0.1% | 0.0 | 0.2 | 0.6 | 2.4 | 9.8 | Total unserved electrical energy across the entire 24-hour day |
| `NER: Total` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 23.0 | 53.0 | 55.7 | 78.0 | 113.0 | Total gross electrical energy generated by all sources within the region |
| `NER: Thermal` | MU/day (Inferred) | 88.4% | 88.2% | 85.8% | 0.0 | 5.0 | 5.4 | 10.0 | 49.0 | Thermal generation column (active only 2017-08 to 2018-12, 578 days total) |
| `NER: Coal` | MU/day (Inferred) | 43.2% | 42.1% | 10.5% | 0.0 | 12.0 | 11.7 | 16.7 | 52.0 | Daily electrical energy generated by coal-fired thermal power plants |
| `NER: Lignite` | MU/day (Inferred) | 43.2% | 42.1% | 10.5% | 0.0 | 0.0 | 0.0 | 0.0 | 10.0 | Daily electrical energy generated by lignite-fired thermal power plants |
| `NER: Gas` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 0.0 | 24.3 | 24.8 | 30.0 | 50.0 | Daily electrical energy generated by natural gas-fired turbines |
| `NER: Hydro` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 0.0 | 16.0 | 19.3 | 38.8 | 66.3 | Daily electrical energy generated by conventional hydroelectric stations |
| `NER: Nuclear` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 0.0 | 0.0 | 0.0 | 0.0 | 25.0 | Daily electrical energy generated by civilian nuclear power reactors |
| `NER: RES` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 0.0 | 0.0 | 0.5 | 1.2 | 19.0 | Renewable Energy Sources total (Wind, Solar, Biomass, Small Hydro) |
| `NER: HydroGen` | MU/day (Inferred) | 2.2% | 0.5% | 0.0% | 2.0 | 14.0 | 17.1 | 36.3 | 66.3 | Hydro generation stream (tracked 2013-2026) |
| `NER: WindGen` | MU/day (Inferred) | 99.9% | 99.9% | 99.9% | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | Wind turbine generation stream (tracked 2013-2026) |
| `NER: SolarGen` | MU/day (Inferred) | 27.3% | 26.0% | 0.0% | 0.0 | 0.2 | 0.4 | 1.2 | 10.5 | Solar photovoltaic generation stream (tracked from 2016-09-27 onward) |

### 6.6 National Total (India)

| Metric | Unit | Null % (All) | Null % (Rel) | Null % (2018+) | Min | Median | Mean | P95 | Max | Description |
|---|---|---|---|---|---|---|---|---|---|---|
| `India: EnergyMet` | MU/day (Inferred) | 1.7% | 0.0% | 0.0% | 2251.0 | 3568.5 | 3704.2 | 5030.2 | 6002.3 | Total electrical energy demand supplied over 24-hour day (1 MU = 1 GWh) |
| `India: DemandMet` | MW (Inferred) | 2.2% | 0.5% | 0.1% | 101278.0 | 157867.0 | 162507.6 | 217126.4 | 251144.0 | Peak instantaneous electrical demand supplied during the day |
| `India: MaximumDemand` | MW (Inferred) | 31.4% | 30.2% | 0.1% | 115232.0 | 180012.0 | 185398.2 | 236784.4 | 270820.0 | Maximum instantaneous electrical power demanded by grid customers |
| `India: PeakShortage` | MW (Inferred) | 2.2% | 0.5% | 0.0% | 0.0 | 920.0 | 1778.9 | 6041.8 | 12322.0 | Deficit between demand and supply at the peak load hour |
| `India: EnergyShortage` | MU/day (Inferred) | 31.8% | 30.5% | 0.1% | 0.0 | 10.0 | 10.6 | 28.0 | 214.1 | Total unserved electrical energy across the entire 24-hour day |
| `India: Total` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 2642.0 | 4107.0 | 4272.4 | 5575.6 | 6391.3 | Total gross electrical energy generated by all sources within the region |
| `India: Thermal` | MU/day (Inferred) | 88.4% | 88.2% | 85.8% | 0.0 | 2590.0 | 2098.2 | 2900.8 | 3088.0 | Thermal generation column (active only 2017-08 to 2018-12, 578 days total) |
| `India: Coal` | MU/day (Inferred) | 43.2% | 42.1% | 10.5% | 1727.0 | 3118.2 | 3103.0 | 3960.6 | 4360.5 | Daily electrical energy generated by coal-fired thermal power plants |
| `India: Lignite` | MU/day (Inferred) | 43.2% | 42.1% | 10.5% | 35.0 | 83.5 | 83.8 | 107.9 | 164.6 | Daily electrical energy generated by lignite-fired thermal power plants |
| `India: Gas` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 35.0 | 96.0 | 97.0 | 159.0 | 220.0 | Daily electrical energy generated by natural gas-fired turbines |
| `India: Hydro` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 171.0 | 387.7 | 438.3 | 775.3 | 898.6 | Daily electrical energy generated by conventional hydroelectric stations |
| `India: Nuclear` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 42.0 | 120.0 | 123.4 | 174.6 | 402.2 | Daily electrical energy generated by civilian nuclear power reactors |
| `India: RES` | MU/day (Inferred) | 34.0% | 32.8% | 0.1% | 109.0 | 456.6 | 501.8 | 944.1 | 1410.9 | Renewable Energy Sources total (Wind, Solar, Biomass, Small Hydro) |
| `India: HydroGen` | MU/day (Inferred) | 2.2% | 0.5% | 0.0% | 172.0 | 374.0 | 418.4 | 747.0 | 898.6 | Hydro generation stream (tracked 2013-2026) |
| `India: WindGen` | MU/day (Inferred) | 2.2% | 0.5% | 0.0% | 13.0 | 126.0 | 164.4 | 431.6 | 784.2 | Wind turbine generation stream (tracked 2013-2026) |
| `India: SolarGen` | MU/day (Inferred) | 27.3% | 26.0% | 0.0% | 15.0 | 190.0 | 229.4 | 537.6 | 696.4 | Solar photovoltaic generation stream (tracked from 2016-09-27 onward) |
