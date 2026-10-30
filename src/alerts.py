"""
alerts.py
Phase D: Heuristic Stress Indicators for TerraWatt v2.

Computes regional and national stress indicators from verified historical data:
1. Demand Stress: Compares scenario demand against historical distribution for the same calendar month
   (flags if > P99 of the month or exceeds all-time highest recorded EnergyMet).
2. Supply Stress: Compares demand against observed regional capability proxy (trailing 365-day max generation)
   plus empirical 95th percentile net import gap.
3. Historical Shortage Frequency: Share of days with material EnergyShortage (>= 1.0 MU/day) when demand was
   at or above a given fraction of peak capability (2018-2026). Enforces sample-size rule: suppresses
   frequency percentage if N < 30 days.
4. Low-Demand Indicator: Flags demand below the 5th percentile for that region and calendar month
   ("unusually low; thermal backing-down or renewable curtailment risk").

Severity Levels: info, watch, critical.
Mandatory Caveat:
"Ignores transmission limits, plant outages, inter-regional transfer limits, and intraday peaks, because the data is daily."
"""

import json
import os
from typing import Any, Dict, List, Optional

STRESS_METRICS_PATH = "artifacts/metrics/stress_reference_metrics.json"
CAVEAT_TEXT = "Ignores transmission limits, plant outages, inter-regional transfer limits, and intraday peaks, because the data is daily."


