"""
MLflow Experiment Tracking & Training Pipeline for Weak-Topic Prediction Model.
Evaluates multiple model architectures, logs metrics, generates visualization artifacts,
and registers the production model artifact.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
    confusion_matrix, roc_curve, classification_report
)

import mlflow
import mlflow.sklearn

def plot_confusion_matrix(y_true, y_pred, output_path: str, title: str = "Confusion Matrix"):
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', cbar=False,
                xticklabels=['Mastered / OK', 'Needs Remediation'],
                yticklabels=['Mastered / OK', 'Needs Remediation'])
    plt.title(title, fontsize=12, fontweight='bold')
    plt.xlabel('Predicted Label')
    plt.ylabel('True Label')
    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()

def plot_roc_curve(y_true, y_prob, output_path: str, model_name: str, auc_score: float):
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, color='#6366f1', lw=2, label=f'{model_name} (AUC = {auc_score:.4f})')
    plt.plot([0, 1], [0, 1], color='gray', linestyle='--')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('ROC Curve - Weak Topic Classifier', fontsize=12, fontweight='bold')
    plt.legend(loc="lower right")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()

def train_and_track_experiments():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, "data", "ml_data")
    artifacts_dir = os.path.join(base_dir, "data", "models")
    os.makedirs(artifacts_dir, exist_ok=True)
    
    train_path = os.path.join(data_dir, "student_interactions_train.csv")
    test_path = os.path.join(data_dir, "student_interactions_test.csv")
    
    if not os.path.exists(train_path):
        print("Dataset not found. Running data generator first...")
        from generate_student_data import main as gen_data
        gen_data()
        
    train_df = pd.read_csv(train_path)
    test_df = pd.read_csv(test_path)
    
    numeric_features = [
        "question_difficulty",
        "prior_attempts_count",
        "historical_accuracy",
        "consecutive_errors",
        "days_since_last_review",
        "response_time_sec",
        "handwritten_score",
        "is_correct"
    ]
    categorical_features = ["topic"]
    
    X_train = train_df[numeric_features + categorical_features]
    y_train = train_df["needs_remediation"]
    X_test = test_df[numeric_features + categorical_features]
    y_test = test_df["needs_remediation"]
    
    # MLflow setup with SQLite tracking database
    os.environ["MLFLOW_ALLOW_FILE_STORE"] = "true"
    db_path = os.path.join(base_dir, "data", "mlflow.db").replace('\\', '/')
    mlflow.set_tracking_uri(f"sqlite:///{db_path}")
    experiment_name = "AI_Tutor_Weak_Topic_Knowledge_Tracing"
    mlflow.set_experiment(experiment_name)
    
    models = {
        "Logistic_Regression": LogisticRegression(max_iter=1000, C=1.0, random_state=42),
        "Random_Forest": RandomForestClassifier(n_estimators=120, max_depth=8, min_samples_split=5, random_state=42),
        "Hist_Gradient_Boosting": HistGradientBoostingClassifier(max_iter=150, learning_rate=0.08, max_depth=6, random_state=42)
    }
    
    best_f1 = -1.0
    best_model_bundle = None
    best_model_name = ""
    summary_results = []
    
    for model_name, clf in models.items():
        print(f"\n--- Training & Tracking: {model_name} ---")
        
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", StandardScaler(), numeric_features),
                ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features)
            ]
        )
        
        pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("classifier", clf)
        ])
        
        with mlflow.start_run(run_name=model_name):
            # Fit
            pipeline.fit(X_train, y_train)
            
            # Predict
            y_pred = pipeline.predict(X_test)
            y_prob = pipeline.predict_proba(X_test)[:, 1] if hasattr(pipeline, "predict_proba") else y_pred
            
            # Metrics
            acc = float(accuracy_score(y_test, y_pred))
            prec = float(precision_score(y_test, y_pred, zero_division=0))
            rec = float(recall_score(y_test, y_pred, zero_division=0))
            f1 = float(f1_score(y_test, y_pred, zero_division=0))
            auc = float(roc_auc_score(y_test, y_prob))
            
            # Log params & metrics
            mlflow.log_param("model_type", type(clf).__name__)
            if hasattr(clf, "get_params"):
                for k, v in clf.get_params().items():
                    if isinstance(v, (int, float, str, bool)):
                        mlflow.log_param(k, v)
                        
            mlflow.log_metric("accuracy", acc)
            mlflow.log_metric("precision", prec)
            mlflow.log_metric("recall", rec)
            mlflow.log_metric("f1_score", f1)
            mlflow.log_metric("roc_auc", auc)
            
            # Artifacts: Confusion matrix & ROC Curve
            cm_path = os.path.join(artifacts_dir, f"{model_name}_confusion_matrix.png")
            roc_path = os.path.join(artifacts_dir, f"{model_name}_roc_curve.png")
            
            plot_confusion_matrix(y_test, y_pred, cm_path, title=f"Confusion Matrix: {model_name}")
            plot_roc_curve(y_test, y_prob, roc_path, model_name=model_name, auc_score=auc)
            
            mlflow.log_artifact(cm_path)
            mlflow.log_artifact(roc_path)
            
            # Log Sklearn Model to MLflow
            mlflow.sklearn.log_model(pipeline, artifact_path="model")
            
            print(f"[{model_name}] Accuracy: {acc:.4f} | F1: {f1:.4f} | ROC-AUC: {auc:.4f}")
            
            summary_results.append({
                "model_name": model_name,
                "accuracy": acc,
                "precision": prec,
                "recall": rec,
                "f1_score": f1,
                "roc_auc": auc
            })
            
            if f1 > best_f1:
                best_f1 = f1
                best_model_bundle = pipeline
                best_model_name = model_name
                
    # Save the best model for live application usage
    prod_model_path = os.path.join(artifacts_dir, "production_weak_topic_model.joblib")
    joblib.dump(best_model_bundle, prod_model_path)
    
    metadata = {
        "best_model_name": best_model_name,
        "best_f1_score": best_f1,
        "features": {
            "numeric": numeric_features,
            "categorical": categorical_features
        },
        "all_results": summary_results
    }
    
    meta_path = os.path.join(artifacts_dir, "model_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"\n=======================================================")
    print(f"Production Model Selected: {best_model_name} (F1 = {best_f1:.4f})")
    print(f"Saved to: {prod_model_path}")
    print(f"Metadata saved to: {meta_path}")
    print(f"=======================================================")

if __name__ == "__main__":
    train_and_track_experiments()
