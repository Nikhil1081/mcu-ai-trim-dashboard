import pandas as pd
import numpy as np
from sklearn.model_selection import GroupShuffleSplit

TRIM_TARGETS = ["bg_trim_code_opt", "hsi_trim_code_opt", "ldo_trim_code_opt"]
CLASS_TARGET = "final_pass"

def load_data(path="data/mcu_trim_fuse.csv"):
    return pd.read_csv(path)

def clean_data(df):
    report={"initial_rows":int(len(df)),"initial_columns":int(df.shape[1])}
    before=len(df)
    df=df.drop_duplicates().copy()
    report["duplicates_removed"]=int(before-len(df))
    for c in df.select_dtypes(include=[np.number]).columns:
        df[c]=df[c].fillna(df[c].median())
    for c in df.select_dtypes(include=["object"]).columns:
        if df[c].isna().any():
            df[c]=df[c].fillna(df[c].mode()[0])
    for c in df.select_dtypes(include=[np.number]).columns:
        if len(df)>100:
            low,high=df[c].quantile([0.001,0.999])
            df[c]=df[c].clip(low,high)
    report["missing_values_after_cleaning"]=int(df.isna().sum().sum())
    report["final_rows"]=int(len(df))
    report["final_columns"]=int(df.shape[1])
    return df,report

def make_features(df):
    data=df.copy()
    data["bg_error_mV"]=(data["bg_untrim_V"]-1.200)*1000
    data["hsi_error_pct"]=((data["hsi_untrim_MHz"]-16)/16)*100
    data["ldo_error_mV"]=(data["ldo_untrim_V"]-1.10)*1000
    data["wafer_radius_norm"]=data["radius_mm"]/150.0
    cols=["die_x","die_y","x_mm","y_mm","radius_mm","wafer_radius_norm","pcm_vth_n_mV","pcm_vth_p_mV","pcm_rs_ohm_sq","pcm_tox_A","pcm_mobility_rel","bg_untrim_V","bg_error_mV","hsi_untrim_MHz","hsi_error_pct","ldo_untrim_V","ldo_error_mV","ts_cal1_30C_counts","sram_fail_bits","derivative","package","temp_grade"]
    X=data[cols].copy()
    X=pd.get_dummies(X,columns=["derivative","package","temp_grade"],drop_first=False)
    return X,data

def wafer_group_split(df,test_size=0.2,random_state=42):
    s=GroupShuffleSplit(n_splits=1,test_size=test_size,random_state=random_state)
    return next(s.split(df,groups=df["wafer_id"]))
