import os,sys,json,joblib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor,HistGradientBoostingClassifier
from sklearn.metrics import mean_absolute_error,mean_squared_error,r2_score,accuracy_score,precision_score,recall_score,f1_score,confusion_matrix
from preprocess import load_data,clean_data,make_features,wafer_group_split,TRIM_TARGETS,CLASS_TARGET

def reg_metrics(y,p):
    y=np.asarray(y)
    return {"MAE":round(float(mean_absolute_error(y,p)),4),"RMSE":round(float(np.sqrt(mean_squared_error(y,p))),4),"R2":round(float(r2_score(y,p)),4),"exact_match_accuracy":round(float(np.mean(y==p)),4),"within_1_code_accuracy":round(float(np.mean(np.abs(y-p)<=1)),4)}

def cls_metrics(y,p):
    return {"accuracy":round(float(accuracy_score(y,p)),4),"precision":round(float(precision_score(y,p,zero_division=0)),4),"recall":round(float(recall_score(y,p,zero_division=0)),4),"f1_score":round(float(f1_score(y,p,zero_division=0)),4),"confusion_matrix":{"labels":["Fail","Pass"],"values":confusion_matrix(y,p,labels=[0,1]).tolist()}}

def train():
    df=load_data(); df,cr=clean_data(df); X,_=make_features(df); tr,te=wafer_group_split(df)
    metrics={"cleaning_report":cr,"models":{}}
    os.makedirs("models",exist_ok=True)
    for t in TRIM_TARGETS:
        m=HistGradientBoostingRegressor(max_iter=250,learning_rate=0.07,random_state=42)
        m.fit(X.iloc[tr],df[t].iloc[tr])
        p=np.clip(np.rint(m.predict(X.iloc[te])),0,127).astype(int)
        joblib.dump(m,f"models/{t}_model.joblib")
        metrics["models"][t]=reg_metrics(df[t].iloc[te],p)
    y=df[CLASS_TARGET].iloc[te].astype(int)
    c=HistGradientBoostingClassifier(max_iter=250,learning_rate=0.07,class_weight="balanced",random_state=42)
    c.fit(X.iloc[tr],df[CLASS_TARGET].iloc[tr].astype(int))
    p=c.predict(X.iloc[te])
    joblib.dump(c,"models/final_pass_model.joblib")
    metrics["models"][CLASS_TARGET]=cls_metrics(y,p)
    json.dump(metrics,open("models/metrics.json","w"),indent=2)
    json.dump(list(X.columns),open("models/feature_columns.json","w"),indent=2)
    print(json.dumps(metrics,indent=2))

if __name__=="__main__": train()
