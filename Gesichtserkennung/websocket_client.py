import websocket
import json
import threading
import time
import queue


class WebSocketClient:
    def __init__(self, uri, test_mode=True):
        self.uri = uri
        self.test_mode = test_mode
        self.last_server_action = None
        self.message_queue = queue.Queue()
        self.connected = False

        self.ws = None
        self.listener_thread = threading.Thread(target=self._run_websocket)
        self.listener_thread.daemon = True
        self.listener_thread.start()

    def _run_websocket(self):
        while True:
            try:
                self.ws = websocket.WebSocketApp(
                    self.uri,
                    on_message=self.on_message,
                    on_open=self.on_open,
                    on_close=self.on_close,
                    on_error=self.on_error,
                )
                self.ws.run_forever()
            except Exception as e:
                print(f"🔌 Verbindungsfehler: {e}")
            print("Versuche erneut in 3 Sekunden...")
            time.sleep(3)

    def on_open(self, ws):
        self.connected = True
        print("WebSocket verbunden.")
        #Indentifizierung am Server
        self.ws.send('ge');
        # Nachrichten aus der Warteschlange senden
        while not self.message_queue.empty():
            payload = self.message_queue.get()
            self._send_raw(payload)

    def on_close(self, ws, close_status_code, close_msg):
        self.connected = False
        print(f"WebSocket getrennt: {close_msg}")

    def on_error(self, ws, error):
        print(f"WebSocket-Fehler: {error}")

    def on_message(self, ws, message):
        print(f"Nachricht vom Server: {message}")
        try:
            data = json.loads(message)
            self.last_server_action = data.get("action")
        except json.JSONDecodeError:
            print("Ungültiges JSON empfangen.")

    def send_result(self, filename, result):
        payload = json.dumps(
            {"event": "face_result", "filename": filename, "result": result}
        )
        if self.connected:
            self._send_raw(payload)
        else:
            print("Verbindung nicht verfügbar – Nachricht wird zwischengespeichert.")
            self.message_queue.put(payload)

    def _send_raw(self, payload):
        try:
            self.ws.send(payload)
            print(f"Nachricht gesendet: {payload}")
        except Exception as e:
            print(f"Fehler beim Senden: {e}")
            self.message_queue.put(payload)

    def get_last_action(self):
        # Priorisiere die Serverantwort, wenn vorhanden
        if self.last_server_action:
            action = self.last_server_action
            self.reset_action()  # Nach Abruf zurücksetzen
            print(f"🔍 Aktion von WebSocket: {action}")  # Debug-Print
            return action
        return None

    def reset_action(self):
        self.last_server_action = None
