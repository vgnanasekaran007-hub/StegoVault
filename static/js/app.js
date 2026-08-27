/**
 * StegoVault — Frontend Application Logic v3.0 (Client-Side Only)
 *
 * All steganography processing runs directly in the browser.
 * No backend / API calls required. Uses StegoEngine from stego.js.
 *
 * Handles:
 *  - Sidebar navigation (open/close)
 *  - Text-in-Image encode/decode  (Canvas + LSB)
 *  - Image-in-Image encode/decode (Canvas + LSB + pako)
 *  - Text-in-Text encode/decode   (Zero-width chars)
 *  - Drag & drop, previews, capacity tracking
 *  - Toast notifications, loading states
 *  - Copy and download actions
 */

// ═══════════════════════════════════════════════════════════════════════
// DOM References
// ═══════════════════════════════════════════════════════════════════════

// ── Sidebar ──
const sidebar        = document.getElementById("sidebar");
const sidebarToggle  = document.getElementById("sidebar-toggle");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const sidebarLinks   = document.querySelectorAll(".sidebar-link");

// ── Text-in-Image Encode ──
const encodeDropzone        = document.getElementById("encode-dropzone");
const encodeFileInput       = document.getElementById("encode-file-input");
const encodeDropzoneContent = document.getElementById("encode-dropzone-content");
const encodePreviewWrap     = document.getElementById("encode-preview-wrap");
const encodePreview         = document.getElementById("encode-preview");
const encodeRemoveBtn       = document.getElementById("encode-remove-btn");
const encodeFileInfo        = document.getElementById("encode-file-info");
const encodeFileName        = document.getElementById("encode-file-name");
const encodeFileSize        = document.getElementById("encode-file-size");
const encodeCapacityWrap    = document.getElementById("encode-capacity-wrap");
const encodeUsedBytes       = document.getElementById("encode-used-bytes");
const encodeMaxBytes        = document.getElementById("encode-max-bytes");
const encodeCapacityFill    = document.getElementById("encode-capacity-fill");
const encodeMessage         = document.getElementById("encode-message");
const encodeCharCount       = document.getElementById("encode-char-count");
const encodeByteCount       = document.getElementById("encode-byte-count");
const encodeBtn             = document.getElementById("encode-btn");
const encodeBtnText         = document.getElementById("encode-btn-text");
const encodeSpinner         = document.getElementById("encode-spinner");

// ── Text-in-Image Decode ──
const decodeDropzone        = document.getElementById("decode-dropzone");
const decodeFileInput       = document.getElementById("decode-file-input");
const decodeDropzoneContent = document.getElementById("decode-dropzone-content");
const decodePreviewWrap     = document.getElementById("decode-preview-wrap");
const decodePreview         = document.getElementById("decode-preview");
const decodeRemoveBtn       = document.getElementById("decode-remove-btn");
const decodeFileInfo        = document.getElementById("decode-file-info");
const decodeFileName        = document.getElementById("decode-file-name");
const decodeFileSize        = document.getElementById("decode-file-size");
const decodePlaceholder     = document.getElementById("decode-placeholder");
const decodeResultText      = document.getElementById("decode-result-text");
const decodeResultActions   = document.getElementById("decode-result-actions");
const decodeCopyBtn         = document.getElementById("decode-copy-btn");
const decodeDownloadBtn     = document.getElementById("decode-download-btn");
const decodeBtn             = document.getElementById("decode-btn");
const decodeBtnText         = document.getElementById("decode-btn-text");
const decodeSpinner         = document.getElementById("decode-spinner");

// ── Image-in-Image Encode ──
const imgCoverDropzone  = document.getElementById("img-cover-dropzone");
const imgCoverInput     = document.getElementById("img-cover-input");
const imgCoverContent   = document.getElementById("img-cover-content");
const imgCoverPreviewW  = document.getElementById("img-cover-preview-wrap");
const imgCoverPreview   = document.getElementById("img-cover-preview");
const imgCoverRemove    = document.getElementById("img-cover-remove");
const imgCoverInfo      = document.getElementById("img-cover-info");
const imgCoverName      = document.getElementById("img-cover-name");
const imgCoverSize      = document.getElementById("img-cover-size");
const imgSecretDropzone = document.getElementById("img-secret-dropzone");
const imgSecretInput    = document.getElementById("img-secret-input");
const imgSecretContent  = document.getElementById("img-secret-content");
const imgSecretPreviewW = document.getElementById("img-secret-preview-wrap");
const imgSecretPreview  = document.getElementById("img-secret-preview");
const imgSecretRemove   = document.getElementById("img-secret-remove");
const imgSecretInfo     = document.getElementById("img-secret-info");
const imgSecretName     = document.getElementById("img-secret-name");
const imgSecretSize     = document.getElementById("img-secret-size");
const imgEncodeBtn      = document.getElementById("img-encode-btn");
const imgEncodeBtnText  = document.getElementById("img-encode-btn-text");
const imgEncodeSpinner  = document.getElementById("img-encode-spinner");

