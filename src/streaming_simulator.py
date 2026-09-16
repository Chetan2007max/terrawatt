"""
streaming_simulator.py
Replays historical daily data at accelerated speed to simulate live
telemetry arriving, POSTing each day to the /ingest endpoint.
See README Section 5.7.

Usage:
    python3 src/streaming_simulator.py --start 2026-08-01 --speed 1
    (speed=1 means 1 simulated day per real second)
"""

import argparse
import time
import requests
import pandas as pd

from src.data_loader import load_raw_data, clean_data
from src.hierarchy import REGION_MEMBERS


def run_simulation(api_url: str, start_date: str, speed_seconds: float, node: str = "India: EnergyMet"):
    df = load_raw_data()
    all_state_cols = [c for cols in REGION_MEMBERS.values() for c in cols]
    df_clean = clean_data(df, all_state_cols)

    node_id = node.replace(": EnergyMet", "")
    sim_data = df_clean[df_clean["date"] >= start_date][["date", node]].dropna()

    print(f"Simulating {len(sim_data)} days of telemetry for '{node_id}', "
          f"starting {start_date}, {speed_seconds}s per simulated day.")

    for _, row in sim_data.iterrows():
        payload = {
            "node_id": node_id,
            "date": row["date"].strftime("%Y-%m-%d"),
            "actual_value": float(row[node]),
        }
        try:
            resp = requests.post(f"{api_url}/ingest", json=payload, timeout=5)
            status = resp.status_code
            body = resp.json()
        except Exception as e:
            status, body = "ERROR", str(e)

        print(f"  [{payload['date']}] ingested actual={payload['actual_value']:.1f} -> {status} {body}")
        time.sleep(speed_seconds)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-url", default="http://127.0.0.1:8000")
    parser.add_argument("--start", default="2026-08-01")
    parser.add_argument("--speed", type=float, default=1.0)
    parser.add_argument("--node", default="India: EnergyMet")
    args = parser.parse_args()

    run_simulation(args.api_url, args.start, args.speed, args.node)
