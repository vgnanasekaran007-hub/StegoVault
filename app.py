"""
StegoVault — Flask Backend

Endpoints:
  GET  /                     → Serves the single-page frontend
  POST /api/encode           → Hide text in an image (LSB)
  POST /api/decode           → Extract text from a stego image (LSB)
  POST /api/encode-image     → Hide an image inside another image (LSB)
  POST /api/decode-image     → Extract a hidden image from a stego image
  POST /api/encode-text      → Hide text inside cover text (zero-width)
  POST /api/decode-text      → Extract text from stego text (zero-width)
  GET  /health               → Health-check endpoint
"""

import os
import uuid
import tempfile
from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image

from steganography.lsb import (
    encode, decode, calculate_capacity,
    encode_image_in_image, decode_image_from_image,
    encode_text_in_text, decode_text_from_text,
)

# ── Configuration ──────────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE

# Temp directories for uploads and outputs
UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "stegovault_uploads")
OUTPUT_DIR = os.path.join(tempfile.gettempdir(), "stegovault_output")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ── Helpers ────────────────────────────────────────────────────────────

def _allowed_file(filename: str) -> bool:
    """Check if file extension is in the allowed set."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _safe_path(directory: str, filename: str) -> str:
    """Generate a collision-free, path-traversal-safe file path."""
    safe_name = secure_filename(filename)
    unique = f"{uuid.uuid4().hex}_{safe_name}"
    path = os.path.join(directory, unique)
    if not os.path.abspath(path).startswith(os.path.abspath(directory)):
        raise ValueError("Path traversal attempt detected.")
    return path


# ── Routes ─────────────────────────────────────────────────────────────

@app.route("/")
def index():
    """Serve the SPA frontend."""
    return render_template("index.html")


@app.route("/health")
def health():
    """Simple health-check."""
    return jsonify({"status": "ok", "service": "StegoVault"})


# ── Text-in-Image ─────────────────────────────────────────────────────

@app.route("/api/encode", methods=["POST"])
def api_encode():
    """Hide text in an image. Returns stego PNG."""
    if "image" not in request.files:
        return jsonify({"error": "No image file provided."}), 400

    file = request.files["image"]
    message = request.form.get("message", "").strip()

    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400
    if not _allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type. Use PNG, JPG, or JPEG."}), 400
    if not message:
        return jsonify({"error": "Secret message cannot be empty."}), 400

    upload_path = _safe_path(UPLOAD_DIR, file.filename)
    output_path = _safe_path(OUTPUT_DIR, "stego_output.png")

    try:
        file.save(upload_path)
        img = Image.open(upload_path)

        capacity = calculate_capacity(img)
        msg_bytes = len(message.encode("utf-8"))
        if msg_bytes > capacity:
            return jsonify({
                "error": f"Message too large ({msg_bytes:,} bytes). "
                         f"This image can hold up to {capacity:,} bytes."
            }), 400

        stego_img = encode(img, message)
        stego_img.save(output_path, format="PNG")

        return send_file(
            output_path, mimetype="image/png",
            as_attachment=True, download_name="stegovault_encoded.png",
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Encoding failed: {str(e)}"}), 500
    finally:
        if os.path.exists(upload_path):
            os.remove(upload_path)


@app.route("/api/decode", methods=["POST"])
def api_decode():
    """Extract text from a stego image. Returns JSON with message."""
    if "image" not in request.files:
        return jsonify({"error": "No image file provided."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400
    if not _allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type. Use PNG, JPG, or JPEG."}), 400

    upload_path = _safe_path(UPLOAD_DIR, file.filename)

    try:
        file.save(upload_path)
        img = Image.open(upload_path)
        hidden_message = decode(img)

        return jsonify({
            "message": hidden_message,
            "length": len(hidden_message),
            "byte_size": len(hidden_message.encode("utf-8")),
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Decoding failed: {str(e)}"}), 500
    finally:
        if os.path.exists(upload_path):
            os.remove(upload_path)


# ── Image-in-Image ────────────────────────────────────────────────────

@app.route("/api/encode-image", methods=["POST"])
def api_encode_image():
    """Hide a secret image inside a cover image. Returns stego PNG."""
    if "cover" not in request.files:
        return jsonify({"error": "No cover image provided."}), 400
    if "secret" not in request.files:
        return jsonify({"error": "No secret image provided."}), 400

    cover_file = request.files["cover"]
    secret_file = request.files["secret"]

    if cover_file.filename == "" or secret_file.filename == "":
        return jsonify({"error": "No file selected."}), 400
    if not _allowed_file(cover_file.filename) or not _allowed_file(secret_file.filename):
        return jsonify({"error": "Unsupported file type. Use PNG, JPG, or JPEG."}), 400

    cover_path = _safe_path(UPLOAD_DIR, cover_file.filename)
    secret_path = _safe_path(UPLOAD_DIR, secret_file.filename)
    output_path = _safe_path(OUTPUT_DIR, "stego_image_output.png")

    try:
        cover_file.save(cover_path)
        secret_file.save(secret_path)

        cover_img = Image.open(cover_path)
        secret_img = Image.open(secret_path)

        stego_img = encode_image_in_image(cover_img, secret_img)
        stego_img.save(output_path, format="PNG")

        return send_file(
            output_path, mimetype="image/png",
            as_attachment=True, download_name="stegovault_image_encoded.png",
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Image encoding failed: {str(e)}"}), 500
    finally:
        for p in [cover_path, secret_path]:
            if os.path.exists(p):
                os.remove(p)


@app.route("/api/decode-image", methods=["POST"])
def api_decode_image():
    """Extract a hidden image from a stego image. Returns the hidden PNG."""
    if "image" not in request.files:
        return jsonify({"error": "No image file provided."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400
    if not _allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type. Use PNG, JPG, or JPEG."}), 400

    upload_path = _safe_path(UPLOAD_DIR, file.filename)
    output_path = _safe_path(OUTPUT_DIR, "decoded_secret_image.png")

    try:
        file.save(upload_path)
        img = Image.open(upload_path)
        secret_img = decode_image_from_image(img)
        secret_img.save(output_path, format="PNG")

        return send_file(
            output_path, mimetype="image/png",
            as_attachment=True, download_name="stegovault_decoded_image.png",
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Image decoding failed: {str(e)}"}), 500
    finally:
        if os.path.exists(upload_path):
            os.remove(upload_path)


# ── Text-in-Text ──────────────────────────────────────────────────────

@app.route("/api/encode-text", methods=["POST"])
def api_encode_text():
    """Hide secret text inside cover text using zero-width chars."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON payload."}), 400

    cover_text = data.get("cover_text", "").strip()
    secret_message = data.get("secret_message", "").strip()

    if not cover_text:
        return jsonify({"error": "Cover text cannot be empty."}), 400
    if not secret_message:
        return jsonify({"error": "Secret message cannot be empty."}), 400

    try:
        stego_text = encode_text_in_text(cover_text, secret_message)
        return jsonify({
            "stego_text": stego_text,
            "visible_length": len(cover_text),
            "hidden_bytes": len(secret_message.encode("utf-8")),
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Text encoding failed: {str(e)}"}), 500


@app.route("/api/decode-text", methods=["POST"])
def api_decode_text():
    """Extract hidden text from stego text with zero-width chars."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON payload."}), 400

    stego_text = data.get("stego_text", "")

    if not stego_text:
        return jsonify({"error": "Stego text cannot be empty."}), 400

    try:
        hidden = decode_text_from_text(stego_text)
        return jsonify({
            "message": hidden,
            "length": len(hidden),
            "byte_size": len(hidden.encode("utf-8")),
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Text decoding failed: {str(e)}"}), 500


# ── Entry point ────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
