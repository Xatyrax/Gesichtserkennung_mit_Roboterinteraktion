## Installation

Diese Anleitung beschreibt die Schritte zur Einrichtung des Projekts unter Python 3.9 in PyCharm inklusive virtueller Umgebung und benötigter Abhängigkeiten.

---

### Voraussetzungen

- Python 3.9 (Download: https://www.python.org/downloads/release/python-390/)
- PyCharm (Community oder Professional Edition)

---

### 1. Virtuelle Umgebung in PyCharm einrichten

1. Öffne das Projekt in PyCharm.
2. Navigiere zu: `File > Settings > Project > Python Interpreter`.
3. Klicke auf **Add Interpreter**.
4. Wähle **Add Local Interpreter**.
5. Gib den Speicherort für die neue virtuelle Umgebung an (z. B. `.venv` im Projektordner).
6. Wähle unter **Base Interpreter** Python 3.9 aus.  
   Falls nicht gelistet, gib den Pfad manuell an (z. B. `C:\Python39\python.exe`).
7. Klicke auf **OK**.

### 2.	Dlib installieren
1.	Ordnerpfad des Projekts herausfinden
2.	Im Terminal bei PyCharm denn Ordnerpfad aufrufen, wenn nicht angezeigt
3.	Dann im Terminal „pip install dlib-19.22.99-cp39-cp39-win_amd64.whl“ eingeben und Enter
4.	Nun wird dlib installiert

### 3.	Restliche Abhängigkeiten installieren
1.	Geben sie im Terminal „pip install -r requirements.txt“ ein
2.	Klicke Enter und installiere die restlichen Abhängigkeiten
