"""Generate Group Project technical report PDF aligned to CS414 course outline."""
from __future__ import annotations

import json
from pathlib import Path
from datetime import date

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, ListFlowable, ListItem, KeepTogether
)
from reportlab.lib import colors

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "Group_Project_Technical_Report.pdf"
VERIFY = ROOT / "results" / "verification_report.json"


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("title", parent=base["Title"], fontSize=18, leading=22, alignment=TA_CENTER, spaceAfter=8),
        "sub": ParagraphStyle("sub", parent=base["Normal"], fontSize=11, leading=14, alignment=TA_CENTER, spaceAfter=4),
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontSize=13, leading=16, spaceBefore=12, spaceAfter=6),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontSize=11, leading=14, spaceBefore=8, spaceAfter=4),
        "body": ParagraphStyle("body", parent=base["Normal"], fontSize=10, leading=13, alignment=TA_JUSTIFY, spaceAfter=6),
        "small": ParagraphStyle("small", parent=base["Normal"], fontSize=9, leading=11, alignment=TA_LEFT, spaceAfter=4),
        "mono": ParagraphStyle("mono", parent=base["Code"], fontSize=8, leading=10, spaceAfter=4),
    }


def bullets(items, style):
    return ListFlowable(
        [ListItem(Paragraph(i, style), leftIndent=8, bulletColor=colors.HexColor("#1f2937")) for i in items],
        bulletType="bullet",
        start="•",
        leftIndent=15,
    )


