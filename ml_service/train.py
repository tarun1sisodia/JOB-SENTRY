"""Train, select, and evaluate JobSentry's job-fraud classifiers."""

import json
import re
import sys
from collections import Counter
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    average_precision_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import GroupKFold, StratifiedKFold, train_test_split

from preprocess import (
    build_metadata,
    clean_text,
    join_text_columns,
    make_sparse_features,
    scale_metadata,
)


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "DataSet.csv"
REPORTS_DIR = BASE_DIR / "reports"
MODELS_DIR = BASE_DIR / "models"
RECALL_FLOOR = 0.80
RANDOM_STATE = 42


def find_label_column(columns):
    """Find a supported label column without relying on column order."""
    by_lower_name = {str(column).strip().lower(): column for column in columns}
    for candidate in ("fraudulent", "label", "is_fake"):
        if candidate in by_lower_name:
            return by_lower_name[candidate]
    raise ValueError(
        "No label column found. Expected one of: fraudulent, label, is_fake."
    )


def convert_labels(values):
    """Convert supported fraud labels to 1 (fake) and 0 (real)."""
    label_map = {
        "t": 1,
        "true": 1,
        "1": 1,
        "1.0": 1,
        "fake": 1,
        "fraud": 1,
        "fraudulent": 1,
        "f": 0,
        "false": 0,
        "0": 0,
        "0.0": 0,
        "real": 0,
        "legitimate": 0,
    }
    normalized = values.astype("string").str.strip().str.lower()
    converted = normalized.map(label_map)
    if converted.isna().any():
        unknown = sorted(normalized[converted.isna()].dropna().unique().tolist())
        raise ValueError(f"Unrecognized values in label column: {unknown}")
    return converted.astype("int8")


def build_feature_sets(text, metadata, fit_indices, other_indices):
    """Fit text and numeric transforms on the fit rows, then transform the rest."""
    vectorizer = TfidfVectorizer(max_features=20000, ngram_range=(1, 2))
    fit_text = vectorizer.fit_transform(text.iloc[fit_indices])
    other_text = vectorizer.transform(text.iloc[other_indices])
    fit_metadata, other_metadata, scaler = scale_metadata(
        metadata.iloc[fit_indices], metadata.iloc[other_indices]
    )
    fit_all = make_sparse_features(fit_text, fit_metadata)
    other_all = make_sparse_features(other_text, other_metadata)
    return fit_text, other_text, fit_all, other_all, vectorizer, scaler


def make_estimator(model_kind, class_weight):
    """Create one configured model with enough iterations for convergence."""
    if model_kind == "random_forest":
        return RandomForestClassifier(
            n_estimators=100,
            class_weight=class_weight,
            random_state=RANDOM_STATE,
            n_jobs=-1,
        )
    return LogisticRegression(
        class_weight=class_weight,
        max_iter=3000,
        random_state=RANDOM_STATE,
    )


def get_model_configs():
    """List the required ablations and comparison models."""
    return [
        {
            "name": "a_no_smote_no_class_weight",
            "description": "LR: no SMOTE, no class weight",
            "model_kind": "logistic",
            "use_metadata": True,
            "use_smote": False,
            "class_weight": None,
        },
        {
            "name": "b_class_weight_only",
            "description": "LR: class weight only",
            "model_kind": "logistic",
            "use_metadata": True,
            "use_smote": False,
            "class_weight": "balanced",
        },
        {
            "name": "c_smote_only",
            "description": "LR: SMOTE only",
            "model_kind": "logistic",
            "use_metadata": True,
            "use_smote": True,
            "class_weight": None,
        },
        {
            "name": "d_smote_and_class_weight",
            "description": "LR: SMOTE + class weight",
            "model_kind": "logistic",
            "use_metadata": True,
            "use_smote": True,
            "class_weight": "balanced",
        },
        {
            "name": "text_only_lr",
            "description": "Text-only LR: class weight, no SMOTE",
            "model_kind": "logistic",
            "use_metadata": False,
            "use_smote": False,
            "class_weight": "balanced",
        },
        {
            "name": "text_plus_metadata_lr",
            "description": "Text + metadata LR: class weight, no SMOTE",
            "model_kind": "logistic",
            "use_metadata": True,
            "use_smote": False,
            "class_weight": "balanced",
        },
        {
            "name": "random_forest",
            "description": "Random Forest: class weight, no SMOTE",
            "model_kind": "random_forest",
            "use_metadata": True,
            "use_smote": False,
            "class_weight": "balanced",
        },
    ]


