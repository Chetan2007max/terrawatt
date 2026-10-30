"""
conftest.py
Global pytest configuration for TerraWatt v2.
Sets environment variables required for macOS Python 3.14 stability:
- OMP_NUM_THREADS=1 (prevents libomp segfault on macOS with LightGBM)
- MPLCONFIGDIR=/tmp/mplconfig (ensures writable matplotlib font cache)
"""

import os

os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MPLCONFIGDIR"] = "/tmp/mplconfig"