class StressAlertEngine:
    def __init__(self, metrics_path: str = STRESS_METRICS_PATH):
        self.metrics_path = metrics_path
        if not os.path.exists(self.metrics_path):
            raise FileNotFoundError(f"Stress reference metrics artifact not found at {self.metrics_path}")

        with open(self.metrics_path, "r", encoding="utf-8") as f:
            self.data = json.load(f)

        self.regions_data = self.data["regions"]
        self.caveat = self.data.get("caveat", CAVEAT_TEXT)

    def evaluate_region(self, region: str, demand_mu: float, month: int) -> List[Dict[str, Any]]:
        """
        Evaluate all 4 heuristic stress indicators for a single region (or 'India').
        Returns list of alert dictionaries sorted by severity (critical -> watch -> info).
        """
        if region not in self.regions_data:
            return []

        r_meta = self.regions_data[region]
        month_str = str(int(month))
        m_stats = r_meta["monthly_stats"].get(month_str, {})
        alerts = []

        # -------------------------------------------------------------
        # 1. Demand Stress Indicator
        # -------------------------------------------------------------
        all_time_max = r_meta["all_time_max_mu"]
        m_p99 = m_stats.get("p99", all_time_max)
        m_p95 = m_stats.get("p95", all_time_max)

        if demand_mu > all_time_max:
            exceed = round(demand_mu - all_time_max, 2)
            alerts.append({
                "indicator_type": "demand_stress",
                "region": region,
                "severity": "critical",
                "title": f"All-Time Maximum Demand Exceeded ({region})",
                "message": (
                    f"Scenario demand for {region} ({demand_mu:.1f} MU/day) exceeds the all-time recorded "
                    f"peak ({all_time_max:.1f} MU/day) by {exceed:.1f} MU/day."
                ),
                "evidence": {
                    "demand_mu": round(demand_mu, 2),
                    "all_time_max_mu": all_time_max,
                    "exceedance_mu": exceed,
                    "month": month,
                },
                "is_heuristic": True,
                "caveat": self.caveat,
            })
        elif demand_mu > m_p99:
            exceed = round(demand_mu - m_p99, 2)
            alerts.append({
                "indicator_type": "demand_stress",
                "region": region,
                "severity": "critical",
                "title": f"Severe Demand Stress (> P99 for Month {month})",
                "message": (
                    f"Scenario demand for {region} ({demand_mu:.1f} MU/day) exceeds the 99th percentile for "
                    f"month {month} ({m_p99:.1f} MU/day) by {exceed:.1f} MU/day."
                ),
                "evidence": {
                    "demand_mu": round(demand_mu, 2),
                    "month_p99_mu": m_p99,
                    "month_p95_mu": m_p95,
                    "exceedance_mu": exceed,
                    "month": month,
                },
                "is_heuristic": True,
                "caveat": self.caveat,
            })
        elif demand_mu > m_p95:
            exceed = round(demand_mu - m_p95, 2)
            alerts.append({
                "indicator_type": "demand_stress",
                "region": region,
                "severity": "watch",
                "title": f"Elevated Demand Stress (> P95 for Month {month})",
                "message": (
                    f"Scenario demand for {region} ({demand_mu:.1f} MU/day) exceeds the 95th percentile for "
                    f"month {month} ({m_p95:.1f} MU/day) by {exceed:.1f} MU/day."
                ),
                "evidence": {
                    "demand_mu": round(demand_mu, 2),
                    "month_p95_mu": m_p95,
                    "month_p99_mu": m_p99,
                    "exceedance_mu": exceed,
                    "month": month,
                },
                "is_heuristic": True,
                "caveat": self.caveat,
            })

        # -------------------------------------------------------------
        # 2. Supply Stress Indicator (Regional Generation + Typical Import)
        # -------------------------------------------------------------
        if region != "India":
            gen_proxy = r_meta["capability_proxy_365d_max_gen_mu"]
            p95_import = r_meta["p95_import_gap_mu"]
            supply_limit = r_meta["supply_limit_mu"]

            if demand_mu > supply_limit:
                deficit = round(demand_mu - supply_limit, 2)
                alerts.append({
                    "indicator_type": "supply_stress",
                    "region": region,
                    "severity": "critical",
                    "title": f"Regional Supply Capability Deficit ({region})",
                    "message": (
                        f"Scenario demand for {region} ({demand_mu:.1f} MU/day) exceeds combined regional supply "
                        f"limit ({supply_limit:.1f} MU/day: 365-day max generation {gen_proxy:.1f} MU + 95th percentile "
                        f"import {p95_import:.1f} MU) by {deficit:.1f} MU/day."
                    ),
                    "evidence": {
                        "demand_mu": round(demand_mu, 2),
                        "capability_proxy_365d_max_gen_mu": gen_proxy,
                        "p95_import_gap_mu": p95_import,
                        "supply_limit_mu": supply_limit,
                        "deficit_mu": deficit,
                    },
                    "is_heuristic": True,
                    "caveat": self.caveat,
                })
            elif demand_mu > (0.95 * supply_limit):
                alerts.append({
                    "indicator_type": "supply_stress",
                    "region": region,
                    "severity": "watch",
                    "title": f"Approaching Regional Supply Limit ({region})",
                    "message": (
                        f"Scenario demand for {region} ({demand_mu:.1f} MU/day) is within 5% of regional supply "
                        f"limit ({supply_limit:.1f} MU/day)."
                    ),
                    "evidence": {
                        "demand_mu": round(demand_mu, 2),
                        "supply_limit_mu": supply_limit,
                        "utilization_pct": round(demand_mu / supply_limit * 100, 1),
                    },
                    "is_heuristic": True,
                    "caveat": self.caveat,
                })

        # -------------------------------------------------------------
        # 3. Historical Shortage Frequency Indicator
        # -------------------------------------------------------------
        tiers = r_meta.get("shortage_tiers", [])
        matched_tier = None
        for t in reversed(tiers):
            if demand_mu >= t["cutoff_mu"]:
                matched_tier = t
                break

        if matched_tier is not None:
            n_samples = matched_tier["sample_size_days"]
            short_days = matched_tier["shortage_days"]
            freq_pct = matched_tier["frequency_pct"]
            tier_pct = int(matched_tier["tier_fraction"] * 100)
            cutoff = matched_tier["cutoff_mu"]

            if matched_tier["is_sufficient_sample"]:  # N >= 30
                if freq_pct >= 20.0:
                    sev = "critical"
                    title = f"High Historical Shortage Frequency (Tier >= {tier_pct}%)"
                elif freq_pct >= 5.0:
                    sev = "watch"
                    title = f"Elevated Historical Shortage Frequency (Tier >= {tier_pct}%)"
                else:
                    sev = "info"
                    title = f"Low Historical Shortage Frequency (Tier >= {tier_pct}%)"

                alerts.append({
                    "indicator_type": "historical_shortage",
                    "region": region,
                    "severity": sev,
                    "title": title,
                    "message": (
                        f"In recent history (2018–2026), when {region} demand was >= {cutoff:.1f} MU/day "
                        f"({tier_pct}% of peak), material shortages occurred on {short_days} of {n_samples} days "
                        f"({freq_pct:.1f}% frequency)."
                    ),
                    "evidence": {
                        "demand_mu": round(demand_mu, 2),
                        "cutoff_mu": cutoff,
                        "tier_pct": tier_pct,
                        "sample_size_days": n_samples,
                        "shortage_days": short_days,
                        "shortage_frequency_pct": freq_pct,
                        "materiality_threshold_mu": 1.0,
                    },
                    "is_heuristic": True,
                    "caveat": self.caveat,
                })
            else:
                # Sample size < 30 days: rule explicitly requires suppressing the frequency percentage
                alerts.append({
                    "indicator_type": "historical_shortage",
                    "region": region,
                    "severity": "info",
                    "title": f"Insufficient Historical Sample Size (Tier >= {tier_pct}%)",
                    "message": (
                        f"Only {n_samples} historical days observed at this extreme demand level (>= {cutoff:.1f} MU/day). "
                        f"Frequency metric is suppressed because sample size is under 30 days."
                    ),
                    "evidence": {
                        "demand_mu": round(demand_mu, 2),
                        "cutoff_mu": cutoff,
                        "tier_pct": tier_pct,
                        "sample_size_days": n_samples,
                        "frequency_suppressed": True,
                        "min_required_samples": 30,
                    },
                    "is_heuristic": True,
                    "caveat": self.caveat,
                })

        # -------------------------------------------------------------
        # 4. Low-Demand Indicator
        # -------------------------------------------------------------
        m_p05 = m_stats.get("p05", 0.0)
        if demand_mu < m_p05 and demand_mu > 0.0:
            deficit = round(m_p05 - demand_mu, 2)
            alerts.append({
                "indicator_type": "low_demand",
                "region": region,
                "severity": "info",
                "title": f"Unusually Low Demand (< P05 for Month {month})",
                "message": (
                    f"Scenario demand for {region} ({demand_mu:.1f} MU/day) is below the 5th percentile for "
                    f"month {month} ({m_p05:.1f} MU/day) by {deficit:.1f} MU/day. Thermal generation "
                    f"backing-down or renewable curtailment risk."
                ),
                "evidence": {
                    "demand_mu": round(demand_mu, 2),
                    "month_p05_mu": m_p05,
                    "deficit_mu": deficit,
                    "month": month,
                },
                "is_heuristic": True,
                "caveat": self.caveat,
            })

        # Sort: critical first, then watch, then info
        severity_order = {"critical": 0, "watch": 1, "info": 2}
        alerts.sort(key=lambda a: severity_order.get(a["severity"], 3))
        return alerts

    def evaluate_scenario(
        self,
        scenario_demand: Dict[str, float],
        month: int,
    ) -> List[Dict[str, Any]]:
        """
        Evaluate stress indicators for all 5 RLDCs and National from a full hierarchy dictionary.
        Keys in scenario_demand can be 'India', 'India/NR', 'NR', etc.
        """
        all_alerts = []

        # Standardize node names to regions
        target_regions = ["NR", "WR", "SR", "ER", "NER", "India"]
        for r in target_regions:
            val = None
            if r in scenario_demand:
                val = scenario_demand[r]
            elif f"India/{r}" in scenario_demand:
                val = scenario_demand[f"India/{r}"]

            if val is not None:
                r_alerts = self.evaluate_region(r, float(val), month=month)
                all_alerts.extend(r_alerts)

        severity_order = {"critical": 0, "watch": 1, "info": 2}
        all_alerts.sort(key=lambda a: severity_order.get(a["severity"], 3))
        return all_alerts