def balance_training_data(features, labels, use_smote):
    """Apply SMOTE only when requested, and only to a training matrix."""
    if not use_smote:
        return features, labels
    minority_count = int(labels.value_counts().min())
    if minority_count < 2:
        raise ValueError("SMOTE needs at least two examples of each training class.")
    sampler = SMOTE(
        random_state=RANDOM_STATE,
        k_neighbors=min(5, minority_count - 1),
    )
    return sampler.fit_resample(features, labels)


def scores_for(estimator, features):
    """Return positive-class probabilities for threshold selection."""
    if hasattr(estimator, "predict_proba"):
        return estimator.predict_proba(features)[:, 1]
    decision_scores = estimator.decision_function(features)
    return 1 / (1 + np.exp(-np.clip(decision_scores, -50, 50)))


def metrics_at_threshold(labels, scores, threshold):
    """Calculate classification metrics at one probability threshold."""
    predictions = (scores >= threshold).astype("int8")
    return {
        "precision": precision_score(labels, predictions, zero_division=0),
        "recall": recall_score(labels, predictions, zero_division=0),
        "f1": f1_score(labels, predictions, zero_division=0),
        "balanced_accuracy": balanced_accuracy_score(labels, predictions),
        "roc_auc": roc_auc_score(labels, scores),
        "pr_auc": average_precision_score(labels, scores),
    }


def choose_threshold(labels, scores, recall_floor=None):
    """Find the F1-best validation threshold, optionally requiring recall."""
    candidates = np.unique(np.concatenate(([0.0, 0.5, 1.0], scores)))
    sorted_order = np.argsort(scores)
    sorted_labels = np.asarray(labels, dtype=np.int8)[sorted_order]
    cumulative_positives = np.concatenate(([0], np.cumsum(sorted_labels)))
    positions = np.searchsorted(np.sort(scores), candidates, side="left")
    true_positives = cumulative_positives[-1] - cumulative_positives[positions]
    predicted_positives = len(scores) - positions
    precision = np.divide(
        true_positives,
        predicted_positives,
        out=np.zeros_like(candidates, dtype=float),
        where=predicted_positives > 0,
    )
    recall = true_positives / cumulative_positives[-1]
    f1 = np.divide(
        2 * precision * recall,
        precision + recall,
        out=np.zeros_like(candidates, dtype=float),
        where=(precision + recall) > 0,
    )
    eligible = (
        np.ones(len(candidates), dtype=bool)
        if recall_floor is None
        else recall >= recall_floor
    )
    if not eligible.any():
        raise ValueError(
            f"No validation threshold reaches the required recall of {recall_floor:.2f}."
        )
    eligible_indices = np.flatnonzero(eligible)
    best_index = max(
        eligible_indices,
        key=lambda index: (f1[index], precision[index], candidates[index]),
    )
    threshold = float(candidates[best_index])
    return threshold, metrics_at_threshold(labels, scores, threshold)


def report_metrics_for_scores(split, config, labels, scores, tuned_threshold):
    """Add default and tuned-threshold rows to the ablation results."""
    rows = []
    for threshold_name, threshold in (
        ("default_0.5", 0.5),
        ("validation_tuned", tuned_threshold),
    ):
        row = {
            "split": split,
            "config": config["name"],
            "description": config["description"],
            "threshold_name": threshold_name,
            "threshold": threshold,
        }
        row.update(metrics_at_threshold(labels, scores, threshold))
        rows.append(row)
    return rows


def save_confusion_plot(labels, scores, threshold, title, output_path):
    """Save a confusion matrix plot for the chosen test-set threshold."""
    predictions = (scores >= threshold).astype("int8")
    display = ConfusionMatrixDisplay(
        confusion_matrix=confusion_matrix(labels, predictions, labels=[0, 1]),
        display_labels=["Real", "Fake"],
    )
    display.plot(cmap="Blues", values_format="d")
    plt.title(title)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()


