"""
StegoVault - LSB (Least Significant Bit) Steganography Engine

Supports three modes:
  1. Text-in-Image  — Hide secret text inside an image (LSB)
  2. Image-in-Image — Hide a secret image inside a cover image (LSB)
  3. Text-in-Text   — Hide secret text inside cover text (zero-width chars)

Payload format (image-based):
  [MAGIC_HEADER (8 bytes)] [TYPE (1 byte)] [DATA_LENGTH (32 bits)] [DATA_BITS ...]

Type byte:
  0x01 = text payload
  0x02 = image payload (PNG-compressed bytes)
"""

from PIL import Image
import struct
import io
import zlib

# ── Constants ──────────────────────────────────────────────────────────
MAGIC_HEADER = b"STGV1337"          # 8 bytes - unique signature
TYPE_TEXT  = 0x01
TYPE_IMAGE = 0x02
HEADER_BIT_LEN = len(MAGIC_HEADER) * 8   # 64 bits for magic
TYPE_BITS  = 8                            # 1 byte for type
LENGTH_BITS = 32                          # 4 bytes = max ~4 GB
OVERHEAD_BITS = HEADER_BIT_LEN + TYPE_BITS + LENGTH_BITS  # 104 bits

# Zero-width characters for text-in-text steganography
ZW_SPACE   = '\u200b'  # Zero-Width Space   = 0
ZW_JOINER  = '\u200c'  # Zero-Width Non-Joiner = 1
ZW_MARKER  = '\u200d'  # Zero-Width Joiner  = delimiter (start/end marker)
ZW_FEFF    = '\ufeff'  # BOM / Zero-Width No-Break Space = byte separator


# ── Helpers ────────────────────────────────────────────────────────────

def _bytes_to_bits(data: bytes) -> str:
    """Convert raw bytes to a binary string."""
    return "".join(format(byte, "08b") for byte in data)


def _bits_to_bytes(bits: str) -> bytes:
    """Convert a binary string back to bytes."""
    return bytes(int(bits[i:i + 8], 2) for i in range(0, len(bits), 8))


# ═══════════════════════════════════════════════════════════════════════
# TEXT-IN-IMAGE Steganography
# ═══════════════════════════════════════════════════════════════════════

def calculate_capacity(image: Image.Image) -> int:
    """
    Return the maximum number of *bytes* that can be hidden
    in the given image (after subtracting header overhead).
    """
    width, height = image.size
    total_bits = width * height * 3
    available_bits = total_bits - OVERHEAD_BITS
    if available_bits <= 0:
        return 0
    return available_bits // 8


def _embed_payload(image: Image.Image, payload_type: int, data: bytes) -> Image.Image:
    """
    Generic LSB embedding: hides raw bytes into an image.
    Used by both text-in-image and image-in-image.
    """
    img = image.convert("RGB")
    pixels = list(img.getdata())
    width, height = img.size
    total_bits = width * height * 3

    type_byte = struct.pack("B", payload_type)
    length_bytes = struct.pack(">I", len(data))

    payload_bits = (
        _bytes_to_bits(MAGIC_HEADER)
        + _bytes_to_bits(type_byte)
        + _bytes_to_bits(length_bytes)
        + _bytes_to_bits(data)
    )

    if len(payload_bits) > total_bits:
        capacity = (total_bits - OVERHEAD_BITS) // 8
        raise ValueError(
            f"Payload too large for this image. "
            f"Need {len(data):,} bytes but capacity is {capacity:,} bytes."
        )

    bit_index = 0
    new_pixels = []
    for pixel in pixels:
        new_channels = []
        for channel in pixel[:3]:
            if bit_index < len(payload_bits):
                new_channel = (channel & 0xFE) | int(payload_bits[bit_index])
                new_channels.append(new_channel)
                bit_index += 1
            else:
                new_channels.append(channel)
        new_pixels.append(tuple(new_channels))

    stego = Image.new("RGB", (width, height))
    stego.putdata(new_pixels)
    return stego


def _extract_payload(image: Image.Image) -> tuple:
    """
    Generic LSB extraction. Returns (payload_type: int, data: bytes).
    """
    img = image.convert("RGB")
    pixels = list(img.getdata())

    all_bits = []
    for pixel in pixels:
        for channel in pixel[:3]:
            all_bits.append(str(channel & 1))
    all_bits_str = "".join(all_bits)

    if len(all_bits_str) < OVERHEAD_BITS:
        raise ValueError("Image is too small to contain hidden data.")

    # Verify magic header
    header_bits = all_bits_str[:HEADER_BIT_LEN]
    header_bytes = _bits_to_bytes(header_bits)
    if header_bytes != MAGIC_HEADER:
        raise ValueError("No hidden data found in this image.")

    # Read type
    type_start = HEADER_BIT_LEN
    type_bits = all_bits_str[type_start:type_start + TYPE_BITS]
    payload_type = struct.unpack("B", _bits_to_bytes(type_bits))[0]

    # Read length
    len_start = type_start + TYPE_BITS
    length_bits = all_bits_str[len_start:len_start + LENGTH_BITS]
    data_len = struct.unpack(">I", _bits_to_bytes(length_bits))[0]

    if data_len == 0:
        raise ValueError("Hidden data is empty.")

    data_bit_count = data_len * 8
    data_start = OVERHEAD_BITS
    data_end = data_start + data_bit_count

    if data_end > len(all_bits_str):
        raise ValueError("Image data is corrupted — data length exceeds capacity.")

    data_bits = all_bits_str[data_start:data_end]
    data = _bits_to_bytes(data_bits)

    return payload_type, data


