/**
 * StegoVault — Client-Side Steganography Engine
 *
 * Pure JavaScript implementation of LSB steganography.
 * No backend required — all processing happens in the browser.
 *
 * Modes:
 *   1. Text-in-Image  (LSB encoding)
 *   2. Image-in-Image (LSB encoding + pako compression)
 *   3. Text-in-Text   (Zero-width Unicode characters)
 *
 * Payload format (image-based):
 *   [MAGIC_HEADER 8B] [TYPE 1B] [DATA_LENGTH 4B] [DATA ...]
 */

const StegoEngine = (() => {

  // ── Constants ─────────────────────────────────────────────────────
  const MAGIC = [0x53, 0x54, 0x47, 0x56, 0x31, 0x33, 0x33, 0x37]; // "STGV1337"
  const TYPE_TEXT  = 0x01;
  const TYPE_IMAGE = 0x02;
  const HEADER_BITS  = MAGIC.length * 8;   // 64
  const TYPE_BITS    = 8;
  const LENGTH_BITS  = 32;
  const OVERHEAD_BITS = HEADER_BITS + TYPE_BITS + LENGTH_BITS; // 104

  const ZW_SPACE  = '\u200b';
  const ZW_JOINER = '\u200c';
  const ZW_MARKER = '\u200d';
  const ZW_FEFF   = '\ufeff';

  // ── Helpers ───────────────────────────────────────────────────────

  function bytesToBits(bytes) {
    let bits = '';
    for (let i = 0; i < bytes.length; i++) {
      bits += bytes[i].toString(2).padStart(8, '0');
    }
    return bits;
  }

  function bitsToBytes(bits) {
    const bytes = new Uint8Array(bits.length / 8);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(bits.substring(i * 8, i * 8 + 8), 2);
    }
    return bytes;
  }

  function uint32ToBytes(n) {
    return new Uint8Array([
      (n >>> 24) & 0xFF,
      (n >>> 16) & 0xFF,
      (n >>> 8) & 0xFF,
      n & 0xFF
    ]);
  }

  function bytesToUint32(bytes, offset) {
    return (bytes[offset] << 24 | bytes[offset+1] << 16 | bytes[offset+2] << 8 | bytes[offset+3]) >>> 0;
  }

  /**
   * Load an image file into a canvas and return its ImageData.
   */
  function loadImageData(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve({ imageData, width: img.width, height: img.height, canvas, ctx });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Convert canvas to a downloadable Blob (PNG).
   */
  function canvasToBlob(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
  }

  /**
   * Convert a File (image) to PNG Uint8Array via canvas round-trip.
   */
  function fileToPNGBytes(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          blob.arrayBuffer().then(buf => {
            resolve(new Uint8Array(buf));
            URL.revokeObjectURL(img.src);
          });
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('Failed to load secret image.'));
      img.src = URL.createObjectURL(file);
    });
  }


  // ═══════════════════════════════════════════════════════════════════
  // GENERIC LSB EMBED / EXTRACT
  // ═══════════════════════════════════════════════════════════════════

  function embedPayload(imageData, width, height, payloadType, dataBytes) {
    const totalBits = width * height * 3;

    const typeArr = new Uint8Array([payloadType]);
    const lengthArr = uint32ToBytes(dataBytes.length);

    const payloadBits =
      bytesToBits(new Uint8Array(MAGIC)) +
      bytesToBits(typeArr) +
      bytesToBits(lengthArr) +
      bytesToBits(dataBytes);

    if (payloadBits.length > totalBits) {
      const capacity = Math.floor((totalBits - OVERHEAD_BITS) / 8);
      throw new Error(
        `Payload too large. Need ${dataBytes.length.toLocaleString()} bytes but capacity is ${capacity.toLocaleString()} bytes.`
      );
    }

    const pixels = new Uint8ClampedArray(imageData.data);
    let bitIdx = 0;

    for (let i = 0; i < pixels.length; i++) {
      if (i % 4 === 3) continue; // skip alpha
      if (bitIdx < payloadBits.length) {
        pixels[i] = (pixels[i] & 0xFE) | parseInt(payloadBits[bitIdx]);
        bitIdx++;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const newImageData = new ImageData(pixels, width, height);
    ctx.putImageData(newImageData, 0, 0);
    return canvas;
  }

  function extractPayload(imageData, width, height) {
    const pixels = imageData.data;
    const allBits = [];

    for (let i = 0; i < pixels.length; i++) {
      if (i % 4 === 3) continue; // skip alpha
      allBits.push(pixels[i] & 1);
    }

    if (allBits.length < OVERHEAD_BITS) {
      throw new Error('Image is too small to contain hidden data.');
    }

    // Verify magic header
    const headerBits = allBits.slice(0, HEADER_BITS).join('');
    const headerBytes = bitsToBytes(headerBits);
    for (let i = 0; i < MAGIC.length; i++) {
      if (headerBytes[i] !== MAGIC[i]) {
        throw new Error('No hidden data found in this image.');
      }
    }

    // Read type
    const typeBits = allBits.slice(HEADER_BITS, HEADER_BITS + TYPE_BITS).join('');
    const payloadType = parseInt(typeBits, 2);

    // Read length
    const lenBits = allBits.slice(HEADER_BITS + TYPE_BITS, OVERHEAD_BITS).join('');
    const dataLen = parseInt(lenBits, 2) >>> 0;

    if (dataLen === 0) throw new Error('Hidden data is empty.');

    const dataBitCount = dataLen * 8;
    const dataEnd = OVERHEAD_BITS + dataBitCount;

    if (dataEnd > allBits.length) {
      throw new Error('Image data is corrupted — data length exceeds capacity.');
    }

    const dataBits = allBits.slice(OVERHEAD_BITS, dataEnd).join('');
    const data = bitsToBytes(dataBits);

    return { type: payloadType, data };
  }


  // ═══════════════════════════════════════════════════════════════════
  // PUBLIC: Text-in-Image
  // ═══════════════════════════════════════════════════════════════════

  function calculateCapacity(width, height) {
    const totalBits = width * height * 3;
    const available = totalBits - OVERHEAD_BITS;
    return available > 0 ? Math.floor(available / 8) : 0;
  }

  async function encodeTextInImage(file, message) {
    if (!message) throw new Error('Message cannot be empty.');
    const { imageData, width, height } = await loadImageData(file);
    const msgBytes = new TextEncoder().encode(message);
    const canvas = embedPayload(imageData, width, height, TYPE_TEXT, msgBytes);
    return await canvasToBlob(canvas);
  }

  async function decodeTextFromImage(file) {
    const { imageData, width, height } = await loadImageData(file);
    const { type, data } = extractPayload(imageData, width, height);
    if (type !== TYPE_TEXT) {
      throw new Error('This image contains a hidden image, not text. Use Image Extract mode.');
    }
    const text = new TextDecoder().decode(data);
    return { message: text, byteSize: data.length };
  }


  // ═══════════════════════════════════════════════════════════════════
  // PUBLIC: Image-in-Image
  // ═══════════════════════════════════════════════════════════════════

  async function encodeImageInImage(coverFile, secretFile) {
    const { imageData, width, height } = await loadImageData(coverFile);
    const secretPNG = await fileToPNGBytes(secretFile);

    // Compress with pako if available, otherwise use raw PNG bytes
    let compressed;
    if (typeof pako !== 'undefined') {
      compressed = pako.deflate(secretPNG, { level: 9 });
    } else {
      compressed = secretPNG;
    }

    const canvas = embedPayload(imageData, width, height, TYPE_IMAGE, compressed);
    return await canvasToBlob(canvas);
  }

  async function decodeImageFromImage(file) {
    const { imageData, width, height } = await loadImageData(file);
    const { type, data } = extractPayload(imageData, width, height);
    if (type !== TYPE_IMAGE) {
      throw new Error('This image contains hidden text, not an image. Use Text Extract mode.');
    }

    let pngBytes;
    try {
      if (typeof pako !== 'undefined') {
        pngBytes = pako.inflate(data);
      } else {
        pngBytes = data;
      }
    } catch {
      throw new Error('Failed to decompress hidden image — data may be corrupted.');
    }

    const blob = new Blob([pngBytes], { type: 'image/png' });
    return blob;
  }


  // ═══════════════════════════════════════════════════════════════════
  // PUBLIC: Text-in-Text (Zero-Width Characters)
  // ═══════════════════════════════════════════════════════════════════

  function encodeTextInText(coverText, secretMessage) {
    if (!coverText.trim()) throw new Error('Cover text cannot be empty.');
    if (!secretMessage.trim()) throw new Error('Secret message cannot be empty.');

    const secretBytes = new TextEncoder().encode(secretMessage);
    const lengthArr = uint32ToBytes(secretBytes.length);

    // Build full payload: length (4 bytes) + secret bytes
    const fullPayload = new Uint8Array(4 + secretBytes.length);
    fullPayload.set(lengthArr, 0);
    fullPayload.set(secretBytes, 4);

    // Convert to zero-width characters
    let zwStr = ZW_MARKER;
    for (let i = 0; i < fullPayload.length; i++) {
      const bits = fullPayload[i].toString(2).padStart(8, '0');
      for (const bit of bits) {
        zwStr += bit === '0' ? ZW_SPACE : ZW_JOINER;
      }
      zwStr += ZW_FEFF;
    }
    zwStr += ZW_MARKER;

    if (coverText.length > 1) {
      return {
        stegoText: coverText[0] + zwStr + coverText.slice(1),
        hiddenBytes: secretBytes.length,
        visibleLength: coverText.length
      };
    }
    return {
      stegoText: coverText + zwStr,
      hiddenBytes: secretBytes.length,
      visibleLength: coverText.length
    };
  }

  function decodeTextFromText(stegoText) {
    const start = stegoText.indexOf(ZW_MARKER);
    if (start === -1) throw new Error('No hidden message found in this text.');

    const end = stegoText.indexOf(ZW_MARKER, start + 1);
    if (end === -1) throw new Error('Corrupted hidden data — missing end marker.');

    const zwPayload = stegoText.substring(start + 1, end);
    if (!zwPayload) throw new Error('Hidden message is empty.');

    const byteGroups = zwPayload.split(ZW_FEFF);
    const rawBytes = [];

    for (const group of byteGroups) {
      if (!group) continue;
      let bits = '';
      for (const ch of group) {
        if (ch === ZW_SPACE) bits += '0';
        else if (ch === ZW_JOINER) bits += '1';
      }
      if (bits.length === 8) {
        rawBytes.push(parseInt(bits, 2));
      }
    }

    if (rawBytes.length < 4) throw new Error('Corrupted data — too short.');

    const data = new Uint8Array(rawBytes);
    const msgLen = bytesToUint32(data, 0);
    const msgData = data.slice(4, 4 + msgLen);

    if (msgData.length < msgLen) throw new Error('Corrupted data — message truncated.');

    return {
      message: new TextDecoder().decode(msgData),
      byteSize: msgData.length
    };
  }


  // ═══════════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════════
  return {
    calculateCapacity,
    encodeTextInImage,
    decodeTextFromImage,
    encodeImageInImage,
    decodeImageFromImage,
    encodeTextInText,
    decodeTextFromText
  };

})();
