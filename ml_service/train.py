"""Train and evaluate JobSentry's job-fraud classifiers."""

import re
import sys
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from scipy.sparse import csr_matrix, hstack
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "DataSet.csv"
REPORTS_DIR = BASE_DIR / "reports"
MODELS_DIR = BASE_DIR / "models"
TEXT_COLUMNS = ("title", "company_profile", "description", "requirements", "benefits")
BOOLEAN_COLUMNS = ("telecommuting", "has_company_logo", "has_questions")
FREE_EMAIL_DOMAINS = {
    "gmail.com",
    "hotmail.com",
    "outlook.com",
    "yahoo.com",
    "aol.com",
    "icloud.com",
    "live.com",
    "mail.com",
}


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


def convert_boolean_column(values, column_name):
    """Convert common true/false strings and numbers to numeric flags."""
    value_map = {
        "t": 1,
        "true": 1,
        "1": 1,
        "1.0": 1,
        "yes": 1,
        "f": 0,
        "false": 0,
        "0": 0,
        "0.0": 0,
        "no": 0,
    }
    normalized = values.astype("string").str.strip().str.lower()
    converted = normalized.map(value_map)
    invalid = normalized.notna() & converted.isna()
    if invalid.any():
        unknown = sorted(normalized[invalid].unique().tolist())
        raise ValueError(f"Unrecognized values in {column_name}: {unknown}")
    return converted.astype("float32")


def clean_text(value):
    """Lowercase text, remove markup and noise, and drop English stopwords."""
    text = re.sub(r"<[^>]*>", " ", str(value).lower())
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    words = (word for word in text.split() if word not in ENGLISH_STOP_WORDS)
    return " ".join(words)


def join_text_columns(frame):
    """Join the available job-posting text fields into one clean string."""
    available_columns = [column for column in TEXT_COLUMNS if column in frame.columns]
    if not available_columns:
        raise ValueError(
            "No job text columns found. Expected at least one of: "
            + ", ".join(TEXT_COLUMNS)
        )
    filled = frame[available_columns].fillna("").astype(str)
    combined = filled.agg(" ".join, axis=1)
    return combined.map(clean_text)


def has_value(values):
    """Return one when a source field contains a non-empty value."""
    return values.notna() & values.astype("string").str.strip().ne("")


def build_metadata(frame, cleaned_text):
    """Build numeric job-posting features without using the target label."""
    features = pd.DataFrame(index=frame.index)
    features["has_company_profile"] = (
        has_value(frame["company_profile"]).astype("int8")
        if "company_profile" in frame
        else 0
    )
    features["has_salary_range"] = (
        has_value(frame["salary_range"]).astype("int8")
        if "salary_range" in frame
        else 0
    )
    features["has_department"] = (
        has_value(frame["department"]).astype("int8")
        if "department" in frame
        else 0
    )
    features["text_length"] = cleaned_text.str.len().astype("float32")

    email_columns = [column for column in frame if "email" in str(column).lower()]
    url_columns = [
        column
        for column in frame
        if any(part in str(column).lower() for part in ("url", "website", "web_site"))
    ]
    email_or_url_flag = pd.Series(False, index=frame.index)
    for column in email_columns:
        domains = (
            frame[column]
            .fillna("")
            .astype(str)
            .str.lower()
            .str.extract(r"@([^>\s,;]+)", expand=False)
        )
        email_or_url_flag |= domains.isin(FREE_EMAIL_DOMAINS)
    for column in url_columns:
        email_or_url_flag |= has_value(frame[column])
    if email_columns or url_columns:
        features["has_free_email_or_url_flag"] = email_or_url_flag.astype("int8")

    for column in BOOLEAN_COLUMNS:
        if column in frame:
            features[column] = convert_boolean_column(frame[column], column).fillna(0)

    return features.astype("float32")


def make_sparse_features(text_features, metadata_features=None):
    """Append metadata columns to a sparse TF-IDF matrix when provided."""
    if metadata_features is None or metadata_features.shape[1] == 0:
        return text_features.tocsr()
    return hstack(
        [text_features, csr_matrix(metadata_features.to_numpy(dtype=np.float32))],
        format="csr",
    )


def evaluate_model(name, estimator, test_features, test_labels, reports_dir):
    """Measure a fitted model and save its test-set confusion matrix plot."""
    predictions = estimator.predict(test_features)
    if hasattr(estimator, "predict_proba"):
        scores = estimator.predict_proba(test_features)[:, 1]
    else:
        scores = estimator.decision_function(test_features)

    matrix = confusion_matrix(test_labels, predictions, labels=[0, 1])
    metrics = {
        "model": name,
        "precision": precision_score(test_labels, predictions, zero_division=0),
        "recall": recall_score(test_labels, predictions, zero_division=0),
        "f1": f1_score(test_labels, predictions, zero_division=0),
        "balanced_accuracy": balanced_accuracy_score(test_labels, predictions),
        "roc_auc": roc_auc_score(test_labels, scores),
    }

    display = ConfusionMatrixDisplay(
        confusion_matrix=matrix, display_labels=["Real", "Fake"]
    )
    display.plot(cmap="Blues", values_format="d")
    plt.title(f"{name} - Test Confusion Matrix")
    plt.tight_layout()
    plot_name = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    plt.savefig(reports_dir / f"{plot_name}_confusion_matrix.png", dpi=150)
    plt.close()
    print(f"\n{name} test confusion matrix:\n{matrix}")
    return metrics


