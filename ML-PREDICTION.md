# Inventory Prediction ML — Technical Reference

## Approach

We use **XGBoost** for stockout prediction. Based on research, XGBoost consistently outperforms ARIMA, Prophet, and linear regression for retail demand forecasting with structured data. Key advantages:
- Handles missing data natively (common in our sparse visit data)
- Captures non-linear relationships (seasonality × store tier × product category)
- Fast training (seconds, not hours)
- Small model size (deploys alongside main API)

## Open Source References

### Models & Frameworks (clone from GitHub)
These can all be cloned and adapted since GitHub is accessible during development, and the trained models run independently:

1. **XGBoost** (https://github.com/dmlc/xgboost) — MIT License
   - Core prediction engine
   - Python package: `pip install xgboost`

2. **Prophet** (https://github.com/facebook/prophet) — MIT License  
   - Seasonal decomposition for understanding cyclical patterns
   - Useful as a feature generator, not the primary model
   
3. **scikit-learn** (https://github.com/scikit-learn/scikit-learn) — BSD License
   - Preprocessing, feature engineering, model evaluation
   
4. **Feature Engineering Reference**:
   - https://github.com/Gunjansah/XGBoost-Forecasting-Pipeline — End-to-end pipeline with Streamlit UI
   - https://github.com/Hari-2782/Smart-Inventory-Demand-Forecasting — Complete with reorder alerts

## Feature Engineering

### Input Features Per Store-Product Pair

```python
features = {
    # Visit-based features
    "days_since_last_visit": int,          # Recency
    "visits_last_30_days": int,            # Visit frequency
    "avg_days_between_visits": float,      # Visit cadence
    
    # Stock observation features  
    "last_stock_status": categorical,       # in_stock, low_stock, out_of_stock
    "stock_status_history_7d": list,        # Last N observations encoded
    "consecutive_in_stock_visits": int,     # Stability indicator
    "times_restocked_last_90d": int,        # Churn indicator
    
    # AI shelf analysis features (when available)
    "last_facing_count": int,              # From AI analysis
    "facing_count_delta": int,             # Change from previous visit  
    "share_of_shelf_pct": float,           # Our % of category shelf
    "competitor_facing_count": int,        # Competitive pressure
    
    # Store features
    "store_tier": categorical,              # A, B, C
    "store_type": categorical,              # supermarket, convenience, small_shop
    
    # Temporal features
    "day_of_week": int,                    # 0-6
    "day_of_month": int,                   # 1-31
    "month": int,                          # 1-12
    "is_holiday": bool,                    # Chinese holidays
    "is_festival_period": bool,            # Spring Festival, Mid-Autumn, etc.
    "days_until_next_holiday": int,        # Proximity to holidays
    
    # Derived features
    "depletion_rate": float,               # Estimated units/day based on facing changes
    "predicted_days_to_zero": float,       # Linear extrapolation of depletion
}
```

### Target Variable

```python
# Binary classification: Will this store-product be OOS within N days?
target = "will_stockout_within_7_days"  # 1 = yes, 0 = no

# Alternative: Regression on days until stockout
target_regression = "days_until_stockout"  # continuous, 0 = already OOS
```

## Training Pipeline

```python
import xgboost as xgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import precision_score, recall_score, f1_score
import pandas as pd

def train_stockout_model(visit_data: pd.DataFrame) -> xgb.XGBClassifier:
    """
    Train XGBoost model for stockout prediction.
    
    Priority: HIGH RECALL (we'd rather false-alarm than miss a stockout)
    """
    
    # Feature engineering
    X = engineer_features(visit_data)
    y = create_target(visit_data, horizon_days=7)
    
    # Handle class imbalance (stockouts are minority class)
    scale_pos_weight = len(y[y==0]) / len(y[y==1])
    
    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        scale_pos_weight=scale_pos_weight,
        min_child_weight=5,
        subsample=0.8,
        colsample_bytree=0.8,
        objective='binary:logistic',
        eval_metric='aucpr',  # Area under precision-recall curve
        random_state=42,
    )
    
    # Time-series aware cross-validation
    tscv = TimeSeriesSplit(n_splits=5)
    
    for fold, (train_idx, val_idx) in enumerate(tscv.split(X)):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]
        
        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )
        
        y_pred = model.predict(X_val)
        print(f"Fold {fold}: Precision={precision_score(y_val, y_pred):.3f}, "
              f"Recall={recall_score(y_val, y_pred):.3f}, "
              f"F1={f1_score(y_val, y_pred):.3f}")
    
    # Final training on all data
    model.fit(X, y)
    return model
```

## Serving Architecture

```
FastAPI microservice (ml/)
├── POST /predict          — Predict stockout for store-product pairs
├── POST /batch-predict    — Batch prediction for daily scheduling
├── GET  /model-info       — Current model version + metrics
└── POST /retrain          — Trigger model retraining (admin only)
```

The ML service runs as a Docker container alongside the main API. It's called by the revisit scheduler to prioritize stores at risk of stockout.

## Cold Start Problem

When a company first starts using XúnDiàn, there's no visit history to train on. Strategy:

1. **Week 1-4**: Use rule-based heuristics only (tier-based revisit cadence)
2. **Month 2-3**: Start collecting data, run basic stats (average depletion rates)
3. **Month 3+**: Enough data for XGBoost training (~500+ visits needed for reasonable model)
4. **Ongoing**: Retrain weekly with new visit data

## Chinese Holiday Calendar

Critical for seasonality features. Include these in the feature set:

- Spring Festival (春节) — Jan/Feb, massive demand spike
- Qingming Festival (清明节) — April  
- Labor Day (劳动节) — May
- Dragon Boat Festival (端午节) — June
- Mid-Autumn Festival (中秋节) — Sep/Oct, soy sauce demand spike
- National Day (国庆节) — October, week-long holiday
- Single's Day (双十一) — November 11, e-commerce impact on retail

Use the `chinese-calendar` Python package for accurate date detection.

## Expected Performance

Based on similar retail stockout prediction literature:
- **Precision**: 0.75-0.85 (acceptable — some false alarms are okay)
- **Recall**: 0.85-0.95 (critical — we must catch real stockouts)
- **F1 Score**: 0.80-0.90
- **Training time**: <30 seconds on CPU for 100K records
- **Inference time**: <10ms per prediction
