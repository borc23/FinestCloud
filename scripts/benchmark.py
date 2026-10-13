"""
Benchmark panel layout and roof detection; prints Markdown tables.

    uv run python scripts/benchmark.py                 # everything
    uv run python scripts/benchmark.py --only layout   # skip the model
    uv run python scripts/benchmark.py --model path/to/v3.pt

Layout goes through PanelService's public API only, so the same script also
measures older implementations, e.g. the genetic algorithm replaced in 02049bd:

    git worktree add /tmp/finestcloud-ga e1b4d85
    PYTHONPATH=/tmp/finestcloud-ga/src uv run --with rtree \\
        python scripts/benchmark.py --only layout
"""

import argparse
import math
import os
import platform
import statistics
import time

import numpy as np

# Detection reads Settings, which requires these; no external API is called
for key in ("GOOGLE_MAPS_API_KEY", "NREL_API_KEY", "BACKEND_API_TOKEN"):
    os.environ.setdefault(key, "benchmark")

CENTER = (46.05, 14.5)  # lat, lng
PANEL = {"width": 1.134, "height": 1.722, "power": 430, "efficiency": 22.0}


def _rect(w, h, angle_deg=0.0, dx=0.0, dy=0.0):
    """Rectangle corners in meters, rotated about its center then shifted."""
    a = math.radians(angle_deg)
    rot = np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]])
    corners = np.array(
        [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]
    )
    return corners @ rot.T + (dx, dy)


# (name, roof outline in meters, obstacles in meters, pitch in degrees)
ROOFS = [
    ("Gable roof plane, 10 x 5 m", _rect(10, 5), [], 35),
    ("Rotated plane, 12 x 6 m at 30°", _rect(12, 6, 30), [], 30),
    (
        "L-shaped flat roof, 15 x 10 m",
        np.array([(0, 0), (15, 0), (15, 4.5), (6, 4.5), (6, 10), (0, 10)]) - (7.5, 5),
        [],
        0,
    ),
    (
        "Commercial flat roof, 40 x 25 m, 6 obstacles",
        _rect(40, 25),
        [_rect(2, 2, dx=x, dy=y) for x in (-12, 0, 12) for y in (-6, 6)],
        0,
    ),
]


def _to_gps(points_m):
    """Meters east/north of CENTER to {lat, lng} (equirectangular, fine at roof scale)."""
    lat0, lng0 = CENTER
    m_per_deg_lat = 111_320
    m_per_deg_lng = 111_320 * math.cos(math.radians(lat0))
    return [
        {"lat": lat0 + y / m_per_deg_lat, "lng": lng0 + x / m_per_deg_lng}
        for x, y in points_m
    ]


def bench_layout(runs):
    from finestcloud.services.panel_service import PanelService

    bounds = {
        "north": CENTER[0] + 0.001,
        "south": CENTER[0] - 0.001,
        "east": CENTER[1] + 0.0015,
        "west": CENTER[1] - 0.0015,
    }
    rows = []
    for name, roof, obstacles, pitch in ROOFS:
        times, counts = [], []
        for _ in range(runs):
            service = PanelService(
                bounds=bounds,
                edge_padding_cm=30,
                spacing_cm=2,
                panel_orientation="best",
                panel_specs=PANEL,
            )
            start = time.perf_counter()
            result = service.generate_panels(
                roofs=[{"coords": _to_gps(roof), "pitch": pitch, "azimuth": 180}],
                objects=[{"coords": _to_gps(o)} for o in obstacles],
            )
            times.append((time.perf_counter() - start) * 1000)
            counts.append(result["max_panels"])
        spread = f"{min(counts)}-{max(counts)}" if min(counts) != max(counts) else ""
        rows.append(
            (
                name,
                f"{statistics.median(counts):g}" + (f" ({spread})" if spread else ""),
                f"{statistics.median(times):.0f}",
                f"{max(times):.0f}",
            )
        )

    print(f"\n### Panel layout ({runs} runs per roof)\n")
    print("| Roof | Panels placed | Median ms | Max ms |")
    print("|---|---:|---:|---:|")
    for row in rows:
        print("| " + " | ".join(row) + " |")


def bench_detection(model_path, runs):
    # Part of every cold start, before the model can even load
    start = time.perf_counter()
    import torch

    from finestcloud.services.detection_service import DetectionService

    import_s = time.perf_counter() - start

    start = time.perf_counter()
    service = DetectionService(model_path)
    load_s = time.perf_counter() - start

    image = np.random.default_rng(0).integers(0, 255, (640, 640, 3), dtype=np.uint8)
    bounds = {"north": 1.0, "south": 0.0, "east": 1.0, "west": 0.0}
    service.detect_roofs(image, bounds)  # warm-up: first call initializes the predictor

    times = []
    for _ in range(runs):
        start = time.perf_counter()
        service.detect_roofs(image, bounds)
        times.append((time.perf_counter() - start) * 1000)
    times.sort()

    print(
        f"\n### Roof detection, 640 x 640 input ({runs} runs, CPU, "
        f"torch {torch.__version__} on {torch.get_num_threads()} threads)\n"
    )
    print("| Step | Time |")
    print("|---|---:|")
    print(f"| Import torch + ultralytics (once per process) | {import_s:.1f} s |")
    print(f"| Model load (once per process) | {load_s:.1f} s |")
    print(
        f"| Inference + polygon post-processing, median | {statistics.median(times):.0f} ms |"
    )
    print(
        f"| Inference + polygon post-processing, p95 | {times[int(0.95 * (len(times) - 1))]:.0f} ms |"
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--only", choices=["layout", "detection"])
    parser.add_argument("--model", default="/tmp/models/v3.pt", help="YOLO weights")
    parser.add_argument("--runs", type=int, default=20)
    args = parser.parse_args()

    print(
        f"_{platform.machine()}, {os.cpu_count()} logical CPUs, "
        f"Python {platform.python_version()}_"
    )
    if args.only in (None, "layout"):
        bench_layout(args.runs)
    if args.only in (None, "detection"):
        bench_detection(args.model, args.runs)


if __name__ == "__main__":
    main()
