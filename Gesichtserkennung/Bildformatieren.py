import os
import time
from PIL import Image, ExifTags

# Ordnerpfade
test_folder = "Serverordner"
formatted_folder = "Formatted"
os.makedirs(formatted_folder, exist_ok=True)


# Bildformatierung
def format_image(image_path):
    try:
        with Image.open(image_path) as img:

            # Exif-Rotation erkennen und korrigieren
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
                print(f"Fehler bei der Exif-Rotation: {e}")

            # Bild in RGB konvertieren und Größe anpassen
            img = img.convert("RGB")
            img = img.resize((800, 600))

            # Dateiname ohne Pfad und ohne Endung
            filename = os.path.splitext(os.path.basename(image_path))[0]
            formatted_path = os.path.join(formatted_folder, f"formatted_{filename}.jpg")

            # Bild speichern
            img.save(formatted_path, "JPEG", quality=80)
            print(f"Bild erfolgreich formatiert: {formatted_path}")
    except Exception as e:
        print(f"Fehler bei der Formatierung von {image_path}: {e}")


if __name__ == "__main__":
    print("Bildformatierer gestartet - wartet auf Bilder im Test-Ordner...")
    while True:
        files = os.listdir(test_folder)
        for file in files:
            if file.lower().endswith((".jpg", ".jpeg", ".png")):
                file_path = os.path.join(test_folder, file)
                format_image(file_path)
                # Ursprüngliches Bild nach der Formatierung löschen
                os.remove(file_path)
        time.sleep(1)
