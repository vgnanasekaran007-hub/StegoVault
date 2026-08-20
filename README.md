# StegoVault — Image & Text Steganography

A full-stack web application that hides secret messages inside images using **LSB (Least Significant Bit) steganography**. Built as a college cybersecurity project.

![Python](https://img.shields.io/badge/Python-3.8+-3776ab?style=flat&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0+-000000?style=flat&logo=flask&logoColor=white)
![License](https://img.shields.io/badge/License-Educational-blueviolet)

---

## Features

- **Encode** — Hide secret text inside any PNG/JPG image
- **Decode** — Extract hidden text from a stego image
- **Drag & Drop** — Upload images easily
- **Capacity Check** — See how much text your image can hold
- **Lossless Output** — Stego images saved as PNG
- **Responsive UI** — Works on desktop, tablet, and mobile
- **Security** — File validation, safe filenames, path traversal protection

## Tech Stack

| Layer      | Technology        |
|------------|-------------------|
| Frontend   | HTML5, CSS3, JS   |
| Backend    | Python + Flask    |
| Processing | Pillow (PIL)      |
| API        | REST (JSON + File)|

## Project Structure

```
stegovault/
├── app.py                    # Flask backend server
├── requirements.txt          # Python dependencies
├── README.md                 # This file
├── steganography/
│   ├── __init__.py
│   └── lsb.py                # LSB steganography engine
├── templates/
│   └── index.html            # Frontend SPA
└── static/
    ├── css/style.css          # Stylesheet
    ├── js/app.js              # Frontend logic
    └── icons/favicon.svg      # Custom favicon
```

## Installation

```bash
# Clone / navigate to the project
cd stegovault

# Install Python dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

Open **http://localhost:5000** in your browser.

## API Endpoints

| Method | Endpoint       | Description                        |
|--------|----------------|------------------------------------|
| GET    | `/`            | Serves the frontend                |
| POST   | `/api/encode`  | Hides text in image (returns PNG)  |
| POST   | `/api/decode`  | Extracts text from stego image     |
| GET    | `/health`      | Health check                       |

### Encode Request

```
POST /api/encode
Content-Type: multipart/form-data

Fields:
  image   — PNG/JPG file
  message — Secret text to hide
```

### Decode Request

```
POST /api/decode
Content-Type: multipart/form-data

Fields:
  image — Stego PNG file
```

## How LSB Works

1. Convert the secret message to binary (UTF-8 → bits)
2. Read each pixel's R, G, B channels
3. Replace the **least significant bit** of each channel with a message bit
4. Save as lossless PNG — the image looks identical to the original

### Payload Format

```
[MAGIC: 8 bytes] [LENGTH: 4 bytes] [MESSAGE: variable]
```

The magic header (`STGV1337`) identifies stego images. The length prefix ensures exact extraction.

## Limitations

- Only supports PNG output (JPEG is lossy and destroys hidden data)
- Message capacity depends on image dimensions (width × height × 3 bits)
- No encryption — the hidden text is in plaintext (combine with encryption for real security)
- For educational/demonstration purposes only

## License

Educational project — for learning purposes only.