// ── Image-in-Image Decode ──
const imgdDropzone      = document.getElementById("imgd-dropzone");
const imgdFileInput     = document.getElementById("imgd-file-input");
const imgdContent       = document.getElementById("imgd-dropzone-content");
const imgdPreviewWrap   = document.getElementById("imgd-preview-wrap");
const imgdPreview       = document.getElementById("imgd-preview");
const imgdRemoveBtn     = document.getElementById("imgd-remove-btn");
const imgdFileInfo      = document.getElementById("imgd-file-info");
const imgdFileName      = document.getElementById("imgd-file-name");
const imgdFileSize      = document.getElementById("imgd-file-size");
const imgdPlaceholder   = document.getElementById("imgd-placeholder");
const imgdResultImg     = document.getElementById("imgd-result-img");
const imgdResultActions = document.getElementById("imgd-result-actions");
const imgdDownloadBtn   = document.getElementById("imgd-download-btn");
const imgdDecodeBtn     = document.getElementById("imgd-decode-btn");
const imgdDecodeBtnText = document.getElementById("imgd-decode-btn-text");
const imgdDecodeSpinner = document.getElementById("imgd-decode-spinner");

// ── Text-in-Text Encode ──
const txtCoverInput     = document.getElementById("txt-cover-input");
const txtSecretInput    = document.getElementById("txt-secret-input");
const txtEncodePlc      = document.getElementById("txt-encode-placeholder");
const txtEncodeResult   = document.getElementById("txt-encode-result");
const txtEncodeActions  = document.getElementById("txt-encode-actions");
const txtEncodeCopy     = document.getElementById("txt-encode-copy");
const txtEncodeBtn      = document.getElementById("txt-encode-btn");
const txtEncodeBtnText  = document.getElementById("txt-encode-btn-text");
const txtEncodeSpinner  = document.getElementById("txt-encode-spinner");

// ── Text-in-Text Decode ──
const txtDecodeInput    = document.getElementById("txt-decode-input");
const txtDecodePlc      = document.getElementById("txt-decode-placeholder");
const txtDecodeResult   = document.getElementById("txt-decode-result");
const txtDecodeActions  = document.getElementById("txt-decode-actions");
const txtDecodeCopy     = document.getElementById("txt-decode-copy");
const txtDecodeBtn      = document.getElementById("txt-decode-btn");
const txtDecodeBtnText  = document.getElementById("txt-decode-btn-text");
const txtDecodeSpinner  = document.getElementById("txt-decode-spinner");

// ── Toast ──
const toastContainer = document.getElementById("toast-container");


// ═══════════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════════
let encodeFile     = null;
let encodeCapacity = 0;
let decodeFile     = null;
let imgCoverFile   = null;
let imgSecretFile  = null;
let imgdFile       = null;


// ═══════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function byteLength(str) { return new TextEncoder().encode(str).length; }

function isValidImage(file) {
  return ["image/png", "image/jpeg", "image/jpg"].includes(file.type);
}


// ═══════════════════════════════════════════════════════════════════════
// Toast Notifications
// ═══════════════════════════════════════════════════════════════════════

function showToast(message, type = "info") {
  const icons = { success: "✅", error: "❌", info: "💡" };
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, 4000);
}


// ═══════════════════════════════════════════════════════════════════════
// Sidebar Navigation
// ═══════════════════════════════════════════════════════════════════════

function toggleSidebar() {
  const isOpen = sidebar.classList.toggle("open");
  sidebarOverlay.classList.toggle("active", isOpen);
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("active");
}

sidebarToggle.addEventListener("click", toggleSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);

sidebarLinks.forEach(link => {
  link.addEventListener("click", () => {
    if (window.innerWidth < 1024) closeSidebar();
  });
});

