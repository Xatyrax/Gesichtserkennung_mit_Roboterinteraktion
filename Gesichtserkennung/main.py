import face_recognition
import os
import time
import shutil
from PIL import Image
import numpy as np
from websocket_client import WebSocketClient

KNOWN_FOLDER = "known_faces"
UNKNOWN_FOLDER = "unknown_faces"
SERVER_FOLDER = "Serverordner"
SERVER_URI = "ws://localhost:3001"

ws_client = WebSocketClient(SERVER_URI)

def load_image_rgb(path):
    with Image.open(path) as img:
        rgb_image = img.convert('RGB')
        return np.array(rgb_image)

def encode_and_store_unknown(image_path):
    try:
        image = load_image_rgb(image_path)
        encodings = face_recognition.face_encodings(image)

        if encodings:
            filename = os.path.basename(image_path)
            np.save(os.path.join(UNKNOWN_FOLDER, filename), encodings[0])
            print(f"✅ Gesicht als Vektor gespeichert: {filename}")
            return filename
        else:
            print(f"⚠️ Kein Gesicht erkannt in: {image_path}")
    except Exception as e:
        print(f"❌ Fehler beim Verarbeiten von {image_path}: {e}")
    return None

def load_known_encodings():
    encodings = []
    names = []
    for file in os.listdir(KNOWN_FOLDER):
        if file.endswith(".npy"):
            encoding = np.load(os.path.join(KNOWN_FOLDER, file))
            encodings.append(encoding)
            names.append(file)
    return encodings, names

def compare_faces(known_encodings, test_encoding):
    matches = face_recognition.compare_faces(known_encodings, test_encoding)
    return True in matches

def clear_unknown_faces():
    for file in os.listdir(UNKNOWN_FOLDER):
        file_path = os.path.join(UNKNOWN_FOLDER, file)
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"❌ Fehler beim Löschen von {file_path}: {e}")

def handle_server_file(file_path):
    filename = os.path.basename(file_path)
    if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
        print(f"⚠️ Nicht unterstütztes Format: {filename} → FALSE")
        os.remove(file_path)
        return

    filename = encode_and_store_unknown(file_path)
    os.remove(file_path)

    if filename:
        test_encoding = np.load(os.path.join(UNKNOWN_FOLDER, filename + ".npy"))
        known_encodings, _ = load_known_encodings()

        if compare_faces(known_encodings, test_encoding):
            print(f"✅ Gesicht erkannt → TRUE → {filename}")
            ws_client.send_result(filename, True)
            clear_unknown_faces()
        else:
            print(f"❌ Gesicht nicht erkannt → FALSE → {filename}")
            ws_client.send_result(filename, False)
            wait_for_server_response(filename)

def wait_for_server_response(filename):
    print(f"⏳ Warte auf Anweisung vom Server für: {filename}")
    while True:
        action = ws_client.get_last_action()
        if action:
            print(f"🔁 Server-Aktion empfangen: {action}")
            if action == "save":
                shutil.move(os.path.join(UNKNOWN_FOLDER, filename + ".npy"),
                            os.path.join(KNOWN_FOLDER, filename + ".npy"))
                clear_unknown_faces()
                print(f"✅ Neuer Patient gespeichert: {filename}")
            elif action == "skip":
                print("⏭ Vorgang vom Server abgebrochen")
            ws_client.reset_action()
            break
        time.sleep(1)

if __name__ == "__main__":
    os.makedirs(KNOWN_FOLDER, exist_ok=True)
    os.makedirs(UNKNOWN_FOLDER, exist_ok=True)
    os.makedirs(SERVER_FOLDER, exist_ok=True)

    print("👁 Gesichtserkennungssystem gestartet – wartet auf neue Bilder...")
    while True:
        files = os.listdir(SERVER_FOLDER)
        for file in files:
            handle_server_file(os.path.join(SERVER_FOLDER, file))
        time.sleep(1)