def get_company_groups(frame):
    """Give each missing company profile its own group for grouped CV."""
    if "company_profile" not in frame:
        profiles = pd.Series("", index=frame.index, dtype="string")
    else:
        profiles = frame["company_profile"].astype("string")
    groups = []
    for row_index, profile in profiles.items():
        if pd.isna(profile) or not str(profile).strip():
            groups.append(f"__missing_company_profile_{row_index}")
        else:
            groups.append(str(profile))
    return np.asarray(groups, dtype=object)


def cross_validate_config(
    config, text, metadata, labels, groups, splitter, split_name
):
    """Score one chosen setup using fresh train-only transforms in each fold."""
    fold_results = []
    for fold_number, (fit_positions, held_positions) in enumerate(
        splitter.split(np.zeros(len(labels)), labels, groups), start=1
    ):
        # Fit each fold's vocabulary and scaler only on that fold's training rows.
        fit_text, held_text, fit_all, held_all, _, _ = build_feature_sets(
            text, metadata, fit_positions, held_positions
        )
        fit_features = fit_all if config["use_metadata"] else fit_text
        held_features = held_all if config["use_metadata"] else held_text
        fit_labels = labels.iloc[fit_positions]
        held_labels = labels.iloc[held_positions]

        # Keep synthetic samples inside the fold's training portion.
        balanced_features, balanced_labels = balance_training_data(
            fit_features, fit_labels, config["use_smote"]
        )
        estimator = make_estimator(config["model_kind"], config["class_weight"])
        estimator.fit(balanced_features, balanced_labels)
        fold_scores = scores_for(estimator, held_features)

        # Use the threshold already chosen on validation for both CV checks.
        predictions = (fold_scores >= config["threshold"]).astype("int8")
        fold_results.append(
            {
                "fold": fold_number,
                "precision": precision_score(
                    held_labels, predictions, zero_division=0
                ),
                "recall": recall_score(held_labels, predictions, zero_division=0),
                "f1": f1_score(held_labels, predictions, zero_division=0),
            }
        )
        print(f"  {split_name} fold {fold_number}/5 complete")

    results = pd.DataFrame(fold_results)
    return {
        "cv_type": split_name,
        "precision_mean": results["precision"].mean(),
        "precision_std": results["precision"].std(ddof=1),
        "recall_mean": results["recall"].mean(),
        "recall_std": results["recall"].std(ddof=1),
        "f1_mean": results["f1"].mean(),
        "f1_std": results["f1"].std(ddof=1),
    }


def save_explainability_words(
    estimator, vectorizer, full_text, company_profile_text, output_dir
):
    """Save fraud-positive LR terms and mark terms common in company profiles."""
    if not hasattr(estimator, "coef_"):
        return
    terms = vectorizer.get_feature_names_out()
    coefficients = estimator.coef_[0][: len(terms)]
    top_indices = np.argsort(coefficients)[-20:][::-1]

    # Count a term once per document so repeated words do not inflate its share.
    analyzer = vectorizer.build_analyzer()
    total_document_counts = Counter()
    company_document_counts = Counter()
    for document in full_text:
        total_document_counts.update(set(analyzer(document)))
    for document in company_profile_text:
        company_document_counts.update(set(analyzer(document)))

    top_words = pd.DataFrame(
        {
            "word": terms[top_indices],
            "coefficient": coefficients[top_indices],
        }
    )
    top_words["is_company_token"] = top_words["word"].map(
        lambda word: (
            company_document_counts[word] / total_document_counts[word] > 0.5
            if total_document_counts[word]
            else False
        )
    )
    top_words.to_csv(output_dir / "top_fraud_words.csv", index=False)
    top_words.loc[~top_words["is_company_token"]].to_csv(
        output_dir / "user_safe_fraud_words.csv", index=False
    )


