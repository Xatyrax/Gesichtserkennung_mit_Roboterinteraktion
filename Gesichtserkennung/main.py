import face_recognition
import os
import time
import shutil
from PIL import Image
import numpy as np
from websocket_client import WebSocketClient

KNOWN_FOLDER = "known_faces"
UNKNOWN_FOLDER = "unknown_faces"
SERVER_FOLDER = "Formatted"
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
            print(f"Gesicht als Vektor gespeichert: {filename}")
            return filename
        else:
            print(f"Kein Gesicht erkannt in: {image_path}")
    except Exception as e:
        print(f"Fehler beim Verarbeiten von {image_path}: {e}")
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
            print(f"Fehler beim Löschen von {file_path}: {e}")

def handle_server_file(file_path):
    filename = os.path.basename(file_path)

    # 📸 Prüfen, ob es sich um ein unterstütztes Bildformat handelt
    if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
        print(f"Datei ist kein Bild: {filename}")
        ws_client.send_result(filename, "Datei ist kein Bild")
        os.remove(file_path)
        return

    encoded_filename = encode_and_store_unknown(file_path)
    os.remove(file_path)

    if not encoded_filename:
        print(f"Rückmeldung an Server: Kein Gesicht im Bild erkannt → {filename}")
        ws_client.send_result(filename, "Kein Gesicht im Bild erkannt")
        return

    test_encoding = np.load(os.path.join(UNKNOWN_FOLDER, encoded_filename + ".npy"))
    known_encodings, _ = load_known_encodings()

    if compare_faces(known_encodings, test_encoding):
        print(f"Gesicht erkannt → {encoded_filename}")
        ws_client.send_result(encoded_filename, "Gesicht erkannt")
        clear_unknown_faces()
    else:
        print(f"Gesicht nicht erkannt → {encoded_filename}")
        ws_client.send_result(encoded_filename, "Gesicht nicht erkannt")
        wait_for_server_response(encoded_filename)


def wait_for_server_response(filename):
    print(f"Warte auf Anweisung vom Server für: {filename}")
    start_time = time.time()

    while True:
        # Überprüfen, ob ein neues Bild im SERVER_FOLDER erschienen ist
        new_files = os.listdir(SERVER_FOLDER)
        if new_files:
            print(f"Neues Bild erkannt – Wartevorgang abgebrochen")
            ws_client.send_result(filename, "Speichern abgebrochen – Neues Bild eingetroffen")
            ws_client.send_result(filename, "skip")  # An Server melden, dass gespeichert wird
            return

        # Überprüfung auf Serveraktion "save"
        action = ws_client.get_last_action()
        print(f"Aktion vom Server erhalten: {action}")  # Debug-Print zur Prüfung der Aktion

        if action:
            print(f"Server-Aktion empfangen: {action}")
            if action == "save":
                try:
                    src_path = os.path.join(UNKNOWN_FOLDER, filename + ".npy")
                    dest_path = os.path.join(KNOWN_FOLDER, filename + ".npy")
                    print(f"Verschiebe Datei von {src_path} nach {dest_path}")  # Debug-Print

                    shutil.move(src_path, dest_path)
                    clear_unknown_faces()
                    print(f"Neuer Patient gespeichert: {filename}")
                    ws_client.send_result(filename, "Gesicht gespeichert")
                except Exception as e:
                    print(f"Fehler beim Speichern von {filename}: {e}")
                    ws_client.send_result(filename, "Gesicht konnte nicht gespeichert werden")
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
        if files:
            for file in files:
                print(f"Neues Bild gefunden: {file}")
                handle_server_file(os.path.join(SERVER_FOLDER, file))
        time.sleep(1)