// Active link tracking on scroll
window.addEventListener("scroll", () => {
  const scrollY = window.scrollY + 120;
  const heroSec = document.getElementById("hero");
  const imgStegSec = document.getElementById("image-steg");
  const txtStegSec = document.getElementById("text-steg");
  if (!heroSec || !imgStegSec || !txtStegSec) return;

  const heroTop = heroSec.offsetTop - 80;
  const heroBottom = heroTop + heroSec.offsetHeight;
  const imgStegTop = imgStegSec.offsetTop - 80;
  const imgStegBottom = imgStegTop + imgStegSec.offsetHeight;
  const txtStegTop = txtStegSec.offsetTop - 80;
  const txtStegBottom = txtStegTop + txtStegSec.offsetHeight;

  const encodeSecs = ["text-encode", "img-encode", "txt-encode"].map(id => document.getElementById(id));
  let isEncodingActive = false;
  encodeSecs.forEach(sec => { if (!sec) return; const t = sec.offsetTop - 80; if (scrollY >= t && scrollY < t + sec.offsetHeight) isEncodingActive = true; });

  const decodeSecs = ["text-decode", "img-decode", "txt-decode"].map(id => document.getElementById(id));
  let isDecodingActive = false;
  decodeSecs.forEach(sec => { if (!sec) return; const t = sec.offsetTop - 80; if (scrollY >= t && scrollY < t + sec.offsetHeight) isDecodingActive = true; });

  sidebarLinks.forEach(link => {
    const s = link.getAttribute("data-section");
    if (s === "hero") link.classList.toggle("active", scrollY >= heroTop && scrollY < heroBottom);
    else if (s === "image-steg") link.classList.toggle("active", scrollY >= imgStegTop && scrollY < imgStegBottom);
    else if (s === "text-steg") link.classList.toggle("active", scrollY >= txtStegTop && scrollY < txtStegBottom);
    else if (s === "hide-data") link.classList.toggle("active", isEncodingActive);
    else if (s === "extract-data") link.classList.toggle("active", isDecodingActive);
  });
});

// Smooth scroll for all anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", (e) => {
    const target = document.querySelector(anchor.getAttribute("href"));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: "smooth" }); }
  });
});


// ═══════════════════════════════════════════════════════════════════════
// Generic Dropzone Setup
// ═══════════════════════════════════════════════════════════════════════

function setupDropzone(dropzone, fileInput, onFile) {
  dropzone.addEventListener("click", (e) => { if (e.target.closest(".preview-remove")) return; fileInput.click(); });
  fileInput.addEventListener("change", () => { if (fileInput.files.length) onFile(fileInput.files[0]); });
  dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("drag-over"); });
  dropzone.addEventListener("dragleave", () => { dropzone.classList.remove("drag-over"); });
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault(); dropzone.classList.remove("drag-over");
    if (e.dataTransfer.files.length) onFile(e.dataTransfer.files[0]);
  });
}

function calcCapacityFromFile(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(StegoEngine.calculateCapacity(img.width, img.height));
    };
    img.onerror = () => resolve(0);
    img.src = URL.createObjectURL(file);
  });
}

function validateFile(file) {
  if (!isValidImage(file)) { showToast("Please upload a PNG, JPG, or JPEG image.", "error"); return false; }
  if (file.size > 20 * 1024 * 1024) { showToast("File too large. Max 20 MB.", "error"); return false; }
  return true;
}


// ═══════════════════════════════════════════════════════════════════════
// TEXT-IN-IMAGE ENCODE (Client-Side)
// ═══════════════════════════════════════════════════════════════════════

function handleEncodeFile(file) {
  if (!validateFile(file)) return;
  encodeFile = file;
  encodePreview.src = URL.createObjectURL(file);
  encodeDropzoneContent.classList.add("hidden");
  encodePreviewWrap.classList.remove("hidden");
  encodeFileName.textContent = file.name;
  encodeFileSize.textContent = formatBytes(file.size);
  encodeFileInfo.classList.remove("hidden");
  calcCapacityFromFile(file).then((cap) => {
    encodeCapacity = cap;
    encodeMaxBytes.textContent = cap.toLocaleString();
    encodeCapacityWrap.classList.remove("hidden");
    updateEncodeState();
  });
}

function removeEncodeFile() {
  encodeFile = null; encodeCapacity = 0;
  encodePreview.src = "";
  encodeDropzoneContent.classList.remove("hidden");
  encodePreviewWrap.classList.add("hidden");
  encodeFileInfo.classList.add("hidden");
  encodeCapacityWrap.classList.add("hidden");
  encodeFileInput.value = "";
  updateEncodeState();
}

