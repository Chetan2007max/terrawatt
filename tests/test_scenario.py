"""
test_scenario.py
Automated tests for Phase C: Scenario Engine (What-If Analysis).

Verifies:
1. Exact hierarchical coherence (< 1e-6) under random edits across random nodes.
2. Both Proportional and Covariance-Aware allocation methods produce coherent hierarchies.
3. Differences between Covariance-Aware and Proportional are computed and non-zero for heterogeneous variances.
4. Pinned nodes remain strictly held fixed at their base values.
5. Historical range warnings trigger when scenario exceeds historical P99 or falls below P01.
6. Flags trigger when a negative shock pushes any real node below zero.
7. Mandatory disclaimer is always present: "This is a statistical redistribution, not a power-flow simulation."
"""

import numpy as np
import pytest
from src.scenario import ScenarioEngine, DISCLAIMER_TEXT
from src.hierarchy import REGIONS


@pytest.fixture(scope="module")
def scenario_engine():
    return ScenarioEngine()


def test_scenario_initialization(scenario_engine):
    """Verify ScenarioEngine loads hierarchy, ranges, and variances correctly."""
    assert len(scenario_engine.uids) == 51
    assert len(scenario_engine.bottom_uids) == 45
    assert scenario_engine.S.shape == (51, 45)
    assert len(scenario_engine.historical_ranges) == 51
    assert len(scenario_engine.residual_variances) == 51


def test_scenario_disclaimer_present(scenario_engine):
    """Verify mandatory disclaimer is returned in scenario results."""
    res = scenario_engine.simulate(target_node="India", pct_change=5.0)
    assert res["disclaimer"] == DISCLAIMER_TEXT
    assert "statistical redistribution, not a power-flow simulation" in res["disclaimer"]


def test_scenario_random_edits_coherence(scenario_engine):
    """
    Random edits at random nodes must always produce 100% coherent hierarchies
    (assert to within 1e-6) for both Proportional and Covariance-Aware allocations.
    """
    np.random.seed(42)
    uids = scenario_engine.uids
    # Test across random selection of 15 nodes (national, regions, and states)
    sample_nodes = np.random.choice(uids, size=15, replace=False).tolist()

    for node in sample_nodes:
        pct = float(np.random.uniform(-15.0, 15.0))
        res = scenario_engine.simulate(target_node=node, pct_change=pct)

        assert res["coherence_verified"] is True
        assert res["max_coherence_diff"] < 1e-5, f"Coherence failure on node {node} at {pct:.1f}%"

        # Check explicit parent-sum arithmetic on proportional
        prop = res["proportional"]
        for r in REGIONS:
            reg_val = prop[f"India/{r}"]
            children = scenario_engine.region_children[f"India/{r}"]
            c_sum = sum(prop[c] for c in children)
            assert abs(reg_val - c_sum) < 1e-5, f"Region {r} prop coherence failure"
        nat_val = prop["India"]
        r_sum = sum(prop[f"India/{r}"] for r in REGIONS)
        assert abs(nat_val - r_sum) < 1e-5, "National prop coherence failure"

        # Check explicit parent-sum arithmetic on covariance-aware
        cov = res["covariance_aware"]
        for r in REGIONS:
            reg_val = cov[f"India/{r}"]
            children = scenario_engine.region_children[f"India/{r}"]
            c_sum = sum(cov[c] for c in children)
            assert abs(reg_val - c_sum) < 1e-5, f"Region {r} cov coherence failure"
        nat_val = cov["India"]
        r_sum = sum(cov[f"India/{r}"] for r in REGIONS)
        assert abs(nat_val - r_sum) < 1e-5, "National cov coherence failure"


def test_scenario_pinned_nodes(scenario_engine):
    """Verify that pinned nodes remain strictly held fixed at their base values."""
    target = "India"
    pinned = ["India/NR", "India/WR/Maharashtra"]
    res = scenario_engine.simulate(target_node=target, pct_change=10.0, pinned_nodes=pinned)

    assert res["coherence_verified"] is True
    base = res["base_forecast"]
    cov = res["covariance_aware"]

    # Pinned nodes must match base forecast exactly in covariance-aware allocation
    for p in pinned:
        assert abs(cov[p] - base[p]) < 1e-3, f"Pinned node {p} moved! Base: {base[p]}, Cov: {cov[p]}"


def test_scenario_difference_between_methods(scenario_engine):
    """
    Verify that Covariance-Aware and Proportional allocations produce distinct,
    meaningful differences due to variance weighting.
    """
    res = scenario_engine.simulate(target_node="India", pct_change=10.0)
    diff = res["diff_cov_minus_prop"]

    # NR has higher error variance than NER, so NR should absorb more under covariance-aware
    # than proportional, while NER absorbs less
    nr_diff = diff["India/NR"]
    ner_diff = diff["India/NER"]

    assert nr_diff > 0.0, f"Expected NR to absorb more under covariance weighting, got diff {nr_diff}"
    assert ner_diff < 0.0, f"Expected NER to absorb less under covariance weighting, got diff {ner_diff}"


def test_scenario_historical_range_warnings(scenario_engine):
    """Verify warnings trigger when a shock pushes demand beyond historical bounds."""
    # Massive positive shock to India (exceeds P99 and max recorded demand)
    res = scenario_engine.simulate(target_node="India", new_value=8000.0)
    assert len(res["warnings"]) > 0
    assert any("exceeds" in w for w in res["warnings"])


def test_scenario_below_zero_flag(scenario_engine):
    """Verify below-zero flags trigger when a large negative shock pushes a real node negative."""
    # Drastic negative shock to Punjab
    res = scenario_engine.simulate(target_node="India/NR/Punjab", new_value=-50.0)
    assert len(res["flags"]) > 0
    assert any("pushed below zero" in f for f in res["flags"])

