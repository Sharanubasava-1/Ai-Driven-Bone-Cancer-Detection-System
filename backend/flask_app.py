import os
import shutil
import json
from datetime import datetime
from urllib.parse import quote


# -------------------------------
# Flask + Web
# -------------------------------
from flask import (
    Flask, request, render_template,
    url_for, make_response, jsonify, send_from_directory, abort
)
from werkzeug.utils import secure_filename, safe_join
from flask_cors import CORS


# -------------------------------
# Machine Learning / Image Processing
# -------------------------------
import tensorflow as tf
import cv2
import numpy as np


# -------------------------------
# PDF Generation
# -------------------------------
from pdf_generator import create_pdf_report


# -------------------------------
# Supabase Client (optional)
# -------------------------------
try:
    from supabase import create_client, Client
except Exception:
    create_client = None
    Client = None


# -------------------------------
# Environment Variables
# -------------------------------
from dotenv import load_dotenv
load_dotenv()


# --- Configuration ---
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
STATIC_UPLOADS = os.path.join(BASE_DIR, 'static', 'uploads')
IMAGE_SIZE = (224, 224)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# --- Supabase Initialization ---
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

supabase = None
if create_client and SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        app_supabase_msg = "Supabase client initialized"
    except Exception as e:
        app_supabase_msg = f"Supabase client disabled: {e}"
        supabase = None
else:
    app_supabase_msg = "Supabase client disabled: missing URL or key"

app = Flask(__name__, static_folder=os.path.join(BASE_DIR, 'static'))
CORS(app)

app.logger.warning(app_supabase_msg)

# ensure folders exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(STATIC_UPLOADS, exist_ok=True)


# --- Load models (if present) ---
try:
    gatekeeper_model = tf.keras.models.load_model(os.path.join(BASE_DIR, 'models', 'gatekeeper_model.h5'))
    classification_model = tf.keras.models.load_model(os.path.join(BASE_DIR, 'models', 'classification_model.h5'))
    app.logger.info("✅ AI Models loaded successfully")
except Exception as e:
    app.logger.warning("AI models not loaded or error: %s", e)
    gatekeeper_model = None
    classification_model = None


# --- Helpers ---
def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _extract_created_at_from_filename(filename: str):
    """Best-effort timestamp from filenames like userid_20260713T094351Z_image.jpg."""
    try:
        stem = os.path.splitext(os.path.basename(filename))[0]
        parts = stem.split('_')
        for part in parts:
            if len(part) == 16 and part.endswith('Z') and 'T' in part:
                return datetime.strptime(part, '%Y%m%dT%H%M%SZ').isoformat()
    except Exception:
        pass
    return None


def _best_effort_local_history_record(user_id: str, filename: str, metadata: dict | None = None):
    metadata = metadata or {}
    basename = os.path.basename(filename)
    local_path = os.path.join(os.path.abspath(UPLOAD_FOLDER), basename)
    if not os.path.exists(local_path):
        return None

    prediction = metadata.get('prediction')
    confidence = metadata.get('confidence')
    recommendation = metadata.get('recommendation')
    if prediction is None or confidence is None or recommendation is None:
        analysis = get_prediction(local_path)
        if analysis and not analysis.get('error'):
            prediction = prediction or analysis.get('prediction')
            confidence = confidence if confidence is not None else analysis.get('confidence')
            recommendation = recommendation or analysis.get('recommendation')

    created_at = metadata.get('created_at') or _extract_created_at_from_filename(basename)
    if not created_at:
        try:
            created_at = datetime.fromtimestamp(os.path.getmtime(local_path)).isoformat()
        except Exception:
            created_at = None

    patient_name = metadata.get('patient_name')
    if not patient_name:
        patient_name = metadata.get('patientname') or user_id

    return {
        'id': metadata.get('id'),
        'user_id': user_id,
        'image_path': basename,
        'prediction': prediction,
        'confidence': confidence,
        'recommendation': recommendation,
        'patientname': patient_name,
        'extra': {
            'localfilename': metadata.get('local_filename', basename),
            'patient_name': metadata.get('patient_name'),
            'created_at': created_at,
        },
        'created_at': created_at,
    }


