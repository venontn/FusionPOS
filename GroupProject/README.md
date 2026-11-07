# Group Project — Smart Exam Invigilation

**Course:** CS 414 / NWE 414 / SWE 414 — Artificial Intelligence and Intelligent Systems (BUSE, 2026)  
**Branding:** Group Project (not a single registration-number submission name)

CNN-based cheating-behaviour detection for exam halls: YOLO person crops → EfficientNet classifier → calibrated threshold flags for human review.

## Datasets

- Shared Drive package: https://drive.google.com/drive/folders/1tcj53raozUaS2jx3-BpbKT5ITUB1G1F5
- Kaggle (videos): https://www.kaggle.com/datasets/fairouzfarouq/student-cheating-behavior-dataset
- Kaggle (images): https://www.kaggle.com/datasets/ardutraagiginting/exam-cheating-dataset

## Contents

| Path | Description |
|------|-------------|
| `notebooks/Group_Project_Colab_Fixed.ipynb` | Recommended Colab trainer (auto-finds Drive / Kaggle) |
| `notebooks/Group_Project_Training.ipynb` | Training notebook package |
| `models/best.pt` | Exported classifier checkpoint |
| `models/the_best.pt` | Alternate/export copy of checkpoint |
| `docs/Group_Project_Technical_Report.pdf` | Technical report aligned to course outline |
| `results/verification_report.json` | Local load/inference verification |
| `scripts/verify_results.py` | Re-run verification |

## Quick verify

```bash
pip install torch torchvision pillow numpy
python scripts/verify_results.py
```

## Train (Colab)

1. Runtime → GPU (or TPU)
2. Open `notebooks/Group_Project_Colab_Fixed.ipynb`
3. Add a Drive shortcut of the shared SmartInvigilation folder into My Drive
4. Runtime → Run all
5. Collect `best.pt` from `MyDrive/SmartInvigilation_runs/...`

## Ethics

Human-in-the-loop only. High-precision thresholds. Not sole disciplinary evidence.

## Drive ownership

The classroom Drive folder is shared. Keep **your** submission copies in a personal Drive folder owned by your Google account with Restricted sharing.