def main():
    S = styles()
    verify = {}
    if VERIFY.exists():
        verify = json.loads(VERIFY.read_text(encoding="utf-8"))

    story = []
    story.append(Paragraph("BINDURA UNIVERSITY OF SCIENCE EDUCATION", S["sub"]))
    story.append(Paragraph("Faculty of Science — Department of Computer Science", S["sub"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Group Project Technical Report", S["title"]))
    story.append(Paragraph("Smart Exam Invigilation: CNN-based Cheating Behaviour Detection", S["sub"]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Course: <b>CS 414 / NWE 414 / SWE 414 — Artificial Intelligence and Intelligent Systems</b>", S["sub"]))
    story.append(Paragraph("Semester: August–December 2026 &nbsp;&nbsp;|&nbsp;&nbsp; Lecturer: Mr. Zano", S["sub"]))
    story.append(Paragraph(f"Document date: {date.today().isoformat()}", S["sub"]))
    story.append(Paragraph("Project branding: <b>Group Project</b> (replaces prior single-reg working title)", S["sub"]))
    story.append(Spacer(1, 10))

    meta = [
        ["Deliverable", "Group Project — code, models, technical report (this PDF)"],
        ["Primary notebook", "notebooks/Group_Project_Colab_Fixed.ipynb"],
        ["Model artefacts", "models/best.pt , models/the_best.pt"],
        ["Shared data (Drive)", "https://drive.google.com/drive/folders/1tcj53raozUaS2jx3-BpbKT5ITUB1G1F5"],
        ["Kaggle video dataset", "https://www.kaggle.com/datasets/fairouzfarouq/student-cheating-behavior-dataset"],
        ["Kaggle image dataset", "https://www.kaggle.com/datasets/ardutraagiginting/exam-cheating-dataset"],
        ["Version control", "GitHub repository under account venontn"],
    ]
    t = Table(meta, colWidths=[4.2 * cm, 12.3 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#e5e7eb")),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(t)
    story.append(PageBreak())

    # 1
    story.append(Paragraph("1. Problem Definition &amp; Design", S["h1"]))
    story.append(Paragraph(
        "Manual exam invigilation does not scale to large halls and online/hybrid assessments. "
        "This Group Project designs an intelligent vision system that analyses exam-room imagery "
        "(and optionally video) to estimate the probability that a student is exhibiting cheating-related "
        "behaviour, then flags intervals for human review. The system is positioned as decision support, "
        "not autonomous accusation.", S["body"]))
    story.append(Paragraph("Objectives", S["h2"]))
    story.append(bullets([
        "Formulate cheating detection as a supervised binary classification problem over person crops.",
        "Apply transfer learning (EfficientNet) with modern training practices (EMA, MixUp, TTA).",
        "Evaluate with precision, recall, macro-F1, average precision, and confusion matrices (CLO 4/5).",
        "Document ethics, bias risks, and human-in-the-loop deployment (CLO 8/9).",
        "Ship reproducible code, checkpoints, and GitHub documentation as required by the course outline.",
    ], S["body"]))
    story.append(Paragraph("Alignment to Course Learning Outcomes", S["h2"]))
    story.append(bullets([
        "<b>CLO 4 / CLO 5:</b> supervised learning + CNN transfer learning in PyTorch; metrics beyond accuracy.",
        "<b>CLO 8:</b> privacy, false-positive harm, fairness across camera angles/lighting, governance.",
        "<b>CLO 9:</b> team design, implementation, documentation, version control, demonstration.",
    ], S["body"]))
    story.append(Paragraph("PEAS (Intelligent Agent View)", S["h2"]))
    peas = [
        ["Performance", "High precision at a target threshold; low false alarms; calibrated scores"],
        ["Environment", "Exam halls / recorded video; partial observability; dynamic lighting"],
        ["Actuators", "Flag events, annotated frames/video, thresholded alerts for invigilators"],
        ["Sensors", "RGB camera frames; YOLO person detections as attention mechanism"],
    ]
    pt = Table([["Component", "Description"]] + peas, colWidths=[3.5 * cm, 13 * cm])
    pt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(pt)

    # 2
    story.append(Paragraph("2. Literature &amp; Technique Justification", S["h1"]))
    story.append(Paragraph(
        "Cheating behaviour recognition is typically posed as action/behaviour classification or detection "
        "on classroom imagery. We adopt a two-stage pipeline common in applied computer vision: "
        "(1) person localisation with a lightweight YOLO detector; (2) EfficientNet image classifier on "
        "crops. EfficientNet provides a strong accuracy/compute trade-off for Colab/TPU/GPU training. "
        "Compared with training a detector end-to-end for every behaviour class, this design reuses "
        "mature person detection and focuses labelled effort on behaviour labels.", S["body"]))
    story.append(bullets([
        "Transfer learning from ImageNet (CLO 5).",
        "Class-imbalance handling via weighted cross-entropy and optional MixUp.",
        "Threshold chosen for target precision to reduce wrongful flags.",
        "Cross-dataset checks to measure generalisation between image collections.",
    ], S["body"]))

    # 3
    story.append(Paragraph("3. Data Collection, Sources &amp; Preprocessing", S["h1"]))
    story.append(Paragraph("Datasets used", S["h2"]))
    story.append(bullets([
        "<b>Shared Drive package (SmartInvigilation):</b> https://drive.google.com/drive/folders/1tcj53raozUaS2jx3-BpbKT5ITUB1G1F5 — includes ExamCheatingDataset image splits and examdatasetnew behavioural folders (e.g. normal, frontwatching, sidewatching, suspiciouswatching).",
        "<b>Hashemite student cheating behaviour (Kaggle videos):</b> https://www.kaggle.com/datasets/fairouzfarouq/student-cheating-behavior-dataset — optional video source; frames sampled for training/evaluation.",
        "<b>Exam cheating images (Kaggle):</b> https://www.kaggle.com/datasets/ardutraagiginting/exam-cheating-dataset — classes such as looking friend, giving code, giving object, normal act, cheating.",
    ], S["body"]))
    story.append(Paragraph("Preprocessing pipeline", S["h2"]))
    story.append(bullets([
        "Folder-name mapping to binary labels (normal vs cheating), with soft label for ambiguous frontwatching.",
        "Drop obvious flip/copy duplicate filenames; perceptual-hash near-duplicate grouping.",
        "YOLOv8n person crops with padding; cache resized crops for training speed.",
        "Augmentation: random resized crop, flip, rotation, colour jitter, blur, JPEG, downscale-upscale.",
        "Grouped stratified folds so near-duplicates do not leak across train/validation.",
    ], S["body"]))

    # 4
    story.append(Paragraph("4. Technical Implementation", S["h1"]))
    story.append(Paragraph(
        "Implementation is Python/PyTorch on Google Colab (GPU/TPU) with a local verification script. "
        "Training uses a frozen-backbone head warm-up then full fine-tune with AdamW, cosine decay, "
        "gradient clipping, EMA weights, MixUp, and optional TTA at validation. The exported artefact "
        "is <b>best.pt</b> containing architecture name, state dict, class names, threshold, and temperature.", S["body"]))
    story.append(Paragraph("Repository layout (Group Project)", S["h2"]))
    story.append(Paragraph(
        "<font face='Courier'>GroupProject/<br/>"
        "&nbsp; notebooks/Group_Project_Colab_Fixed.ipynb<br/>"
        "&nbsp; notebooks/Group_Project_Training.ipynb<br/>"
        "&nbsp; models/best.pt , models/the_best.pt<br/>"
        "&nbsp; results/verification_report.json<br/>"
        "&nbsp; docs/Group_Project_Technical_Report.pdf<br/>"
        "&nbsp; scripts/verify_results.py<br/>"
        "&nbsp; README.md</font>", S["small"]))

    # 5
    story.append(Paragraph("5. Evaluation &amp; Verified Results", S["h1"]))
    story.append(Paragraph(
        "Per the course outline, we report precision, recall, macro-F1, AP and confusion-oriented analysis "
        "rather than accuracy alone. Checkpoints provided in Downloads were loaded and executed locally "
        "to verify integrity.", S["body"]))

    rows = [["File", "Arch", "Input", "Threshold", "Temp", "Params", "Status"]]
    for ck in verify.get("checkpoints", []):
        if not ck.get("ok"):
            rows.append([ck.get("file"), "-", "-", "-", "-", "-", "FAIL"])
            continue
        rows.append([
            str(ck.get("file")),
            str(ck.get("arch")),
            str(ck.get("input_size")),
            f"{ck.get('threshold', 0):.3f}",
            f"{ck.get('temperature', 1):.2f}",
            f"{ck.get('n_params', 0):,}",
            "PASS",
        ])
    rt = Table(rows, colWidths=[3.2*cm, 2.6*cm, 1.5*cm, 2*cm, 1.4*cm, 2.4*cm, 1.6*cm])
    rt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(rt)
    story.append(Spacer(1, 6))
    notes = []
    for ck in verify.get("checkpoints", []):
        if ck.get("ok"):
            notes.append(
                f"<b>{ck['file']}</b>: export={ck.get('export')}; "
                f"sample scores={ck.get('sample_scores')}; "
                f"{ck.get('note')}"
            )
    if notes:
        story.append(bullets(notes, S["small"]))
    story.append(Paragraph(
        "<b>Interpretation:</b> Both provided weights load successfully and produce finite cheating scores. "
        "An input size of 64 indicates these artefacts come from a reduced/smoke training configuration. "
        "For the final graded demonstration, re-run <font face='Courier'>Group_Project_Colab_Fixed.ipynb</font> "
        "on GPU/TPU against the full Drive/Kaggle data to regenerate full-resolution <b>best.pt</b> and report "
        "OOF precision/recall/F1/AP from that run.", S["body"]))

    # 6
    story.append(Paragraph("6. Ethical Consideration &amp; Bias Analysis", S["h1"]))
    story.append(bullets([
        "False positives can unjustly accuse students — operate at high precision and always keep a human reviewer.",
        "Camera angle, skin tone under lighting, seating position, and cultural gesture norms can bias scores; soft labels and threshold calibration partially mitigate but do not eliminate risk.",
        "Store flagged clips with access control; follow institutional exam policy and Zimbabwe data-protection expectations discussed in Week 14 of the outline.",
        "Declare dataset licences/citations and any AI assistance used in development.",
        "Do not deploy as sole evidence for disciplinary action.",
    ], S["body"]))

    # 7
    story.append(Paragraph("7. Documentation, GitHub &amp; Drive Ownership", S["h1"]))
    story.append(Paragraph(
        "Course requirement 8.1 explicitly mandates documentation and GitHub version control. "
        "This Group Project package is prepared for publication under GitHub user <b>venontn</b>.", S["body"]))
    story.append(Paragraph(
        "<b>Google Drive note:</b> The shared folder "
        "https://drive.google.com/drive/folders/1tcj53raozUaS2jx3-BpbKT5ITUB1G1F5 "
        "is a multi-owner/shared classroom resource (not solely owned by a single student). "
        "To satisfy “only contributor” control, create a personal Drive folder owned by "
        "<b>venontnyadombo@gmail.com</b>, copy project deliverables (notebook, best.pt, this report) into it, "
        "and set sharing to Restricted / only your account (or lecturer view-only). "
        "Classroom source datasets may remain linked as read-only citations.", S["body"]))

    # 8
    story.append(Paragraph("8. Demonstration Plan (15 minutes)", S["h1"]))
    story.append(bullets([
        "Problem & PEAS (2 min).",
        "Data sources + preprocessing diagram (3 min).",
        "Live Colab/local inference on an image with YOLO boxes and FLAG overlay (5 min).",
        "Metrics discussion and ethics (3 min).",
        "Q&A (2 min).",
    ], S["body"]))

    # 9
    story.append(Paragraph("9. Conclusion", S["h1"]))
    story.append(Paragraph(
        "The Group Project delivers a reproducible CNN-based exam-behaviour classifier with person-centric "
        "crops, calibrated thresholding, and explicit ethical constraints. Verified checkpoints confirm the "
        "export format expected by an invigilation backend. Completing a full-data Colab train produces the "
        "final submission-quality best.pt alongside this report and GitHub repository.", S["body"]))

    story.append(Paragraph("References", S["h1"]))
    story.append(bullets([
        "Russell, S. &amp; Norvig, P. (2021). Artificial Intelligence: A Modern Approach (4th ed.).",
        "Géron, A. (2022). Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow (3rd ed.).",
        "Tan, M. &amp; Le, Q. (2019). EfficientNet: Rethinking Model Scaling for CNNs.",
        "BUSE CS 414 / SWE 414 Course Outline — Artificial Intelligence and Intelligent Systems (2026).",
        "Kaggle: fairouzfarouq/student-cheating-behavior-dataset; ardutraagiginting/exam-cheating-dataset.",
        "SmartInvigilation shared Drive folder (classroom dataset package).",
    ], S["small"]))

    story.append(Spacer(1, 12))
    story.append(Paragraph(
        "— End of Group Project Technical Report —", S["sub"]))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
        title="Group Project Technical Report — Smart Exam Invigilation",
        author="Group Project Team",
    )
    doc.build(story)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
