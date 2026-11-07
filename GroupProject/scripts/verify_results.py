"""Verify Group Project checkpoints load and produce scores."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torchvision import models
import torchvision.transforms.functional as TF

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "models"
OUT = ROOT / "results"
OUT.mkdir(parents=True, exist_ok=True)


def build(arch: str, n: int):
    if arch == "efficientnet_b3":
        m = models.efficientnet_b3(weights=None)
        m.classifier[1] = nn.Linear(m.classifier[1].in_features, n)
    else:
        m = models.efficientnet_b0(weights=None)
        m.classifier[1] = nn.Linear(m.classifier[1].in_features, n)
    return m


def apply_temperature(p, t):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    z = np.log(p / (1 - p))
    return float(1 / (1 + np.exp(-z / t)))


def verify_ckpt(path: Path) -> dict:
    ck = torch.load(path, map_location="cpu", weights_only=False)
    assert isinstance(ck, dict), "checkpoint must be a dict"
    required = ["model_state_dict", "arch", "class_names", "cheating_classes", "threshold"]
    for k in required:
        assert k in ck, f"missing key {k}"
    sd = ck["model_state_dict"]
    n = [v for k, v in sd.items() if k.endswith("weight") and getattr(v, "ndim", 0) == 2][-1].shape[0]
    model = build(ck.get("arch", "efficientnet_b0"), n)
    model.load_state_dict(sd)
    model.eval()
    size = int(ck.get("input_size", 224))
    mean = ck.get("mean", [0.485, 0.456, 0.406])
    std = ck.get("std", [0.229, 0.224, 0.225])
    cheat_idx = [ck["class_names"].index(c) for c in ck["cheating_classes"]]
    thr = float(ck["threshold"])
    temp = float(ck.get("temperature", 1.0))

    rng = np.random.default_rng(0)
    scores = []
    for _ in range(8):
        img = (rng.random((size, size, 3)) * 255).astype(np.uint8)
        x = TF.normalize(
            TF.resize(torch.from_numpy(img).permute(2, 0, 1).float() / 255, [size, size], antialias=True),
            mean,
            std,
        )
        with torch.no_grad():
            p = torch.softmax(model(x.unsqueeze(0)), 1)[0, cheat_idx].sum().item()
        scores.append(apply_temperature(p, temp))

    return {
        "file": path.name,
        "ok": True,
        "arch": ck.get("arch"),
        "author_field": ck.get("author"),
        "input_size": size,
        "threshold": thr,
        "temperature": temp,
        "export": ck.get("export"),
        "class_names": ck.get("class_names"),
        "n_params": int(sum(v.numel() for v in sd.values() if hasattr(v, "numel"))),
        "sample_scores": [round(s, 4) for s in scores],
        "flags_at_threshold": int(sum(s >= thr for s in scores)),
        "note": (
            "Smoke/Colab checkpoint verified loadable. "
            "input_size=64 indicates a smoke or reduced run; full dataset training uses 224/288."
            if size <= 64
            else "Full-resolution checkpoint verified."
        ),
    }


def main():
    results = []
    for p in sorted(MODELS.glob("*.pt")):
        try:
            results.append(verify_ckpt(p))
            print("PASS", p.name)
        except Exception as e:
            results.append({"file": p.name, "ok": False, "error": str(e)})
            print("FAIL", p.name, e)
    summary = {
        "project": "Group Project — Smart Exam Invigilation / Cheating Behaviour Detection",
        "course": "CS 414 / NWE 414 / SWE 414 — Artificial Intelligence and Intelligent Systems",
        "datasets": [
            "https://www.kaggle.com/datasets/fairouzfarouq/student-cheating-behavior-dataset",
            "https://drive.google.com/drive/folders/1tcj53raozUaS2jx3-BpbKT5ITUB1G1F5",
            "https://www.kaggle.com/datasets/ardutraagiginting/exam-cheating-dataset",
        ],
        "checkpoints": results,
        "all_ok": all(r.get("ok") for r in results) and len(results) > 0,
    }
    out = OUT / "verification_report.json"
    out.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print("wrote", out)
    print("ALL_OK" if summary["all_ok"] else "HAS_FAILURES")
    return 0 if summary["all_ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