function updateEncodeState() {
  const msg = encodeMessage.value;
  const bytes = byteLength(msg);
  encodeCharCount.textContent = msg.length.toLocaleString();
  encodeByteCount.textContent = bytes.toLocaleString();
  encodeUsedBytes.textContent = bytes.toLocaleString();
  if (encodeCapacity > 0) {
    const pct = Math.min((bytes / encodeCapacity) * 100, 100);
    encodeCapacityFill.style.width = pct + "%";
    encodeCapacityFill.classList.toggle("warn", pct > 90);
  }
  encodeBtn.disabled = !(encodeFile && msg.trim().length > 0 && bytes <= encodeCapacity);
}

setupDropzone(encodeDropzone, encodeFileInput, handleEncodeFile);
encodeRemoveBtn.addEventListener("click", (e) => { e.stopPropagation(); removeEncodeFile(); });
encodeMessage.addEventListener("input", updateEncodeState);

encodeBtn.addEventListener("click", async () => {
  if (!encodeFile || !encodeMessage.value.trim()) return;
  encodeBtn.disabled = true;
  encodeBtnText.textContent = "Encoding…";
  encodeSpinner.classList.remove("hidden");

  try {
    const blob = await StegoEngine.encodeTextInImage(encodeFile, encodeMessage.value);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stegovault_encoded.png";
    document.body.appendChild(a); a.click(); a.remove();
    showToast("Message hidden! Downloading stego image…", "success");
  } catch (err) { showToast(err.message, "error"); }
  finally { encodeBtnText.textContent = "Hide Message"; encodeSpinner.classList.add("hidden"); updateEncodeState(); }
});


// ═══════════════════════════════════════════════════════════════════════
// TEXT-IN-IMAGE DECODE (Client-Side)
// ═══════════════════════════════════════════════════════════════════════

function handleDecodeFile(file) {
  if (!validateFile(file)) return;
  decodeFile = file;
  decodePreview.src = URL.createObjectURL(file);
  decodeDropzoneContent.classList.add("hidden");
  decodePreviewWrap.classList.remove("hidden");
  decodeFileName.textContent = file.name;
  decodeFileSize.textContent = formatBytes(file.size);
  decodeFileInfo.classList.remove("hidden");
  decodePlaceholder.classList.remove("hidden");
  decodeResultText.classList.add("hidden");
  decodeResultActions.classList.add("hidden");
  decodeBtn.disabled = false;
}

function removeDecodeFile() {
  decodeFile = null; decodePreview.src = "";
  decodeDropzoneContent.classList.remove("hidden");
  decodePreviewWrap.classList.add("hidden");
  decodeFileInfo.classList.add("hidden");
  decodeFileInput.value = ""; decodeBtn.disabled = true;
  decodePlaceholder.classList.remove("hidden");
  decodeResultText.classList.add("hidden");
  decodeResultActions.classList.add("hidden");
}

setupDropzone(decodeDropzone, decodeFileInput, handleDecodeFile);
decodeRemoveBtn.addEventListener("click", (e) => { e.stopPropagation(); removeDecodeFile(); });

decodeBtn.addEventListener("click", async () => {
  if (!decodeFile) return;
  decodeBtn.disabled = true;
  decodeBtnText.textContent = "Decoding…";
  decodeSpinner.classList.remove("hidden");

  try {
    const { message, byteSize } = await StegoEngine.decodeTextFromImage(decodeFile);
    decodeResultText.textContent = message;
    decodePlaceholder.classList.add("hidden");
    decodeResultText.classList.remove("hidden");
    decodeResultActions.classList.remove("hidden");
    showToast(`Message extracted! (${byteSize} bytes)`, "success");
  } catch (err) {
    showToast(err.message, "error");
    decodePlaceholder.classList.remove("hidden");
    decodeResultText.classList.add("hidden");
    decodeResultActions.classList.add("hidden");
  } finally {
    decodeBtnText.textContent = "Reveal Message";
    decodeSpinner.classList.add("hidden");
    decodeBtn.disabled = !decodeFile;
  }
});

decodeCopyBtn.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(decodeResultText.textContent); showToast("Copied!", "success"); }
  catch { showToast("Copy failed", "error"); }
});

