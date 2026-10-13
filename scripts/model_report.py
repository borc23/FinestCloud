"""
Summarize a YOLO checkpoint's training run for the model card (docs/MODEL.md).

    uv run python scripts/model_report.py /tmp/models/v3.pt

Prints the training setup and final validation metrics as Markdown and writes
the per-epoch curves to docs/images/training_curves.png. Everything comes from
metadata Ultralytics stores inside the .pt file, so no dataset is needed.
"""

import argparse
from pathlib import Path

import matplotlib  # installed with ultralytics

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import torch

SETUP_KEYS = [
    "model",
    "task",
    "epochs",
    "patience",
    "imgsz",
    "batch",
    "optimizer",
    "lr0",
]
AUGMENT_KEYS = [
    "mosaic",
    "fliplr",
    "flipud",
    "degrees",
    "scale",
    "hsv_h",
    "hsv_s",
    "hsv_v",
]


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument(
        "--plot", type=Path, default=Path("docs/images/training_curves.png")
    )
    args = parser.parse_args()

    # Our own checkpoint (the app loads it the same way via YOLO())
    ckpt = torch.load(args.checkpoint, map_location="cpu", weights_only=False)
    train_args, metrics, history = (
        ckpt["train_args"],
        ckpt["train_metrics"],
        ckpt["train_results"],
    )
    model = ckpt["ema"] or ckpt["model"]

    print(f"## {args.checkpoint.name}\n")
    print(f"- Trained: {ckpt['date'][:10]} with Ultralytics {ckpt['version']}")
    print(f"- Classes: {model.names}")
    print(f"- Parameters: {sum(p.numel() for p in model.parameters()) / 1e6:.1f} M")
    print(f"- Training time: {history['time'][-1] / 3600:.1f} h\n")

    print("| Setting | Value |\n|---|---|")
    for key in SETUP_KEYS + AUGMENT_KEYS:
        if key in train_args:
            print(f"| {key} | {train_args[key]} |")

    print("\n| Validation metric | Box | Mask |\n|---|---:|---:|")
    for name in ["precision", "recall", "mAP50", "mAP50-95"]:
        box, mask = metrics[f"metrics/{name}(B)"], metrics[f"metrics/{name}(M)"]
        print(f"| {name} | {box:.3f} | {mask:.3f} |")

    epochs = history["epoch"]
    fig, (loss_ax, map_ax) = plt.subplots(
        1, 2, figsize=(11, 4), constrained_layout=True
    )
    for split, style in (("train", "-"), ("val", "--")):
        loss_ax.plot(
            epochs,
            history[f"{split}/seg_loss"],
            style,
            color="#2a6fdb",
            label=f"{split} seg loss",
        )
        loss_ax.plot(
            epochs,
            history[f"{split}/box_loss"],
            style,
            color="#e8853b",
            label=f"{split} box loss",
        )
    loss_ax.set(title="Loss", xlabel="epoch")
    loss_ax.legend(frameon=False)

    map_ax.plot(
        epochs, history["metrics/mAP50(M)"], color="#2a6fdb", label="mask mAP50"
    )
    map_ax.plot(
        epochs, history["metrics/mAP50-95(M)"], color="#1f9e6e", label="mask mAP50-95"
    )
    map_ax.plot(
        epochs,
        history["metrics/mAP50-95(B)"],
        ":",
        color="#e8853b",
        label="box mAP50-95",
    )
    map_ax.set(title="Validation mAP", xlabel="epoch", ylim=(0.5, 1.0))
    map_ax.legend(frameon=False, loc="lower right")
    for ax in (loss_ax, map_ax):
        ax.grid(alpha=0.25)
        ax.spines[["top", "right"]].set_visible(False)

    args.plot.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(args.plot, dpi=150)
    print(f"\nCurves written to {args.plot}")


if __name__ == "__main__":
    main()
