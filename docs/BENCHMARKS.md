# Benchmarks

Measured with [`scripts/benchmark.py`](../scripts/benchmark.py) on a laptop: Intel Core i7-10610U (4 cores / 8 threads, 2019), WSL2, Python 3.10, torch 2.8.0 CPU build. Production runs on a smaller shared CPU, so treat these as relative numbers.

```bash
uv run python scripts/benchmark.py --runs 50
```

## Panel layout: grid search vs. the genetic algorithm it replaced

Panel placement started as a genetic algorithm (581 lines: population, crossover, mutation, convergence tuning). Commit `02049bd` replaced it with a deterministic search in 96 lines ([`panel_layout.py`](../src/finestcloud/services/panel_layout.py)):

1. Rotate the roof so its longest edge lies on the x-axis. Shrink it by the edge padding, and correct the panel's depth for roof pitch (a panel on a 35° slope covers cos 35° of its length seen from above).
2. A regular grid repeats every `panel + spacing`, so every distinct layout is one (x, y) offset within a single period. Try all of them at 5 cm steps, for both panel orientations.
3. For each offset, build every candidate panel as a Shapely box in one vectorized call. Keep those inside the roof (prepared geometry) and not touching an obstacle (STRtree query). Keep the offset that fits the most.

Same roofs, same panel (1.134 × 1.722 m, 430 W), 2 cm spacing, 30 cm edge padding, both orientations allowed:

| Roof | Genetic algorithm<br/>panels (range) | Grid search<br/>panels | GA median | Grid median | Speed-up |
|---|---:|---:|---:|---:|---:|
| Gable roof plane, 10 × 5 m, 35° | 24 | 24 | 391 ms | 17 ms | **23×** |
| Rotated plane, 12 × 6 m at 30° | 30 | 30 | 557 ms | 79 ms | **7×** |
| L-shaped flat roof, 15 × 10 m | 36 | **39** | 1,025 ms | 155 ms | **7×** |
| Commercial flat roof, 40 × 25 m, 6 obstacles | 428 (414–436) | 426 | 13,377 ms | 788 ms | **17×** |

GA: 10 runs per roof. Grid search: 50 runs per roof.

What changed besides speed:

- **Deterministic:** the same roof always gets the same layout. The GA's count on the commercial roof varied by 22 panels between runs, which reads as a bug to a user who clicks "generate" twice.
- **Panel count:** equal on two roofs and 3 more panels (+8%) on the L-shaped one, where all 10 GA runs stopped at 36. On the large roof the GA's median is 2 panels higher, within its own run-to-run spread. Its best run found 436 (+2%), so there's a little headroom left on large flat roofs.
- **Simpler:** 581 lines with six tuning knobs became 96 lines with one (the offset step).

To reproduce the GA column, check out the commit before the switch and point the same script at it (the GA needed `rtree`, since removed):

```bash
git worktree add /tmp/finestcloud-ga e1b4d85
PYTHONPATH=/tmp/finestcloud-ga/src uv run --with rtree \
    python scripts/benchmark.py --only layout --runs 10
```

## Roof detection

One 640 × 640 tile, YOLOv8s-seg on CPU (see the [model card](MODEL.md)):

| Step | Time |
|---|---:|
| Import torch + ultralytics (once per process) | 1.7 s |
| Load weights (once per process) | 0.1 s |
| Inference + polygon post-processing, median | 0.45–0.6 s |
| Inference + polygon post-processing, p95 | ~1.1 s |

The median moved between 450 and 600 ms across runs on a busy laptop. A full `/api/detect` request also downloads the Static Maps tile (typically 0.2–0.5 s).

Process start-up is under 2 s, so on free hosting a cold start is dominated by the platform booting the container. That is what the warm-up ping on page load (`useBackendWarmup`) and the optional `keep-warm` workflow address.