def main():
    """Prepare data, select on validation, and evaluate the test set at the end."""
    if not DATA_PATH.is_file():
        raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # Read the data and show basic counts before any preprocessing.
    data = pd.read_csv(DATA_PATH)
    print(f"Dataset shape: {data.shape}")
    print(f"Columns: {data.columns.tolist()}")
    print(f"Null counts:\n{data.isnull().sum().to_string()}")
    label_column = find_label_column(data.columns)
    labels = convert_labels(data[label_column])
    print("Class balance (0 = real, 1 = fake):")
    print(labels.value_counts(normalize=True).sort_index().rename("fraction").to_string())

    # Remove the balancing marker and duplicate title-description pairs first.
    data = data.drop(columns=["in_balanced_dataset"], errors="ignore")
    before_deduplication = len(data)
    dedupe_columns = [column for column in ("title", "description") if column in data]
    if dedupe_columns:
        keep = ~data.duplicated(subset=dedupe_columns, keep="first")
        data = data.loc[keep].copy()
        labels = labels.loc[keep].copy()
    print(f"Rows before duplicate removal: {before_deduplication}")
    print(f"Rows after duplicate removal: {len(data)}")

    # Clean text and build the numeric features used by the models.
    text = join_text_columns(data)
    metadata = build_metadata(data, text)

    # Keep the original stratified 80/20 split fixed for the final test set.
    train_indices, test_indices = train_test_split(
        np.arange(len(data)),
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=labels,
    )
    train_labels_all = labels.iloc[train_indices].reset_index(drop=True)
    test_labels = labels.iloc[test_indices].reset_index(drop=True)
    train_text_all = text.iloc[train_indices].reset_index(drop=True)
    test_text = text.iloc[test_indices].reset_index(drop=True)
    train_metadata_all = metadata.iloc[train_indices].reset_index(drop=True)
    test_metadata = metadata.iloc[test_indices].reset_index(drop=True)
    train_frame = data.iloc[train_indices].reset_index(drop=True)
    company_profile_train = (
        train_frame["company_profile"].fillna("").astype(str).map(clean_text)
        if "company_profile" in train_frame
        else pd.Series("", index=train_frame.index)
    )

    # Hold out a stratified part of training for all model and threshold choices.
    fit_positions, validation_positions = train_test_split(
        np.arange(len(train_labels_all)),
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=train_labels_all,
    )
    fit_positions = np.asarray(fit_positions)
    validation_positions = np.asarray(validation_positions)
    fit_labels = train_labels_all.iloc[fit_positions]
    validation_labels = train_labels_all.iloc[validation_positions]

    # Learn vocabulary and numeric scaling only from the training portion.
    (
        fit_text_features,
        validation_text_features,
        fit_all_features,
        validation_all_features,
        validation_vectorizer,
        _,
    ) = build_feature_sets(
        train_text_all,
        train_metadata_all,
        fit_positions,
        validation_positions,
    )

    # Fit each required ablation and tune its threshold using validation only.
    configs = get_model_configs()
    validation_results = []
    validation_models = {}
    for config in configs:
        print(f"\nValidation training: {config['description']}")
        train_features = (
            fit_all_features if config["use_metadata"] else fit_text_features
        )
        validation_features = (
            validation_all_features
            if config["use_metadata"]
            else validation_text_features
        )
        balanced_features, balanced_labels = balance_training_data(
            train_features, fit_labels, config["use_smote"]
        )
        estimator = make_estimator(config["model_kind"], config["class_weight"])
        estimator.fit(balanced_features, balanced_labels)
        validation_scores = scores_for(estimator, validation_features)
        constrained_threshold, constrained_metrics = choose_threshold(
            validation_labels, validation_scores, RECALL_FLOOR
        )
        unconstrained_threshold, unconstrained_metrics = choose_threshold(
            validation_labels, validation_scores
        )
        config["threshold"] = constrained_threshold
        validation_models[config["name"]] = estimator

        # Save both threshold choices with the validation results for comparison.
        for threshold_name, threshold, metrics in (
            (
                "default_0.5",
                0.5,
                metrics_at_threshold(validation_labels, validation_scores, 0.5),
            ),
            ("recall_at_least_0.80", constrained_threshold, constrained_metrics),
            ("max_f1_unconstrained", unconstrained_threshold, unconstrained_metrics),
        ):
            row = {
                "split": "validation",
                "config": config["name"],
                "description": config["description"],
                "threshold_name": threshold_name,
                "threshold": threshold,
            }
            row.update(metrics)
            validation_results.append(row)

        print(
            f"  recall-constrained threshold={constrained_threshold:.4f}, "
            f"F1={constrained_metrics['f1']:.4f}, "
            f"recall={constrained_metrics['recall']:.4f}; "
            f"unconstrained max-F1 threshold={unconstrained_threshold:.4f}, "
            f"F1={unconstrained_metrics['f1']:.4f}"
        )

    # Select by validation F1 among thresholds that meet the required recall.
    selection_rows = [
        row
        for row in validation_results
        if row["threshold_name"] == "recall_at_least_0.80"
    ]
    selected_row = max(selection_rows, key=lambda row: (row["f1"], row["recall"]))
    selected_config = next(
        config for config in configs if config["name"] == selected_row["config"]
    )
    selected_config["threshold"] = float(selected_row["threshold"])
    chosen_threshold, _ = choose_threshold(
        validation_labels,
        scores_for(
            validation_models[selected_config["name"]],
            (
                validation_all_features
                if selected_config["use_metadata"]
                else validation_text_features
            ),
        ),
        RECALL_FLOOR,
    )
    selected_config["threshold"] = chosen_threshold
    unconstrained_threshold, _ = choose_threshold(
        validation_labels,
        scores_for(
            validation_models[selected_config["name"]],
            (
                validation_all_features
                if selected_config["use_metadata"]
                else validation_text_features
            ),
        ),
    )
    print("\nValidation selection table (recall-constrained threshold):")
    selection_table = pd.DataFrame(selection_rows).sort_values(
        ["f1", "recall"], ascending=False
    )
    print(
        selection_table[
            ["config", "threshold", "precision", "recall", "f1", "balanced_accuracy"]
        ].to_string(index=False, float_format=lambda value: f"{value:.4f}")
    )
    print(
        f"\nSelected config: {selected_config['name']} "
        f"({selected_config['description']}). "
        f"It has the highest validation F1 ({selected_row['f1']:.4f}) among "
        f"thresholds with recall >= {RECALL_FLOOR:.2f}."
    )

    # Check the chosen setup with both normal and company-grouped training CV.
    print("\nCross-validation for the selected config (validation threshold fixed):")
    cv_rows = []
    normal_cv = StratifiedKFold(
        n_splits=5, shuffle=True, random_state=RANDOM_STATE
    )
    cv_rows.append(
        cross_validate_config(
            selected_config,
            train_text_all,
            train_metadata_all,
            train_labels_all,
            None,
            normal_cv,
            "StratifiedKFold",
        )
    )
    grouped_cv = GroupKFold(n_splits=5)
    cv_rows.append(
        cross_validate_config(
            selected_config,
            train_text_all,
            train_metadata_all,
            train_labels_all,
            get_company_groups(train_frame),
            grouped_cv,
            "GroupKFold_company_profile",
        )
    )
    grouped_table = pd.DataFrame(cv_rows)
    grouped_table.to_csv(REPORTS_DIR / "grouped_cv.csv", index=False)
    print(grouped_table.to_string(index=False, float_format=lambda value: f"{value:.4f}"))
    normal_f1 = grouped_table.loc[
        grouped_table["cv_type"] == "StratifiedKFold", "f1_mean"
    ].iloc[0]
    grouped_f1 = grouped_table.loc[
        grouped_table["cv_type"] == "GroupKFold_company_profile", "f1_mean"
    ].iloc[0]
    if grouped_f1 < normal_f1 - 0.05:
        print(
            "Note: grouped F1 is noticeably lower than stratified CV, suggesting "
            "performance may depend on repeated company profiles."
        )
    else:
        print("Note: grouped F1 is not noticeably lower than stratified CV.")

    # Refit all candidate setups on the full training split for final reporting.
    (
        final_train_text,
        final_test_text,
        final_train_all,
        final_test_all,
        final_vectorizer,
        final_scaler,
    ) = build_feature_sets(
        train_text_all,
        train_metadata_all,
        np.arange(len(train_labels_all)),
        np.arange(len(train_labels_all)),
    )
    # Transform the outer test rows with the training-fitted text and numeric tools.
    final_test_text = final_vectorizer.transform(test_text)
    scaled_test_metadata = final_scaler.transform(
        np.log1p(test_metadata.to_numpy(dtype=np.float64))
    ).astype(np.float32)
    final_test_all = make_sparse_features(final_test_text, scaled_test_metadata)
    final_train_all_text_only = final_train_text
    final_test_all_text_only = final_test_text

    final_models = {}
    test_results = []
    test_scores_by_config = {}
    for config in configs:
        train_features = (
            final_train_all if config["use_metadata"] else final_train_all_text_only
        )
        test_features = (
            final_test_all if config["use_metadata"] else final_test_all_text_only
        )
        balanced_features, balanced_labels = balance_training_data(
            train_features, train_labels_all, config["use_smote"]
        )
        estimator = make_estimator(config["model_kind"], config["class_weight"])
        estimator.fit(balanced_features, balanced_labels)
        final_models[config["name"]] = estimator
        test_scores = scores_for(estimator, test_features)
        test_scores_by_config[config["name"]] = test_scores
        test_results.extend(
            report_metrics_for_scores(
                "test", config, test_labels, test_scores, config["threshold"]
            )
        )

    # Save the completed validation and final test ablation tables.
    ablation_table = pd.DataFrame(validation_results + test_results)
    ablation_table.to_csv(REPORTS_DIR / "ablation_metrics.csv", index=False)
    print("\nAblation metrics (validation and final test):")
    print(
        ablation_table[
            [
                "split",
                "config",
                "threshold_name",
                "threshold",
                "precision",
                "recall",
                "f1",
                "balanced_accuracy",
                "roc_auc",
                "pr_auc",
            ]
        ].to_string(index=False, float_format=lambda value: f"{value:.4f}")
    )

    # Report the chosen model on test at both default and validation-tuned thresholds.
    chosen_estimator = final_models[selected_config["name"]]
    chosen_test_scores = test_scores_by_config[selected_config["name"]]
    final_metric_rows = []
    for threshold_name, threshold in (
        ("default_0.5", 0.5),
        ("validation_tuned", selected_config["threshold"]),
    ):
        row = {
            "config": selected_config["name"],
            "threshold_name": threshold_name,
            "threshold": threshold,
        }
        row.update(metrics_at_threshold(test_labels, chosen_test_scores, threshold))
        final_metric_rows.append(row)
    final_metrics = pd.DataFrame(final_metric_rows)
    final_metrics.to_csv(REPORTS_DIR / "metrics.csv", index=False)
    print("\nFinal chosen model test metrics:")
    print(final_metrics.to_string(index=False, float_format=lambda value: f"{value:.4f}"))

    # Draw both test confusion matrices only after all choices are locked.
    safe_name = re.sub(r"[^a-z0-9]+", "_", selected_config["name"].lower()).strip("_")
    save_confusion_plot(
        test_labels,
        chosen_test_scores,
        0.5,
        f"{selected_config['name']} - Test at 0.5",
        REPORTS_DIR / f"{safe_name}_confusion_matrix_default.png",
    )
    save_confusion_plot(
        test_labels,
        chosen_test_scores,
        selected_config["threshold"],
        f"{selected_config['name']} - Test at tuned threshold",
        REPORTS_DIR / f"{safe_name}_confusion_matrix_tuned.png",
    )

    # Save the selected model, its transforms, and the validation threshold.
    joblib.dump(chosen_estimator, MODELS_DIR / "model.joblib")
    joblib.dump(final_vectorizer, MODELS_DIR / "vectorizer.joblib")
    joblib.dump(final_scaler, MODELS_DIR / "scaler.joblib")
    with (MODELS_DIR / "threshold.json").open("w", encoding="utf-8") as threshold_file:
        json.dump(
            {
                "selected_config": selected_config["name"],
                "threshold_recall_at_least_0.80": selected_config["threshold"],
                "threshold_max_f1_unconstrained": unconstrained_threshold,
                "recall_floor": RECALL_FLOOR,
            },
            threshold_file,
            indent=2,
        )

    # Export top Logistic Regression terms without using the test documents.
    if hasattr(chosen_estimator, "coef_") and selected_config["use_metadata"]:
        explainability_model = chosen_estimator
    else:
        explanation_features = final_train_all
        explanation_features, explanation_labels = balance_training_data(
            explanation_features, train_labels_all, True
        )
        explainability_model = make_estimator("logistic", "balanced")
        explainability_model.fit(explanation_features, explanation_labels)
    save_explainability_words(
        explainability_model,
        final_vectorizer,
        train_text_all.tolist(),
        company_profile_train.tolist(),
        REPORTS_DIR,
    )
    print(f"\nSaved model, vectorizer, scaler, and threshold under {MODELS_DIR}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Training failed: {error}", file=sys.stderr)
        raise