decodeDownloadBtn.addEventListener("click", () => {
  const blob = new Blob([decodeResultText.textContent], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "stegovault_decoded.txt";
  document.body.appendChild(a); a.click(); a.remove();
  showToast("Downloaded!", "success");
});


// ═══════════════════════════════════════════════════════════════════════
// IMAGE-IN-IMAGE ENCODE (Client-Side)
// ═══════════════════════════════════════════════════════════════════════

function handleImgCover(file) {
  if (!validateFile(file)) return;
  imgCoverFile = file;
  imgCoverPreview.src = URL.createObjectURL(file);
  imgCoverContent.classList.add("hidden");
  imgCoverPreviewW.classList.remove("hidden");
  imgCoverName.textContent = file.name;
  imgCoverSize.textContent = formatBytes(file.size);
  imgCoverInfo.classList.remove("hidden");
  updateImgEncodeState();
}
function removeImgCover() {
  imgCoverFile = null; imgCoverPreview.src = "";
  imgCoverContent.classList.remove("hidden");
  imgCoverPreviewW.classList.add("hidden");
  imgCoverInfo.classList.add("hidden");
  imgCoverInput.value = "";
  updateImgEncodeState();
}

function handleImgSecret(file) {
  if (!validateFile(file)) return;
  imgSecretFile = file;
  imgSecretPreview.src = URL.createObjectURL(file);
  imgSecretContent.classList.add("hidden");
  imgSecretPreviewW.classList.remove("hidden");
  imgSecretName.textContent = file.name;
  imgSecretSize.textContent = formatBytes(file.size);
  imgSecretInfo.classList.remove("hidden");
  updateImgEncodeState();
}
function removeImgSecret() {
  imgSecretFile = null; imgSecretPreview.src = "";
  imgSecretContent.classList.remove("hidden");
  imgSecretPreviewW.classList.add("hidden");
  imgSecretInfo.classList.add("hidden");
  imgSecretInput.value = "";
  updateImgEncodeState();
}

function updateImgEncodeState() {
  imgEncodeBtn.disabled = !(imgCoverFile && imgSecretFile);
}

setupDropzone(imgCoverDropzone, imgCoverInput, handleImgCover);
setupDropzone(imgSecretDropzone, imgSecretInput, handleImgSecret);
imgCoverRemove.addEventListener("click", (e) => { e.stopPropagation(); removeImgCover(); });
imgSecretRemove.addEventListener("click", (e) => { e.stopPropagation(); removeImgSecret(); });

imgEncodeBtn.addEventListener("click", async () => {
  if (!imgCoverFile || !imgSecretFile) return;
  imgEncodeBtn.disabled = true;
  imgEncodeBtnText.textContent = "Encoding…";
  imgEncodeSpinner.classList.remove("hidden");

  try {
    const blob = await StegoEngine.encodeImageInImage(imgCoverFile, imgSecretFile);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stegovault_image_encoded.png";
    document.body.appendChild(a); a.click(); a.remove();
    showToast("Image hidden! Downloading stego image…", "success");
  } catch (err) { showToast(err.message, "error"); }
  finally { imgEncodeBtnText.textContent = "Hide Image"; imgEncodeSpinner.classList.add("hidden"); updateImgEncodeState(); }
});


// ═══════════════════════════════════════════════════════════════════════
// IMAGE-IN-IMAGE DECODE (Client-Side)
// ═══════════════════════════════════════════════════════════════════════

let imgdBlobUrl = null;

function handleImgdFile(file) {
  if (!validateFile(file)) return;
  imgdFile = file;
  imgdPreview.src = URL.createObjectURL(file);
  imgdContent.classList.add("hidden");
  imgdPreviewWrap.classList.remove("hidden");
  imgdFileName.textContent = file.name;
  imgdFileSize.textContent = formatBytes(file.size);
  imgdFileInfo.classList.remove("hidden");
  imgdPlaceholder.classList.remove("hidden");
  imgdResultImg.classList.add("hidden");
  imgdResultActions.classList.add("hidden");
  imgdDecodeBtn.disabled = false;
}
function removeImgdFile() {
  imgdFile = null; imgdPreview.src = "";
  imgdContent.classList.remove("hidden");
  imgdPreviewWrap.classList.add("hidden");
  imgdFileInfo.classList.add("hidden");
  imgdFileInput.value = ""; imgdDecodeBtn.disabled = true;
  imgdPlaceholder.classList.remove("hidden");
  imgdResultImg.classList.add("hidden");
  imgdResultActions.classList.add("hidden");
}

setupDropzone(imgdDropzone, imgdFileInput, handleImgdFile);
imgdRemoveBtn.addEventListener("click", (e) => { e.stopPropagation(); removeImgdFile(); });

imgdDecodeBtn.addEventListener("click", async () => {
  if (!imgdFile) return;
  imgdDecodeBtn.disabled = true;
  imgdDecodeBtnText.textContent = "Decoding…";
  imgdDecodeSpinner.classList.remove("hidden");

  try {
    const blob = await StegoEngine.decodeImageFromImage(imgdFile);
    if (imgdBlobUrl) URL.revokeObjectURL(imgdBlobUrl);
    imgdBlobUrl = URL.createObjectURL(blob);
    imgdResultImg.src = imgdBlobUrl;
    imgdPlaceholder.classList.add("hidden");
    imgdResultImg.classList.remove("hidden");
    imgdResultActions.classList.remove("hidden");
    showToast("Hidden image extracted!", "success");
  } catch (err) {
    showToast(err.message, "error");
    imgdPlaceholder.classList.remove("hidden");
    imgdResultImg.classList.add("hidden");
    imgdResultActions.classList.add("hidden");
  } finally {
    imgdDecodeBtnText.textContent = "Reveal Image";
    imgdDecodeSpinner.classList.add("hidden");
    imgdDecodeBtn.disabled = !imgdFile;
  }
});

imgdDownloadBtn.addEventListener("click", () => {
  if (!imgdBlobUrl) return;
  const a = document.createElement("a");
  a.href = imgdBlobUrl;
  a.download = "stegovault_decoded_image.png";
  document.body.appendChild(a); a.click(); a.remove();
  showToast("Image downloaded!", "success");
});


// ═══════════════════════════════════════════════════════════════════════
// TEXT-IN-TEXT ENCODE (Client-Side)
// ═══════════════════════════════════════════════════════════════════════

function updateTxtEncodeState() {
  txtEncodeBtn.disabled = !(txtCoverInput.value.trim() && txtSecretInput.value.trim());
}

txtCoverInput.addEventListener("input", updateTxtEncodeState);
txtSecretInput.addEventListener("input", updateTxtEncodeState);

txtEncodeBtn.addEventListener("click", async () => {
  const cover = txtCoverInput.value;
  const secret = txtSecretInput.value;
  if (!cover.trim() || !secret.trim()) return;

  txtEncodeBtn.disabled = true;
  txtEncodeBtnText.textContent = "Encoding…";
  txtEncodeSpinner.classList.remove("hidden");

  try {
    const { stegoText, hiddenBytes } = StegoEngine.encodeTextInText(cover, secret);
    txtEncodeResult.textContent = stegoText;
    txtEncodePlc.classList.add("hidden");
    txtEncodeResult.classList.remove("hidden");
    txtEncodeActions.classList.remove("hidden");
    showToast(`Secret hidden in text! (${hiddenBytes} bytes)`, "success");
  } catch (err) { showToast(err.message, "error"); }
  finally {
    txtEncodeBtnText.textContent = "Hide in Text";
    txtEncodeSpinner.classList.add("hidden");
    updateTxtEncodeState();
  }
});

txtEncodeCopy.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(txtEncodeResult.textContent); showToast("Stego text copied!", "success"); }
  catch { showToast("Copy failed", "error"); }
});


