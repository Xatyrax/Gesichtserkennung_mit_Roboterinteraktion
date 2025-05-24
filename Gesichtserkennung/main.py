import face_recognition
import os
import time
import shutil
from PIL import Image, ExifTags
import numpy as np
from websocket_client import WebSocketClient

# Ordnerpfade
UPLOAD_FOLDER = "Serverordner"
FORMATTED_FOLDER = "Formatted"
KNOWN_FOLDER = "known_faces"
UNKNOWN_FOLDER = "unknown_faces"
SERVER_URI = "ws://localhost:3001"

# WebSocket-Verbindung
ws_client = WebSocketClient(SERVER_URI)


# Ordner erstellen
for folder in [UPLOAD_FOLDER, FORMATTED_FOLDER, KNOWN_FOLDER, UNKNOWN_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# 🔢 Freie Nummer ermitteln
def get_next_available_number():
    used_numbers = set()

    # known_faces
    for file in os.listdir(KNOWN_FOLDER):
        name = os.path.splitext(file)[0]
        if name.endswith(".jpg"):  # z.B. 1.jpg.npy
            name = os.path.splitext(name)[0]
        if name.isdigit():
            used_numbers.add(int(name))

    # Formatted
    for file in os.listdir(FORMATTED_FOLDER):
        name = os.path.splitext(file)[0]
        if name.isdigit():
            used_numbers.add(int(name))

    next_number = 1
    while next_number in used_numbers:
        next_number += 1
    return next_number

# 1. Bild formatieren
def format_image(image_path):
    try:
        with Image.open(image_path) as img:
            try:
                for orientation in ExifTags.TAGS.keys():
                    if ExifTags.TAGS[orientation] == 'Orientation':
                        break
                exif = img._getexif()
                if exif is not None:
                    orientation = exif.get(orientation, None)
                    if orientation == 3:
                        img = img.rotate(180, expand=True)
                    elif orientation == 6:
                        img = img.rotate(270, expand=True)
                    elif orientation == 8:
                        img = img.rotate(90, expand=True)
            except Exception as e:
                print(f"Exif-Fehler: {e}")

            img = img.convert("RGB")
            next_number = get_next_available_number()
            formatted_filename = f"{next_number}.jpg"
            formatted_path = os.path.join(FORMATTED_FOLDER, formatted_filename)
            img.save(formatted_path, "JPEG", quality=80)
            print(f"Bild formatiert: {formatted_path}")
            return formatted_filename
    except Exception as e:
        print(f"Fehler bei Formatierung von {image_path}: {e}")
        return None

# 2. Bild laden
def load_image_rgb(path):
    with Image.open(path) as img:
        return np.array(img.convert('RGB'))

# 3. Gesicht erkennen → unknown_faces
def encode_and_store_unknown(image_path):
    try:
        image = load_image_rgb(image_path)
        encodings = face_recognition.face_encodings(image, model="large")
        if encodings:
            filename = os.path.splitext(os.path.basename(image_path))[0]
            np.save(os.path.join(UNKNOWN_FOLDER, filename), encodings[0])
            print(f"Gesicht als Vektor gespeichert: {filename}.npy")
            return filename
        else:
            print(f"Kein Gesicht erkannt in: {image_path}")
    except Exception as e:
        print(f"Fehler beim Verarbeiten von {image_path}: {e}")
    return None

# 4. Bekannte Gesichter laden
def load_known_encodings():
    encodings, names = [], []
    for file in os.listdir(KNOWN_FOLDER):
        if file.endswith(".npy"):
            name = os.path.splitext(file)[0]
            encoding = np.load(os.path.join(KNOWN_FOLDER, file))
            encodings.append(encoding)
            names.append(name)
    return encodings, names

# 5. Vergleich → liefert den Namen des Matches
def find_matching_known_face(known_encodings, known_names, test_encoding):
    matches = face_recognition.compare_faces(known_encodings, test_encoding)
    for match, name in zip(matches, known_names):
        if match:
            return name
    return None

# 6. Unknown-Faces leeren
def clear_unknown_faces():
    for file in os.listdir(UNKNOWN_FOLDER):
        try:
            os.remove(os.path.join(UNKNOWN_FOLDER, file))
        except Exception as e:
            print(f"Fehler beim Löschen von {file}: {e}")

# 7. Formatierte Datei verarbeiten
def handle_formatted_file(file_path):
    filename = os.path.basename(file_path)
    if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
        print(f"Nicht unterstütztes Format: {filename}")
        ws_client.send_result(filename, "Datei ist kein Bild")
        os.remove(file_path)
        return

    encoded_filename = encode_and_store_unknown(file_path)
    os.remove(file_path)

    if not encoded_filename:
        ws_client.send_result(encoded_filename, "Kein Gesicht erkannt")
        return

    test_encoding = np.load(os.path.join(UNKNOWN_FOLDER, encoded_filename + ".npy"))
    known_encodings, known_names = load_known_encodings()
    matched_name = find_matching_known_face(known_encodings, known_names, test_encoding)

    if matched_name:
        ws_client.send_result(matched_name, "Gesicht erkannt")
        print(f"Gesicht erkannt → Match mit: {matched_name}")
        clear_unknown_faces()
    else:
        ws_client.send_result(encoded_filename, "Gesicht nicht erkannt")
        print(f"Gesicht nicht erkannt: {encoded_filename}")
        wait_for_server_response(encoded_filename)

# 8. Warten auf Speicheraktion
def wait_for_server_response(filename):
    print(f"Warte auf Aktion vom Server für: {filename}")
    while True:
        if os.listdir(UPLOAD_FOLDER):
            ws_client.send_result(filename, "Speichern abgebrochen – neues Bild eingetroffen")
            ws_client.send_result(filename, "skip")
            return

        action = ws_client.get_last_action()
        if action == "save":
            try:
                src = os.path.join(UNKNOWN_FOLDER, filename + ".npy")
                dst = os.path.join(KNOWN_FOLDER, filename + ".npy")
                shutil.move(src, dst)
                print(f"Neues Gesicht gespeichert: {filename}")
                ws_client.send_result(filename, "Gesicht gespeichert")
            except Exception as e:
                print(f"Fehler beim Speichern: {e}")
                ws_client.send_result(filename, "Gesicht konnte nicht gespeichert werden")
            ws_client.reset_action()
            break

        time.sleep(1)

# 🟢 Hauptprogramm
if __name__ == "__main__":
    print("Gesichtserkennungssystem läuft...")

    while True:
        for file in os.listdir(UPLOAD_FOLDER):
            if file.lower().endswith((".jpg", ".jpeg", ".png")):
                original_path = os.path.join(UPLOAD_FOLDER, file)
                formatted_filename = format_image(original_path)
                if formatted_filename:
                    os.remove(original_path)

        for file in os.listdir(FORMATTED_FOLDER):
            file_path = os.path.join(FORMATTED_FOLDER, file)
            handle_formatted_file(file_path)

        time.sleep(1)
