import face_recognition
import os
import numpy as np
from PIL import Image

KNOWN_FOLDER = "known_faces"


def load_image_rgb(path):
    with Image.open(path) as img:
        rgb_image = img.convert('RGB')
        return np.array(rgb_image)


def encode_and_store_all_known():
    for filename in os.listdir(KNOWN_FOLDER):
        filepath = os.path.join(KNOWN_FOLDER, filename)

        if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
            print(f"⚠️ Nicht unterstütztes Format übersprungen: {filename}")
            continue

        try:
            image = load_image_rgb(filepath)
            encodings = face_recognition.face_encodings(image)

            if encodings:
                npy_filename = os.path.splitext(filename)[0] + ".npy"
                np.save(os.path.join(KNOWN_FOLDER, npy_filename), encodings[0])
                print(f"✅ Vektor gespeichert: {npy_filename}")
            else:
                print(f"⚠️ Kein Gesicht erkannt in: {filename}")
        except Exception as e:
            print(f"❌ Fehler beim Verarbeiten von {filename}: {e}")


if __name__ == "__main__":
    os.makedirs(KNOWN_FOLDER, exist_ok=True)
    encode_and_store_all_known()
