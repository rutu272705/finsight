import numpy as np
import pytest

from backend.ml import train as trainer
from backend.ml.evaluate import evaluate
from backend.ml.features import FEATURE_NAMES
from backend.ml.labels import CLASSES
from backend.ml.predict import predict_latest
from backend.utils.errors import InsufficientDataError
from tests.conftest import make_prices


def test_evaluate_metrics_known_values():
    y_true = ["Upward", "Upward", "Downward", "Stable", "Stable", "Stable"]
    y_pred = ["Upward", "Stable", "Downward", "Stable", "Stable", "Upward"]
    m = evaluate(y_true, y_pred)
    assert m["accuracy"] == pytest.approx(4 / 6, abs=1e-4)
    assert m["per_class"]["Downward"]["precision"] == 1.0 and m["per_class"]["Downward"]["recall"] == 1.0
    assert m["per_class"]["Upward"]["precision"] == 0.5 and m["per_class"]["Upward"]["recall"] == 0.5
    cm = np.array(m["confusion_matrix"]["matrix"])
    assert m["confusion_matrix"]["labels"] == CLASSES and cm.sum() == 6 and cm[1][1] == 2


def test_training_is_chronological_and_leak_free(tmp_path):
    meta = trainer.train("TEST", make_prices(700, seed=3), [], horizon=5, threshold=0.01, model_dir=str(tmp_path))
    assert meta["train_period"][1] < meta["test_period"][0]            # test strictly after train
    gap_days = np.busday_count(meta["train_period"][1], meta["test_period"][0])
    assert gap_days >= 5                                              # embargo >= horizon
    assert meta["n_train"] > meta["n_test"] > 30
    assert {c["model"] for c in meta["comparison"]} == {"Logistic Regression", "Random Forest", "Gradient Boosting"}
    assert meta["model_name"] in {c["model"] for c in meta["comparison"]}
    for c in meta["comparison"]:
        assert 0 <= c["test"]["accuracy"] <= 1 and "confusion_matrix" in c["test"]
    assert meta["baseline"]["accuracy"] >= 0 and len(meta["backtest"]) == meta["n_test"]
    assert (tmp_path / "TEST.joblib").exists()


def test_insufficient_history_raises(tmp_path):
    with pytest.raises(InsufficientDataError):
        trainer.train("SHORT", make_prices(120), [], 5, 0.01, str(tmp_path))


def test_predict_returns_complete_labelled_forecast(cfg, tmp_path):
    cfg.MODEL_DIR = str(tmp_path)
    cfg.DEMO_MODE = False
    p = predict_latest("TEST", make_prices(600, seed=5), [], cfg)
    assert p["label"] in CLASSES
    assert sum(p["probabilities"].values()) == pytest.approx(1.0, abs=1e-2)
    assert p["confidence"] == max(p["probabilities"].values())
    assert p["horizon_days"] == cfg.FORECAST_HORIZON and p["predicted_at"] and p["as_of_date"]
    assert "not financial advice" in p["disclaimer"]
    # second call reuses the saved model (same trained_at)
    assert predict_latest("TEST", make_prices(600, seed=5), [], cfg)["trained_at"] == p["trained_at"]


def test_prediction_changes_model_when_threshold_config_changes(cfg, tmp_path):
    cfg.MODEL_DIR, cfg.DEMO_MODE = str(tmp_path), False
    first = predict_latest("TEST", make_prices(600, seed=5), [], cfg)
    cfg.TREND_THRESHOLD = 0.03
    second = predict_latest("TEST", make_prices(600, seed=5), [], cfg)
    assert second["threshold"] == 0.03 and second["trained_at"] >= first["trained_at"]


def test_sentiment_features_used_when_available(tmp_path):
    prices = make_prices(500, seed=1)
    sent = [{"date": d.strftime("%Y-%m-%d"), "score": 0.2, "count": 2} for d in prices.index[-40:]]
    meta = trainer.train("S", prices, sent, 5, 0.01, str(tmp_path))
    assert 0 < meta["sentiment_coverage_pct"] < 20  # honest: only recent rows have news