def get_prediction(image_path: str) -> dict:
    """
    Return {"prediction": label, "confidence": "xx.xx", "recommendation": "..."}
    or {"error": "..."} on failure.
    """
    if not (gatekeeper_model and classification_model):
        return {"error": "Models are not loaded on server."}
    try:
        img = cv2.imread(image_path)
        if img is None:
            return {"error": "Could not read image file."}
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img_resized = cv2.resize(img_rgb, IMAGE_SIZE)
        arr = np.expand_dims(img_resized, axis=0)

        gatekeeper_pred = float(gatekeeper_model.predict(arr)[0][0])
        if gatekeeper_pred > 0.5:
            return {"error": "Invalid Image: Does not appear to be a bone scan."}

        class_pred = float(classification_model.predict(arr)[0][0])
        if class_pred > 0.5:
            prediction = "Malignant"
            confidence = class_pred * 100.0
        else:
            prediction = "Benign"
            confidence = (1.0 - class_pred) * 100.0

        recommendation = "High priority consultation is recommended." if prediction == "Malignant" else "Follow-up consultation is advised."
        return {"prediction": prediction, "confidence": f"{confidence:.2f}", "recommendation": recommendation}
    except Exception as e:
        app.logger.exception("Prediction error")
        return {"error": "An error occurred during prediction."}


# -------------------------------
# Supabase helpers
# -------------------------------
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET", "images")

_supabase_client = None


def init_supabase():
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError("Supabase URL/KEY not set in env")
        if create_client is None:
            raise RuntimeError("supabase package not available")
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client


def _normalize_supabase_response(res):
    out = {"status_code": None, "data": None, "error": None, "raw_type": type(res).__name__}
    try:
        if isinstance(res, dict):
            out["data"] = res.get("data") or res.get("json") or res
            out["error"] = res.get("error")
            out["status_code"] = res.get("status_code") or res.get("status") or None
            return out
        if hasattr(res, "data"):
            out["data"] = getattr(res, "data")
        if hasattr(res, "error"):
            out["error"] = getattr(res, "error")
        if hasattr(res, "status_code"):
            out["status_code"] = getattr(res, "status_code")
        if out["data"] is None and hasattr(res, "json"):
            try:
                out["data"] = res.json()
            except Exception:
                pass
    except Exception as e:
        out["error"] = f"normalize_error: {e}"
    return out


def supabase_path_to_urlsafe(path: str) -> str:
    if not path:
        return path
    parts = path.split('/')
    return '/'.join(quote(p, safe='') for p in parts)


def upload_file_to_supabase(local_filepath: str, dest_path: str = None, bucket: str = None) -> dict:
    """
    Upload file to supabase storage and return dict with keys:
      status, path, public_url (or None), signed_url (or None), upload_response
    """
    try:
        client = init_supabase()
    except Exception as e:
        return {"status": "error", "error": f"supabase_init_failed: {e}"}

    bucket = bucket or SUPABASE_BUCKET
    if dest_path is None:
        dest_path = f"{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}_{os.path.basename(local_filepath)}"

    try:
        with open(local_filepath, "rb") as f:
            res = client.storage.from_(bucket).upload(dest_path, f)
    except Exception as e:
        return {"status": "error", "error": f"upload_exception: {e}", "path": dest_path}

    norm = _normalize_supabase_response(res)
    if norm.get("error"):
        return {"status": "error", "error": norm["error"], "upload_response": norm}

    # attempt to get public_url or signed_url
    public_url = None
    signed_url = None
    try:
        pub_res = client.storage.from_(bucket).get_public_url(dest_path)
        if isinstance(pub_res, dict):
            public_url = pub_res.get("publicUrl") or pub_res.get("public_url")
        elif isinstance(pub_res, str):
            public_url = pub_res
    except Exception:
        public_url = None

    try:
        if public_url and not public_url.lower().startswith("http") and SUPABASE_URL:
            public_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{bucket}/{supabase_path_to_urlsafe(dest_path)}"
    except Exception:
        pass

    if not public_url:
        try:
            signed_res = client.storage.from_(bucket).create_signed_url(dest_path, expires_in=60*60)
            if isinstance(signed_res, dict):
                signed_url = signed_res.get("signedURL") or signed_res.get("signed_url") or signed_res.get("signedUrl")
            elif isinstance(signed_res, str):
                signed_url = signed_res
        except Exception:
            signed_url = None

    return {"status": "success", "path": dest_path, "public_url": public_url, "signed_url": signed_url, "upload_response": norm}