// ═══════════════════════════════════════════════════════════════════════
// TEXT-IN-TEXT DECODE (Client-Side)
// ═══════════════════════════════════════════════════════════════════════

function updateTxtDecodeState() {
  txtDecodeBtn.disabled = !txtDecodeInput.value.trim();
}

txtDecodeInput.addEventListener("input", updateTxtDecodeState);

txtDecodeBtn.addEventListener("click", async () => {
  const text = txtDecodeInput.value;
  if (!text.trim()) return;

  txtDecodeBtn.disabled = true;
  txtDecodeBtnText.textContent = "Decoding…";
  txtDecodeSpinner.classList.remove("hidden");

  try {
    const { message, byteSize } = StegoEngine.decodeTextFromText(text);
    txtDecodeResult.textContent = message;
    txtDecodePlc.classList.add("hidden");
    txtDecodeResult.classList.remove("hidden");
    txtDecodeActions.classList.remove("hidden");
    showToast(`Secret extracted! (${byteSize} bytes)`, "success");
  } catch (err) {
    showToast(err.message, "error");
    txtDecodePlc.classList.remove("hidden");
    txtDecodeResult.classList.add("hidden");
    txtDecodeActions.classList.add("hidden");
  } finally {
    txtDecodeBtnText.textContent = "Reveal Message";
    txtDecodeSpinner.classList.add("hidden");
    updateTxtDecodeState();
  }
});

txtDecodeCopy.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(txtDecodeResult.textContent); showToast("Copied!", "success"); }
  catch { showToast("Copy failed", "error"); }
});
