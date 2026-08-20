"""
StegoVault v2 — Full test suite for all 3 steganography modes.
"""
import sys
sys.path.insert(0, ".")

from PIL import Image
from steganography.lsb import (
    encode, decode, calculate_capacity,
    encode_image_in_image, decode_image_from_image,
    encode_text_in_text, decode_text_from_text,
)

all_passed = True

def check(name, condition):
    global all_passed
    status = "✓ PASS" if condition else "✗ FAIL"
    if not condition: all_passed = False
    print(f"[{status}] {name}")
    return condition


# ── Create test images ──────────────────────────────────────────────
cover = Image.new("RGB", (200, 200))
for x in range(200):
    for y in range(200):
        cover.putpixel((x, y), (x % 256, y % 256, (x+y) % 256))

secret_img = Image.new("RGB", (20, 20), (255, 0, 0))
for x in range(20):
    for y in range(20):
        secret_img.putpixel((x, y), (x*12 % 256, y*12 % 256, 128))


# ═══════════════════════════════════════════════════════════════════════
print("=== TEXT-IN-IMAGE ===")
# ═══════════════════════════════════════════════════════════════════════

cap = calculate_capacity(cover)
check(f"Capacity: {cap:,} bytes", cap > 0)

for i, msg in enumerate([
    "Hello StegoVault!",
    "Special: àéîõü 中文 🔒🛡️",
    "A" * 500,
]):
    stego = encode(cover, msg)
    extracted = decode(stego)
    check(f"Text #{i+1}: round-trip match ({len(msg)} chars)", extracted == msg)

# Error cases
try: encode(cover, ""); check("Empty text rejected", False)
except ValueError: check("Empty text rejected", True)

try: decode(cover); check("Normal image detected", False)
except ValueError: check("Normal image detected", True)


# ═══════════════════════════════════════════════════════════════════════
print("\n=== IMAGE-IN-IMAGE ===")
# ═══════════════════════════════════════════════════════════════════════

stego_img = encode_image_in_image(cover, secret_img)
decoded_img = decode_image_from_image(stego_img)
check(f"Image round-trip: size match ({decoded_img.size})", decoded_img.size == secret_img.size)

# Compare pixels
secret_px = list(secret_img.convert("RGB").getdata())
decoded_px = list(decoded_img.convert("RGB").getdata())
match = all(s == d for s, d in zip(secret_px, decoded_px))
check("Image round-trip: pixel-perfect match", match)

# Cross-mode detection
try: decode(stego_img); check("Cross-mode: text decode on image payload", False)
except ValueError as e: check(f"Cross-mode: text decode on image payload → {e}", True)

try: decode_image_from_image(encode(cover, "hello")); check("Cross-mode: image decode on text payload", False)
except ValueError as e: check(f"Cross-mode: image decode on text payload → {e}", True)


# ═══════════════════════════════════════════════════════════════════════
print("\n=== TEXT-IN-TEXT ===")
# ═══════════════════════════════════════════════════════════════════════

cover_text = "The weather is beautiful today and I'm enjoying the sunshine."
secret = "Meet me at midnight."

stego_text = encode_text_in_text(cover_text, secret)
# Visible text should look the same
visible = stego_text.replace('\u200b', '').replace('\u200c', '').replace('\u200d', '').replace('\ufeff', '')
check("Visible text preserved", visible == cover_text)

extracted = decode_text_from_text(stego_text)
check(f"Text-in-text round-trip: '{extracted}'", extracted == secret)

# Unicode secret
secret2 = "秘密のメッセージ 🔐"
stego2 = encode_text_in_text("Hello world!", secret2)
extracted2 = decode_text_from_text(stego2)
check(f"Unicode secret round-trip", extracted2 == secret2)

# Error cases
try: decode_text_from_text("Normal text without hidden data"); check("Normal text detected", False)
except ValueError: check("Normal text detected", True)

try: encode_text_in_text("", "secret"); check("Empty cover rejected", False)
except ValueError: check("Empty cover rejected", True)


# ═══════════════════════════════════════════════════════════════════════
print(f"\n{'='*50}")
print(f"Result: {'ALL TESTS PASSED ✓' if all_passed else 'SOME TESTS FAILED ✗'}")
