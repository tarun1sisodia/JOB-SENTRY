"""Export model reports and deployed-model coefficients for the research dashboard."""

import csv
import json
from pathlib import Path

import joblib


ROOT_DIR = Path(__file__).resolve().parents[1]
REPORTS_DIR = ROOT_DIR / "ml_service" / "reports"
DEPLOYED_DIR = ROOT_DIR / "ml_service" / "models" / "deployed"
OUTPUT_PATH = ROOT_DIR / "public" / "research-metrics.json"


def read_csv(name):
    with (REPORTS_DIR / name).open("r", encoding="utf-8", newline="") as report:
        return list(csv.DictReader(report))


def number(row, field):
    return float(row[field])


def metric_row(row):
    return {
        field: number(row, field)
        for field in (
            "threshold",
            "precision",
            "recall",
            "f1",
            "roc_auc",
            "pr_auc",
        )
    } | {"threshold_name": row["threshold_name"]}


def confusion_from_metrics(row, positive_count, negative_count):
    true_positive = round(number(row, "recall") * positive_count)
    false_negative = positive_count - true_positive
    predicted_positive = round(true_positive / number(row, "precision"))
    false_positive = predicted_positive - true_positive
    true_negative = negative_count - false_positive
    reconstructed_precision = true_positive / predicted_positive
    reconstructed_recall = true_positive / positive_count
    if (
        false_positive < 0
        or true_negative < 0
        or abs(reconstructed_precision - number(row, "precision")) > 1e-8
        or abs(reconstructed_recall - number(row, "recall")) > 1e-8
    ):
        raise ValueError(
            f"Cannot reconstruct integer confusion counts for {row['threshold_name']}."
        )
    return {
        "tn": true_negative,
        "fp": false_positive,
        "fn": false_negative,
        "tp": true_positive,
    }


def load_test_set_counts(deployed_rows):
    confusion_counts = [
        {
            "tn": int(row["tn"]),
            "fp": int(row["fp"]),
            "fn": int(row["fn"]),
            "tp": int(row["tp"]),
        }
        for row in deployed_rows
    ]
    totals = {
        (sum(counts.values()), counts["fn"] + counts["tp"])
        for counts in confusion_counts
    }
    if len(totals) != 1:
        raise ValueError("Deployed report rows disagree on test-set class counts.")
    total_postings, fraudulent = totals.pop()
    return total_postings, fraudulent


def load_deployed_coefficients():
    model = joblib.load(DEPLOYED_DIR / "model.joblib")
    vectorizer = joblib.load(DEPLOYED_DIR / "vectorizer.joblib")
    terms = vectorizer.get_feature_names_out()
    coefficients = model.coef_[0]
    if len(terms) != len(coefficients):
        raise ValueError("Deployed model coefficients do not match vectorizer terms.")

    term_weights = [
        {"feature": str(term), "coefficient": float(coefficient)}
        for term, coefficient in zip(terms, coefficients)
    ]
    positive = sorted(
        (item for item in term_weights if item["coefficient"] > 0),
        key=lambda item: (-item["coefficient"], item["feature"]),
    )[:10]
    negative = sorted(
        (item for item in term_weights if item["coefficient"] < 0),
        key=lambda item: (item["coefficient"], item["feature"]),
    )[:10]
    return {"positive": positive, "negative": negative}


def export_metrics():
    research_rows = read_csv("metrics.csv")
    ablation_rows = read_csv("ablation_metrics.csv")
    grouped_cv_rows = read_csv("grouped_cv.csv")
    deployed_rows = read_csv("deployed_metrics.csv")
    total_postings, fraudulent = load_test_set_counts(deployed_rows)
    legitimate = total_postings - fraudulent

    research_metrics = []
    for row in research_rows:
        if row["threshold_name"] not in ("default_0.5", "validation_tuned"):
            continue
        research_metrics.append(
            {
                **metric_row(row),
                "confusion": confusion_from_metrics(row, fraudulent, legitimate),
            }
        )
    required_research_thresholds = {"default_0.5", "validation_tuned"}
    if {row["threshold_name"] for row in research_metrics} != required_research_thresholds:
        raise ValueError("Research metrics report is missing a required test threshold.")

    deployed_metrics = []
    for row in deployed_rows:
        deployed_metrics.append(
            {
                **metric_row(row),
                "model": row["model"],
                "confusion": {
                    "tn": int(row["tn"]),
                    "fp": int(row["fp"]),
                    "fn": int(row["fn"]),
                    "tp": int(row["tp"]),
                },
            }
        )

    metrics = {
        "testSet": {
            "total_postings": total_postings,
            "fraudulent": fraudulent,
        },
        "researchModel": {
            "config": research_rows[0]["config"],
            "test_metrics": research_metrics,
        },
        "ablation_metrics": [
            {
                "split": row["split"],
                "config": row["config"],
                "description": row["description"],
                "threshold_name": row["threshold_name"],
                **{
                    field: number(row, field)
                    for field in (
                        "threshold",
                        "precision",
                        "recall",
                        "f1",
                        "roc_auc",
                        "pr_auc",
                    )
                },
            }
            for row in ablation_rows
        ],
        "grouped_cv": [
            {
                "cv_type": row["cv_type"],
                **{
                    field: number(row, field)
                    for field in (
                        "precision_mean",
                        "precision_std",
                        "recall_mean",
                        "recall_std",
                        "f1_mean",
                        "f1_std",
                    )
                },
            }
            for row in grouped_cv_rows
        ],
        "deployed_metrics": deployed_metrics,
        "deployed_coefficients": load_deployed_coefficients(),
    }

    OUTPUT_PATH.write_text(
        json.dumps(metrics, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Exported report metrics to {OUTPUT_PATH}")


if __name__ == "__main__":
    export_metrics()