def insert_image_record(safeuserid, storage_path, prediction, confidence, recommendation, patientname=None, extra=None):
    """
    Insert image analysis record into Supabase.
    """
    payload = {
        'user_id': safeuserid,
        'image_path': storage_path,
        'prediction': prediction,
        'confidence': float(confidence) if confidence is not None else None,
        'recommendation': recommendation,
        'patientname': patientname,
        'extra': extra or {}
    }

    print(f"DEBUG: Attempting to insert to Supabase:")
    print(f"DEBUG: Payload = {payload}")
    
    try:
        client = init_supabase()
        res = client.table('images').insert(payload).execute()
        print(f"DEBUG: Insert SUCCESS")
        print(f"DEBUG: Response = {res}")
        
        # Normalize the response
        if isinstance(res, dict):
            data = res.get('data')
        else:
            data = getattr(res, 'data', None)
        
        return {
            "status": "success", 
            "data": data,
            "raw_response": str(res)
        }
        
    except Exception as e:
        print(f"DEBUG: Insert FAILED with error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "error": f"insert_exception: {e}",
            "payload": payload
        }


def get_request_userid():
    """
    Extract user id from query param, header X-User-Id, form field 'userid', or Authorization Bearer.
    """
    try:
        q = request.args.get("userid")
        if q:
            return q.strip()
        h = request.headers.get("X-User-Id")
        if h:
            return h.strip()
        try:
            f = request.form.get("userid")
        except Exception:
            f = None
        if f:
            return f.strip()
        auth = request.headers.get("Authorization") or request.headers.get("authorization")
        if auth:
            parts = auth.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                return parts[1].strip()
        return None
    except Exception:
        return None


# -------------------------------
# Routes
# -------------------------------

@app.route('/', methods=['GET'])
def index():
    return "Flask backend is running."