def main():
    """Load data, train models, compare results, and save the best artifacts."""
    if not DATA_PATH.is_file():
        raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # Load the dataset and show its basic health.
    data = pd.read_csv(DATA_PATH)
    print(f"Dataset shape: {data.shape}")
    print(f"Columns: {data.columns.tolist()}")
    print(f"Null counts:\n{data.isnull().sum().to_string()}")

    label_column = find_label_column(data.columns)
    labels = convert_labels(data[label_column])
    print("Class balance (0 = real, 1 = fake):")
    print(labels.value_counts(normalize=True).sort_index().rename("fraction").to_string())

    # Remove the dataset balancing marker and duplicate postings before splitting.
    data = data.drop(columns=["in_balanced_dataset"], errors="ignore")
    rows_before = len(data)
    duplicate_columns = [
        column for column in ("title", "description") if column in data.columns
    ]
    if duplicate_columns:
        keep_rows = ~data.duplicated(subset=duplicate_columns, keep="first")
        data = data.loc[keep_rows].copy()
        labels = labels.loc[keep_rows].copy()
    print(f"Rows before duplicate removal: {rows_before}")
    print(f"Rows after duplicate removal: {len(data)}")

    # Create cleaned text and metadata before splitting, without fitting transforms.
    cleaned_text = join_text_columns(data)
    metadata = build_metadata(data, cleaned_text)

    # Split first so every learned text feature comes only from training data.
    train_indices, test_indices = train_test_split(
        np.arange(len(data)),
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )
    train_labels = labels.iloc[train_indices]
    test_labels = labels.iloc[test_indices]
    vectorizer = TfidfVectorizer(max_features=20000, ngram_range=(1, 2))
    train_text_features = vectorizer.fit_transform(cleaned_text.iloc[train_indices])
    test_text_features = vectorizer.transform(cleaned_text.iloc[test_indices])

    train_metadata = metadata.iloc[train_indices]
    test_metadata = metadata.iloc[test_indices]
    train_all_features = make_sparse_features(train_text_features, train_metadata)
    test_all_features = make_sparse_features(test_text_features, test_metadata)

    # Balance only training data; the test set remains untouched.
    sampler = SMOTE(random_state=42)
    train_text_balanced, train_text_labels = sampler.fit_resample(
        train_text_features, train_labels
    )
    train_all_balanced, train_all_labels = sampler.fit_resample(
        train_all_features, train_labels
    )

    models = [
        (
            "Logistic Regression",
            LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42),
            train_all_balanced,
            train_all_labels,
            test_all_features,
        ),
        (
            "Random Forest",
            RandomForestClassifier(
                n_estimators=100, class_weight="balanced", random_state=42, n_jobs=-1
            ),
            train_all_balanced,
            train_all_labels,
            test_all_features,
        ),
        (
            "Text-only Logistic Regression",
            LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42),
            train_text_balanced,
            train_text_labels,
            test_text_features,
        ),
    ]

    # Fit and score each model on the same untouched test set.
    results = []
    for name, estimator, features, fit_labels, test_features in models:
        print(f"\nTraining {name}...")
        estimator.fit(features, fit_labels)
        metrics = evaluate_model(name, estimator, test_features, test_labels, REPORTS_DIR)
        results.append((metrics, estimator))

    comparison = pd.DataFrame([result[0] for result in results])
    comparison = comparison.sort_values(
        by=["recall", "f1"], ascending=False, kind="stable"
    ).reset_index(drop=True)
    comparison.to_csv(REPORTS_DIR / "metrics.csv", index=False)
    print("\nTest-set model comparison:")
    print(comparison.to_string(index=False, float_format=lambda value: f"{value:.4f}"))

    # Save the top positive text terms from the metadata Logistic Regression model.
    logistic_model = next(
        estimator for metrics, estimator in results
        if metrics["model"] == "Logistic Regression"
    )
    text_coefficients = logistic_model.coef_[0][: len(vectorizer.get_feature_names_out())]
    top_indices = np.argsort(text_coefficients)[-20:][::-1]
    pd.DataFrame(
        {
            "word": vectorizer.get_feature_names_out()[top_indices],
            "coefficient": text_coefficients[top_indices],
        }
    ).to_csv(REPORTS_DIR / "top_fraud_words.csv", index=False)

    # Prefer fraud recall, then F1, when choosing the saved model.
    best_name = comparison.iloc[0]["model"]
    best_estimator = next(
        estimator for metrics, estimator in results if metrics["model"] == best_name
    )
    joblib.dump(best_estimator, MODELS_DIR / "model.joblib")
    joblib.dump(vectorizer, MODELS_DIR / "vectorizer.joblib")
    print(f"\nSaved best model ({best_name}) and TF-IDF vectorizer to {MODELS_DIR}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Training failed: {error}", file=sys.stderr)
        raise
