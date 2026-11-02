import os,json,uuid
import pandas as pd,numpy as np,joblib
from flask import Flask,render_template,request,jsonify,send_from_directory,redirect,url_for,session
from flask_cors import CORS
from src.preprocess import load_data,clean_data,make_features
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

load_dotenv()

BASE=os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE)
app=Flask(__name__)
app.secret_key=os.getenv('SECRET_KEY','dev_secret')

# Enable CORS for all routes (Supports Firebase Hosting frontend)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

from src.auth import auth_bp, find_user_by_email, insert_user
from src.admin import admin_bp

app.config["UPLOAD_FOLDER"]="uploads"; app.config["DOWNLOAD_FOLDER"]="downloads"
# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)

# Ensure admin user exists
admin_email=os.getenv('ADMIN_EMAIL', 'admin@example.com')
admin_pass=os.getenv('ADMIN_PASSWORD', 'ChangeMe123')
if admin_email and admin_pass:
    if not find_user_by_email(admin_email):
        insert_user(admin_email, generate_password_hash(admin_pass), 'admin')

os.makedirs("uploads",exist_ok=True); os.makedirs("downloads",exist_ok=True)
TRIM_TARGETS=["bg_trim_code_opt","hsi_trim_code_opt","ldo_trim_code_opt"]
NAMES={"bg_trim_code_opt":"Bandgap Trim Code","hsi_trim_code_opt":"HSI Trim Code","ldo_trim_code_opt":"LDO Trim Code"}

MODELS={t:joblib.load(f"models/{t}_model.joblib") for t in TRIM_TARGETS}
MODELS["final_pass"]=joblib.load("models/final_pass_model.joblib")
METRICS=json.load(open("models/metrics.json"))
COLS=json.load(open("models/feature_columns.json"))
REQ=["die_x","die_y","x_mm","y_mm","radius_mm","pcm_vth_n_mV","pcm_vth_p_mV","pcm_rs_ohm_sq","pcm_tox_A","pcm_mobility_rel","bg_untrim_V","hsi_untrim_MHz","ldo_untrim_V","ts_cal1_30C_counts","sram_fail_bits","derivative","package","temp_grade"]

def prepare(df):
    miss=[c for c in REQ if c not in df.columns]
    if miss: raise ValueError("Missing columns: "+", ".join(miss))
    X,_=make_features(df)
    return X.reindex(columns=COLS,fill_value=0)

@app.after_request
def add_header(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.route("/")
def home():
    if not session.get('email'):
        return render_template("auth.html")
    return render_template("index.html", user=session.get('email'))

@app.route("/api/summary")
def summary():
    df=load_data()
    return jsonify({
        "metrics":METRICS,
        "dataset":{
            "rows":int(len(df)),
            "columns":int(df.shape[1]),
            "final_pass_rate":round(float(df["final_pass"].mean()*100),2)
        }
    })

@app.route("/api/predict",methods=["POST"])
def predict():
    try:
        X=prepare(pd.DataFrame([request.get_json(force=True)])); out={}
        for t in TRIM_TARGETS: out[NAMES[t]]=int(np.clip(np.rint(MODELS[t].predict(X)[0]),0,127))
        prob=float(MODELS["final_pass"].predict_proba(X)[0][1])
        out["Final Test Pass Probability (%)"]=round(prob*100,2)
        out["Predicted Final Test Result"]="PASS" if prob>=0.5 else "FAIL RISK"
        return jsonify({"success":True,"prediction":out})
    except Exception as e: return jsonify({"success":False,"error":str(e)}),400

@app.route("/api/upload",methods=["POST"])
def upload():
    try:
        f=request.files.get("file")
        if f is None or f.filename=="": raise ValueError("No file uploaded")
        df=pd.read_csv(f); df,_=clean_data(df); X=prepare(df)
        out=df[["die_id"]].copy() if "die_id" in df.columns else pd.DataFrame(index=df.index)
        for t in TRIM_TARGETS: out[NAMES[t]]=np.clip(np.rint(MODELS[t].predict(X)),0,127).astype(int)
        probs=MODELS["final_pass"].predict_proba(X)[:,1]
        out["Pass Probability (%)"]=np.round(probs*100,2)
        out["Predicted Result"]=np.where(probs>=0.5,"PASS","FAIL RISK")
        name=f"predictions_{uuid.uuid4().hex[:8]}.csv"
        out.to_csv(os.path.join("downloads",name),index=False)
        return jsonify({
            "success":True,
            "rows_processed":int(len(out)),
            "preview":out.head(10).to_dict(orient="records"),
            "download_url":f"/download/{name}"
        })
    except Exception as e: return jsonify({"success":False,"error":str(e)}),400

@app.route("/download/<filename>")
def download(filename): return send_from_directory("downloads",filename,as_attachment=True)

if __name__=="__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False,host="0.0.0.0",port=port)