@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Expects multipart/form-data with 'file' and optional 'patient_name' and 'userid'.
    Returns a JSON payload with analysis results and storage info.
    """
    try:
        app.logger.debug("Headers: %s", {k: request.headers.get(k) for k in ["X-User-Id","Authorization","Content-Type"]})
        app.logger.debug("Form keys: %s", list(request.form.keys()))
        app.logger.debug("Files keys: %s", list(request.files.keys()))

        if 'file' not in request.files:
            return jsonify({"status":"error","error":"No file part in request"}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({"status":"error","error":"No file selected"}), 400
        if not allowed_file(file.filename):
            return jsonify({"status":"error","error":"File type not allowed"}), 400

        raw_userid = get_request_userid()
        if not raw_userid:
            return jsonify({"status":"error","error":"Missing userid. Provide X-User-Id header or form field 'userid'."}), 400

        safe_userid = "".join(c for c in raw_userid if c.isalnum() or c in ("-", "_")).lower() or "user"
        utc_ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        filename = secure_filename(file.filename)
        unique_filename = f"{safe_userid}_{utc_ts}_{filename}"

        # save to uploads/
        local_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(local_path)

        # copy to static/uploads for convenience (optional)
        static_url = None
        try:
            os.makedirs(STATIC_UPLOADS, exist_ok=True)
            static_dest = os.path.join(STATIC_UPLOADS, unique_filename)
            shutil.copy(local_path, static_dest)
            static_url = url_for('static', filename=f'uploads/{unique_filename}', _external=True)
        except Exception as e:
            app.logger.debug("Static copy failed (non-fatal): %s", e)

        # run prediction
        analysis = get_prediction(local_path)
        if analysis.get("error"):
            return jsonify({"status":"error", "error": analysis.get("error"), "local_path": local_path}), 500

        pred = analysis.get("prediction")
        conf = analysis.get("confidence")
        rec = analysis.get("recommendation")

        # attempt supabase upload if configured
        supa_path = None
        supa_url = None
        upload_res = None
        if SUPABASE_URL and SUPABASE_KEY and create_client is not None:
            try:
                dest_path = f"{safe_userid}/{unique_filename}"
                upload_res = upload_file_to_supabase(local_path, dest_path=dest_path)
                if upload_res.get("status") == "success":
                    supa_path = upload_res.get("path")
                    supa_url = upload_res.get("public_url") or upload_res.get("signed_url")
            except Exception as ue:
                app.logger.debug("Supabase upload failed: %s", ue)
                upload_res = {"status":"error","error": str(ue)}
        else:
            upload_res = {"status":"error","error":"supabase_not_configured"}

        # attempt DB insert (optional)
        insert_res = None
        if SUPABASE_URL and SUPABASE_KEY and create_client is not None:
            try:
                raw_insert = insert_image_record(
                    safe_userid,
                    supa_path or f"{safe_userid}/{unique_filename}",
                    pred,
                    float(conf) if conf is not None else None,
                    rec,
                    request.form.get('patient_name'),
                    {'localfilename': unique_filename, 'storageurl': supa_url}
                )
                # Extract only serializable data
                if raw_insert and raw_insert.get("status") == "success":
                    insert_res = {
                        "status": "success",
                        "message": "Record inserted successfully"
                    }
                else:
                    insert_res = {
                        "status": "error",
                        "error": raw_insert.get("error") if raw_insert else "Unknown error"
                    }
            except Exception as ie:
                insert_res = {"status":"error","error": str(ie)}
        else:
            insert_res = {"status":"error","error":"supabase_not_configured"}

        # backend uploads URL (always available)
        try:
            backend_upload_url = url_for('serve_upload', filename=quote(unique_filename, safe=''), _external=True)
        except Exception:
            backend_upload_url = f"/uploads/{quote(unique_filename, safe='')}"

        download_url = url_for('download_report',
                               prediction=pred or "N/A",
                               confidence=conf or "N/A",
                               recommendation=rec or "N/A",
                               image_name=unique_filename,
                               patient_name=request.form.get('patient_name', 'Anonymous'),
                               _external=True)

        resp = {
            "status":"success",
            "userid": safe_userid,
            "prediction": pred,
            "confidence": conf,
            "recommendation": rec,
            "patient_name": request.form.get('patient_name', 'Anonymous'),
            "local_filename": unique_filename,
            "local_path": local_path,
            "static_url": static_url,
            "backend_upload_url": backend_upload_url,
            "supabase_upload": upload_res,
            "supabase_db_insert": insert_res,
            "supabase_path": supa_path,
            "supabase_url": supa_url,
            "download_report_url": download_url
        }
        return jsonify(resp), 200

    except Exception as e:
        app.logger.exception("Predict failed")
        return jsonify({"status":"error","error":"Internal server error","details": str(e)}), 500


@app.route('/api/history/<patient_id>', methods=['GET'])
def get_history(patient_id):
    """
    Get all analysis records for a specific patient ID.
    """
    try:
        if not SUPABASE_URL or not SUPABASE_KEY or create_client is None:
            return jsonify({
                'status': 'error',
                'error': 'Supabase not configured'
            }), 500
        
        client = init_supabase()
        
        # Query with correct column name 'user_id'
        try:
            response = client.table('images').select('*').eq('user_id', str(patient_id)).order('created_at', desc=True).execute()
        except TypeError:
            response = client.table('images').select('*').eq('user_id', str(patient_id)).order('created_at', ascending=False).execute()
        
        # Extract data
        if isinstance(response, dict):
            rows = response.get('data') or []
        else:
            rows = getattr(response, 'data', None) or []
        
        # Handle no records found
        if not rows or len(rows) == 0:
            return jsonify({
                'status': 'error',
                'error': f'No records found for patient ID: {patient_id}',
                'patient_id': patient_id
            }), 404
        
        # Format results
        results = []
        for r in rows:
            results.append({
                'id': r.get('id'),
                'user_id': r.get('user_id'),
                'image_path': r.get('image_path'),
                'prediction': r.get('prediction'),
                'confidence': r.get('confidence'),
                'recommendation': r.get('recommendation'),
                'patientname': r.get('patientname'),
                'extra': r.get('extra'),
                'created_at': r.get('created_at')
            })
        
        return jsonify({
            'status': 'success',
            'patient_id': patient_id,
            'count': len(results),
            'results': results
        }), 200
        
    except Exception as e:
        app.logger.exception(f"get_history failed for patient_id={patient_id}")
        return jsonify({
            'status': 'error',
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@app.route('/api/report', methods=['GET'])
def get_report():
    """
    Get report for a specific user ID.
    """
    userid = request.args.get('userid')
    if not userid:
        return jsonify({'status': 'error', 'error': 'Missing required parameter: userid'}), 400
    
    try:
        rows = []
        
        # Try Supabase first if configured
        if SUPABASE_URL and SUPABASE_KEY and create_client is not None:
            try:
                client = init_supabase()
                try:
                    resp = client.table('images').select('*').eq('user_id', userid).order('created_at', desc=True).execute()
                except TypeError:
                    resp = client.table('images').select('*').eq('user_id', userid).order('created_at', ascending=False).execute()
                
                if isinstance(resp, dict):
                    rows = resp.get('data') or []
                else:
                    rows = getattr(resp, 'data', None) or getattr(resp, 'value', None) or []
            except Exception as e:
                app.logger.debug(f"Supabase query error, falling back to local: {e}")
                rows = []
        
        # Fallback to local files
        if not rows:
            try:
                candidates = sorted(os.listdir(UPLOAD_FOLDER), reverse=True)
                for fname in candidates:
                    if not fname.startswith(f"{userid}_"):
                        continue
                    if fname.endswith('.json'):
                        continue

                    metadata = {}
                    metadata_path = os.path.join(UPLOAD_FOLDER, f"{fname}.json")
                    if os.path.exists(metadata_path):
                        try:
                            with open(metadata_path, 'r', encoding='utf-8') as handle:
                                metadata = json.load(handle) or {}
                        except Exception as e:
                            app.logger.debug(f"Metadata load failed for {metadata_path}: {e}")

                    fallback_record = _best_effort_local_history_record(userid, fname, metadata)
                    if fallback_record:
                        rows.append(fallback_record)
            except Exception as e:
                app.logger.debug(f"Local scan error: {e}")
        
        results = []
        for r in rows:
            imagepath = r.get('image_path') or r.get('localfilename') or ''
            publicurl = None
            signedurl = None
            backenduploadurl = None
            
            # Try to get Supabase URL if path contains slash
            if SUPABASE_URL and SUPABASE_KEY and create_client is not None and imagepath and '/' in imagepath:
                try:
                    client = init_supabase()
                    try:
                        pub = client.storage.from_(SUPABASE_BUCKET).get_public_url(imagepath)
                        if isinstance(pub, dict):
                            publicurl = pub.get('publicUrl') or pub.get('publicurl')
                        elif isinstance(pub, str):
                            publicurl = pub
                    except Exception:
                        publicurl = None
                    
                    if publicurl and not publicurl.lower().startswith('http'):
                        publicurl = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{SUPABASE_BUCKET}/{supabase_path_to_urlsafe(imagepath)}"
                    
                    if not publicurl:
                        try:
                            signed = client.storage.from_(SUPABASE_BUCKET).create_signed_url(imagepath, expires_in=60*60)
                            if isinstance(signed, dict):
                                signedurl = signed.get('signedURL') or signed.get('signedurl') or signed.get('signedUrl')
                            elif isinstance(signed, str):
                                signedurl = signed
                        except Exception:
                            signedurl = None
                except Exception:
                    publicurl = None
                    signedurl = None
            
            # Fallback to backend URL
            if not publicurl and not signedurl and imagepath:
                basename = os.path.basename(imagepath)
                candidate = os.path.join(os.path.abspath(UPLOAD_FOLDER), basename)
                if os.path.exists(candidate):
                    try:
                        backenduploadurl = url_for('serve_upload', filename=quote(basename, safe=''), _external=True)
                        publicurl = backenduploadurl
                    except Exception:
                        backenduploadurl = f"/uploads/{quote(basename, safe='')}"
                        publicurl = backenduploadurl
            
            # Get patient name from extra JSON or direct column
            patientname_value = ''
            if isinstance(r.get('extra'), dict):
                patientname_value = r.get('extra', {}).get('patient_name') or r.get('extra', {}).get('patientname') or ''
            if not patientname_value:
                patientname_value = r.get('patientname') or ''
            
            downloadreporturl = url_for(
                'download_report',
                prediction=r.get('prediction') or 'N/A',
                confidence=str(r.get('confidence') or 'N/A'),
                recommendation=r.get('recommendation') or 'N/A',
                image_name=os.path.basename(imagepath) or '',  # ← Fixed: image_name
                patient_name=patientname_value or 'Anonymous',  # ← Fixed: patient_name
                _external=True
            )

            results.append({
                'id': r.get('id'),
                'userid': r.get('user_id'),
                'imagepath': imagepath,
                'localfilename': r.get('extra', {}).get('localfilename') if isinstance(r.get('extra'), dict) else '',
                'patient_name': patientname_value,
                'prediction': r.get('prediction'),
                'confidence': r.get('confidence'),
                'recommendation': r.get('recommendation'),
                'patientname': patientname_value,
                'extra': r.get('extra'),
                'createdat': r.get('created_at'),
                'created_at': r.get('created_at'),
                'publicurl': publicurl,
                'signedurl': signedurl,
                'backenduploadurl': backenduploadurl,
                'downloadreporturl': downloadreporturl,
                'rawrow': r
            })
        
        return jsonify({"status":"success", "count":len(results), "results":results}), 200
    
    except Exception as e:
        app.logger.exception("/api/report failed")
        return jsonify({"status":"error","error":"Internal server error","details":str(e)}), 500


@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    """
    Serve files directly from the uploads/ directory.
    """
    try:
        uploads_dir = os.path.abspath(app.config.get('UPLOAD_FOLDER', UPLOAD_FOLDER))
        safe_path = safe_join(uploads_dir, filename)
        if not safe_path or not os.path.isfile(safe_path):
            app.logger.info("serve_upload: file not found: %s", safe_path)
            return abort(404)
        return send_from_directory(uploads_dir, filename, as_attachment=False)
    except Exception as e:
        app.logger.exception("serve_upload error")
        return abort(500)


@app.route('/download_report')
def download_report():
    """
    Build PDF report using local static copy if available, otherwise the backend /uploads URL.
    """
    try:
        prediction = request.args.get('prediction', 'N/A')
        confidence = request.args.get('confidence', 'N/A')
        recommendation = request.args.get('recommendation', 'N/A')
        image_name = request.args.get('image_name', 'N/A')
        patient_name = request.args.get('patient_name', 'Anonymous')

        # try static/uploads first then backend uploads
        image_url = None
        image_path = None
        basename = os.path.basename(image_name)
        static_candidate = os.path.join(app.static_folder or 'static', 'uploads', basename)
        if os.path.exists(static_candidate):
            image_url = url_for('static', filename=f'uploads/{basename}', _external=True)
            image_path = static_candidate
        else:
            uploads_candidate = os.path.join(os.path.abspath(UPLOAD_FOLDER), basename)
            if os.path.exists(uploads_candidate):
                image_url = url_for('serve_upload', filename=quote(basename, safe=''), _external=True)
                image_path = uploads_candidate

        confidence_value = 0.0
        try:
            confidence_value = float(confidence)
            if confidence_value > 1:
                confidence_value = confidence_value / 100.0
        except Exception:
            confidence_value = 0.0

        pdf_payload = {
            "patient_name": patient_name,
            "filename": image_name,
            "timestamp": datetime.now().isoformat(),
            "original_image": image_url or "",
            "image_path": image_path or "",
            "classification": {
                "predicted_class": prediction,
                "confidence": confidence_value,
            },
            "analysis": {
                "confidence_level": confidence,
                "recommendation": recommendation,
            },
        }
        pdf = create_pdf_report(pdf_payload)
        response = make_response(pdf)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=report_{secure_filename(image_name)}.pdf'
        return response
    except Exception as e:
        app.logger.exception("download_report failed")
        return "Error generating PDF", 500


# start server
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)