def encode(image: Image.Image, message: str) -> Image.Image:
    """Hide text inside an image using LSB steganography."""
    if not message:
        raise ValueError("Message cannot be empty.")
    msg_bytes = message.encode("utf-8")
    return _embed_payload(image, TYPE_TEXT, msg_bytes)


def decode(image: Image.Image) -> str:
    """Extract hidden text from a stego image."""
    payload_type, data = _extract_payload(image)
    if payload_type != TYPE_TEXT:
        raise ValueError("This image contains a hidden image, not text. Use image decode mode.")
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        raise ValueError("Failed to decode hidden data — file may be corrupted.")


# ═══════════════════════════════════════════════════════════════════════
# IMAGE-IN-IMAGE Steganography
# ═══════════════════════════════════════════════════════════════════════

def encode_image_in_image(cover: Image.Image, secret: Image.Image) -> Image.Image:
    """
    Hide a secret image inside a cover image using LSB.
    The secret image is PNG-compressed then embedded as raw bytes.
    """
    # Compress the secret image to PNG bytes
    buf = io.BytesIO()
    secret.save(buf, format="PNG", optimize=True)
    secret_bytes = buf.getvalue()

    # Further compress with zlib
    compressed = zlib.compress(secret_bytes, 9)

    return _embed_payload(cover, TYPE_IMAGE, compressed)


def decode_image_from_image(image: Image.Image) -> Image.Image:
    """
    Extract a hidden image from a stego image.
    Returns the secret image as a PIL Image.
    """
    payload_type, data = _extract_payload(image)
    if payload_type != TYPE_IMAGE:
        raise ValueError("This image contains hidden text, not an image. Use text decode mode.")

    try:
        decompressed = zlib.decompress(data)
        return Image.open(io.BytesIO(decompressed))
    except Exception:
        raise ValueError("Failed to extract hidden image — data may be corrupted.")


# ═══════════════════════════════════════════════════════════════════════
# TEXT-IN-TEXT Steganography (Zero-Width Characters)
# ═══════════════════════════════════════════════════════════════════════

def encode_text_in_text(cover_text: str, secret_message: str) -> str:
    """
    Hide secret_message inside cover_text using zero-width characters.

    Each bit of the secret is encoded as:
      0 → Zero-Width Space (U+200B)
      1 → Zero-Width Non-Joiner (U+200C)

    The hidden payload is inserted after the first word of the cover text,
    wrapped in ZW_MARKER delimiters.
    """
    if not cover_text.strip():
        raise ValueError("Cover text cannot be empty.")
    if not secret_message.strip():
        raise ValueError("Secret message cannot be empty.")

    secret_bytes = secret_message.encode("utf-8")
    # Encode length (4 bytes) + message
    length_bytes = struct.pack(">I", len(secret_bytes))
    full_payload = length_bytes + secret_bytes

    # Convert to zero-width characters
    zw_chars = [ZW_MARKER]  # start marker
    for byte in full_payload:
        bits = format(byte, "08b")
        for bit in bits:
            zw_chars.append(ZW_SPACE if bit == '0' else ZW_JOINER)
        zw_chars.append(ZW_FEFF)  # byte separator
    zw_chars.append(ZW_MARKER)  # end marker

    zw_string = "".join(zw_chars)

    # Insert after the first character of cover text
    if len(cover_text) > 1:
        return cover_text[0] + zw_string + cover_text[1:]
    else:
        return cover_text + zw_string


def decode_text_from_text(stego_text: str) -> str:
    """
    Extract the hidden secret message from stego text containing
    zero-width characters.
    """
    # Find the markers
    start = stego_text.find(ZW_MARKER)
    if start == -1:
        raise ValueError("No hidden message found in this text.")

    end = stego_text.find(ZW_MARKER, start + 1)
    if end == -1:
        raise ValueError("Corrupted hidden data — missing end marker.")

    # Extract the zero-width payload between markers
    zw_payload = stego_text[start + 1:end]

    if not zw_payload:
        raise ValueError("Hidden message is empty.")

    # Split by byte separator and decode
    byte_groups = zw_payload.split(ZW_FEFF)
    raw_bytes = []

    for group in byte_groups:
        if not group:
            continue
        bits = ""
        for ch in group:
            if ch == ZW_SPACE:
                bits += "0"
            elif ch == ZW_JOINER:
                bits += "1"
        if len(bits) == 8:
            raw_bytes.append(int(bits, 2))

    if len(raw_bytes) < 4:
        raise ValueError("Corrupted data — too short.")

    # First 4 bytes = length
    data = bytes(raw_bytes)
    msg_len = struct.unpack(">I", data[:4])[0]
    msg_data = data[4:4 + msg_len]

    if len(msg_data) < msg_len:
        raise ValueError("Corrupted data — message truncated.")

    try:
        return msg_data.decode("utf-8")
    except UnicodeDecodeError:
        raise ValueError("Failed to decode hidden text — data may be corrupted.")
