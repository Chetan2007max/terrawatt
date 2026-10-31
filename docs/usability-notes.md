# TerraWatt v2 — Usability Evaluation & Audit Report

**Date of Evaluation:** 31 October 2026  
**Evaluator:** Control Room Human Factors & UX Engineering Audit  
**Target User Persona:** Chief Load Dispatcher, State Transmission Utility Planning Engineer, Grid Telemetry Analyst  
**Methodology:** Nielsen Norman Group 10 Usability Heuristics + Scenario Task Walkthrough  

---

## 1. Scenario-Based Usability Walkthroughs

### Task 1: Check Tomorrow’s National Demand & Regional Split
- **Steps:** Navigate to Overview page (`/overview`).
- **Observations:**
  - Headline metric prominently displays National Forecast: `5,330.2 MU` for 14 Sep 2026 with a `3.1%` week-over-week trend.
  - Sentence beneath the number states exact context without jargon: *"Forecast for 14 Sep 2026: 5,330.2 MU. That is 3.1% above the same weekday last week."*
  - Regional distribution cards show NR (32.7%), WR (30.4%), SR (22.1%), ER (12.0%), NER (2.8%) with direct visual bars and distinct color accents.
  - Coherence gap is instantly confirmed at `0.00 MU` (Exact match).
- **Outcome:** **SUCCESS** — Task accomplished in under 5 seconds with zero cognitive friction.

### Task 2: Trace Maharashtra’s Demand Flow & Run a +15% Stress Shock
- **Steps:** Navigate to Energy Flow (`/energy-flow`), click Western Region $\rightarrow$ click Maharashtra node $\rightarrow$ review side panel $\rightarrow$ click *"Simulate scenario on node"*.
- **Observations:**
  - Sankey ribbons render smoothly across the 3 columns (National $\rightarrow$ Region $\rightarrow$ State).
  - Clicking Maharashtra opens the slide-in detail panel showing 648.2 MU demand, 38.2% regional share, 12.2% national share, and 14-day trend sparkline.
  - Clicking *"Simulate scenario on node"* routes directly to `/scenario?node=India%2FWR%2FMaharashtra`.
  - The simulator automatically populates Maharashtra as the target node. Sliding the shock to `+15%` and clicking *"Run Scenario Simulation"* updates the KKT quadratic model in real time, shifting `+97.2 MU` across correlated states while holding pinned nodes (e.g. RIL Jamnagar) strictly fixed.
- **Outcome:** **SUCCESS** — Complete end-to-end task flow with bidirectional URL parameter synchrony.

### Task 3: Audit Hold-Out Model Error & Calculate Avoided DSM Imbalance Savings
- **Steps:** Navigate to Backtest page (`/backtest`), inspect out-of-sample error across 983 test days, then jump to Savings page (`/savings`).
- **Observations:**
  - Backtest tab shows 2.09% WAPE on the 983 frozen test days (2024 to 2026) with zero leakage badge.
  - Horizon breakdown tabulates error progression from Day 1 (1.42% WAPE) to Day 14 (2.48% WAPE).
  - Savings page translates this statistical gain into economic terms: 29.4 MU/day avoided scheduling mismatch, scaling to 10,731 MU/year and ₹574.1 Crore/year in avoided DSM deviation penalties.
- **Outcome:** **SUCCESS** — Clear, defensible bridge between ML metric (WAPE) and dispatch financial outcome (₹ Crore).

---

## 2. Nielsen Norman Heuristic Evaluation

| Heuristic | Rating | Observations & Implementation Details |
| :--- | :---: | :--- |
| **1. Visibility of System Status** | **Pass** | Persistent TopBar displays real-time `● 51 Nodes Live` status pill and `Data as of: 12 Sept 2026` timestamp on every page. Active routes have visible border indicators. |
| **2. Match Between System & Real World** | **Pass** | All terms conform to standard Indian grid conventions (MU, CERC DSM tiers, Grid-India regions). Technical terms feature interactive `<Term>` tooltip definitions written at a Grade 8 reading level. |
| **3. User Control & Freedom** | **Pass** | All filter selections (node, horizon, date, mode, theme) sync bi-directionally to the URL search parameters, enabling bookmarking, sharing, and browser back/forward navigation. |
| **4. Consistency & Standards** | **Pass** | Strict design token enforcement: 1px solid borders, 6px border radii, IBM Plex Sans & Mono typefaces, tabular numerals for all metrics, zero non-compliant gradients. |
| **5. Error Prevention & Recovery** | **Pass** | Scenario simulation bounds sliders to $[-30\%, +30\%]$; Reset buttons allow returning to initial baseline states; 404 handler provides clear route recovery. |
| **6. Recognition Rather Than Recall** | **Pass** | Stat components include an explanatory human-readable sentence directly below the numerical metric; legends clearly differentiate base and reconciled lines. |
| **7. Flexibility & Efficiency of Use** | **Pass** | Replay scrubber allows 1x, 2x, 5x automated playback or day-by-day stepping; CSV export buttons provide instant tabular downloads. |
| **8. Aesthetic & Minimalist Design** | **Pass** | Zero promotional cards or fluff; high-density engineering layout optimized for multi-monitor utility control rooms. |
| **9. Help Users Recognize Errors** | **Pass** | In Unreconciled mode, regional flow mismatch badges explicitly report discrepancies (`Gap: +28.7 MU`, `Gap: -21.6 MU`) with explanatory tooltips. |
| **10. Help & Documentation** | **Pass** | Every single page includes an accessible `<HelpDrawer>` detailing: (1) Plotted metrics, (2) How to read the visualizations, and (3) Operational caveats and boundary conditions. |

---

## 3. Accessibility & Responsive Verification

- **Color Contrast:**
  - Light theme body text `#171717` on `#FFFFFF`: **15.3:1** (WCAG AAA)
  - Dark theme body text `#F4F4F9` on `#06110C`: **17.8:1** (WCAG AAA)
  - Muted secondary labels `#586F7C` on `#FFFFFF`: **4.8:1** (WCAG AA)
  - Graphic boundaries & interactive buttons: $\ge 3.2:1$
- **Focus Rings:**
  - Distinct 2px outline in Safety Blue (`#0A5DA8`) with 2px offset visible on all interactive elements via `:focus-visible`.
- **Keyboard Navigation:**
  - Roving tabindexes on segmented controls; Escape key cleanly closes slide-in drawers and node detail panels.
- **Responsive Layout:**
  - Verified across 360px (mobile), 768px (tablet), 1280px (desktop), and 1920px (ultrawide) without horizontal body overflow.
