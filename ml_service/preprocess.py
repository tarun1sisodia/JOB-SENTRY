"""Shared text and metadata preprocessing for training and prediction."""

import re
from typing import Any

import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix, hstack
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
from sklearn.preprocessing import StandardScaler


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


def clean_text(value: Any) -> str:
    """Lowercase text, remove markup and noise, and drop English stopwords."""
    text = re.sub(r"<[^>]*>", " ", str(value).lower())
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    words = (word for word in text.split() if word not in ENGLISH_STOP_WORDS)
    return " ".join(words)


def join_text_columns(frame: pd.DataFrame) -> pd.Series:
    """Join the available job-posting text fields into one clean string."""
    available_columns = [column for column in TEXT_COLUMNS if column in frame.columns]
    if not available_columns:
        raise ValueError(
            "No job text columns found. Expected at least one of: "
            + ", ".join(TEXT_COLUMNS)
        )
    filled = frame[available_columns].fillna("").astype(str)
    return filled.agg(" ".join, axis=1).map(clean_text)


def has_value(values: pd.Series) -> pd.Series:
    """Return one when a source field contains a non-empty value."""
    return values.notna() & values.astype("string").str.strip().ne("")


def build_metadata(frame: pd.DataFrame, cleaned_text: pd.Series) -> pd.DataFrame:
    """Build the same numeric job-posting features used by the trainer."""
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
            values = frame[column].astype("string").str.strip().str.lower()
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
            converted = values.map(value_map)
            invalid = values.notna() & converted.isna()
            if invalid.any():
                unknown = sorted(values[invalid].unique().tolist())
                raise ValueError(f"Unrecognized values in {column}: {unknown}")
            features[column] = converted.fillna(0).astype("float32")

    return features.astype("float32")


def scale_metadata(
    train_metadata: pd.DataFrame,
    other_metadata: pd.DataFrame,
    scaler: StandardScaler | None = None,
) -> tuple[np.ndarray, np.ndarray, StandardScaler]:
    """Log and scale numeric columns, fitting the scaler on training rows only."""
    train_values = np.log1p(train_metadata.to_numpy(dtype=np.float64))
    other_values = np.log1p(other_metadata.to_numpy(dtype=np.float64))
    fitted_scaler = scaler or StandardScaler()
    if scaler is None:
        scaled_train = fitted_scaler.fit_transform(train_values)
    else:
        scaled_train = fitted_scaler.transform(train_values)
    scaled_other = fitted_scaler.transform(other_values)
    return (
        scaled_train.astype(np.float32),
        scaled_other.astype(np.float32),
        fitted_scaler,
    )


def make_sparse_features(
    text_features: Any, metadata_features: np.ndarray | None = None
) -> Any:
    """Append scaled metadata values to a sparse TF-IDF matrix."""
    if metadata_features is None or metadata_features.shape[1] == 0:
        return text_features.tocsr()
    return hstack(
        [text_features, csr_matrix(metadata_features, dtype=np.float32)],
        format="csr",
    )


def create_prediction_frame(
    job_text: str,
    salary: str | None = None,
) -> pd.DataFrame:
    """Make the dataset-shaped row used to build prediction features."""
    return pd.DataFrame(
        [
            {
                "title": "",
                "company_profile": "",
                "description": job_text,
                "requirements": "",
                "benefits": "",
                "salary_range": salary or "",
                "department": "",
                "telecommuting": 0,
                "has_company_logo": 0,
                "has_questions": 0,
            }
        ]
    )


def transform_prediction_features(
    frame: pd.DataFrame,
    vectorizer: Any,
    scaler: StandardScaler,
) -> Any:
    """Build the model's training-matched sparse text and metadata features."""
    cleaned_text = join_text_columns(frame)
    text_features = vectorizer.transform(cleaned_text)
    metadata = build_metadata(frame, cleaned_text)
    scaled_metadata, _, _ = scale_metadata(metadata, metadata, scaler=scaler)
    return make_sparse_features(text_features, scaled_metadata)


def transform_text_features(job_text: str, vectorizer: Any) -> Any:
    """Transform a posting into TF-IDF features without adding metadata."""
    return vectorizer.transform([clean_text(job_text)])
