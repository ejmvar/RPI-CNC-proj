#!/usr/bin/env bash
# Simple dev helper: serve the simulator directory on localhost:8000
set -euo pipefail

cd "$(dirname "$0")/../Simulator/web"
echo "Starting simple HTTP server at http://localhost:8000/front.html"
python3 -m http.server 8000
