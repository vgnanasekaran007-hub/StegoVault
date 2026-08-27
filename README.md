# 🛡️ StegoVault — Client-Side Steganography Suite

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-22D3EE?style=for-the-badge&logo=vercel&logoColor=white)](https://stego-vault-navy.vercel.app/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-Custom-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-Cyberpunk%20Glass-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)

> **StegoVault** is a zero-backend, client-side cybersecurity application designed to securely hide and extract confidential payloads using advanced steganography algorithms directly within your browser.

🔗 **Live Application:** [https://stego-vault-navy.vercel.app/](https://stego-vault-navy.vercel.app/)

---

## 🌟 Key Features

StegoVault provides 3 distinct modes of steganography:

### 1. 🖼️ Text-in-Image Steganography (LSB)
- **Hide Secret Text:** Encodes UTF-8 messages directly into the Least Significant Bits (LSB) of cover image RGB channels.
- **Extract Text:** Instantly extracts concealed messages from stego images containing the `STGV1337` signature.
- **Capacity Indicator:** Real-time calculation of available payload bytes per image based on pixel resolution.

### 2. 📸 Image-in-Image Steganography (LSB + Compression)
- **Covert Image Carrier:** Embeds a secondary secret image inside a primary cover image using LSB manipulation.
- **Fast Compression:** Integrates `pako` (zlib compression) to maximize embedding density and support high-resolution payloads.
- **Lossless Extraction:** Reconstructs the exact hidden PNG secret image without quality degradation.

### 3. 📝 Text-in-Text Steganography (Zero-Width Unicode)
- **Invisible Payload:** Hides secret text inside normal cover text using invisible Zero-Width Unicode characters (`U+200B`, `U+200C`, `U+200D`, `U+FEFF`).
- **Stealth Messaging:** Secret data remains 100% invisible to human eyes across chat apps, emails, and social media.

---

## ⚡ 100% Client-Side Architecture

StegoVault runs entirely inside the user's browser using HTML5 Canvas API and Web APIs. 

* 🔒 **Maximum Privacy:** Your files and secret data **never** leave your machine or upload to any server.
* 🚀 **Zero Latency:** Processing happens instantly with no server roundtrips or cold starts.
* 🌐 **Serverless Deployment:** Deployed easily on static hosts like Vercel, Netlify, or GitHub Pages.

---

## 🛠️ Technology Stack

* **Frontend:** HTML5, Vanilla CSS3 (Custom Dark Cybersecurity Glassmorphism), Vanilla JavaScript (ES6+)
* **Engine:** Canvas API (ImageData / LSB bitwise operations), Web TextEncoder API
* **Compression:** [Pako.js](https://github.com/nodeca/pako) (Browser zlib implementation)
* **Deployment:** Vercel Static Hosting

---

## 📁 Repository Structure

```text
stegovault/
├── index.html                # Main SPA Landing Page
├── README.md                 # Project Documentation
├── static/
│   ├── css/
│   │   └── style.css         # Dark Cybersecurity Theme & Components
│   ├── js/
│   │   ├── stego.js          # Core Client-Side Steganography Engine
│   │   └── app.js            # UI Event Handlers, Drag-and-Drop & Rendering
│   └── icons/
│       └── favicon.svg       # Custom Vector Logo
└── templates/
    └── index.html            # Template Backup
```

---

## 💻 Local Quickstart

No dependencies or node servers required!

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/stegovault.git
   cd stegovault
   ```

2. **Run locally:**
   Open `index.html` directly in any web browser, or serve with standard static server:
   ```bash
   python3 -m http.server 8000
   ```

3. **Open Browser:**
   Navigate to `http://localhost:8000`.

---

## 🔬 Technical Payload Specifications

### LSB Image Format
```text
[ MAGIC_HEADER (8 Bytes) ] [ TYPE (1 Byte) ] [ LENGTH (4 Bytes) ] [ PAYLOAD (Variable) ]
```
* **MAGIC_HEADER:** `STGV1337` (used to verify stego image integrity)
* **TYPE:** `0x01` (Text), `0x02` (Compressed Image)
* **LENGTH:** Big-endian 32-bit unsigned integer

---

## 📜 Educational Disclaimer

StegoVault was developed for cybersecurity educational purposes and steganographic research. Stego images generated must be stored in lossless formats (PNG) because lossy compression (JPEG, WEBP) will destroy hidden LSB data bits.

---

## 🤝 Contributing & License

Contributions, issues, and feature requests are welcome!
Licensed under the Educational / MIT License.
