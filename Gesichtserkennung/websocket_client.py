import websocket
import json
import threading

class WebSocketClient:
    def __init__(self, uri):
        self.uri = uri
        self.ws = websocket.WebSocketApp(
            uri,
            on_message=self.on_message,
            on_open=self.on_open,
            on_close=self.on_close,
            on_error=self.on_error
        )
        self.last_server_action = None
        self.listener_thread = threading.Thread(target=self.ws.run_forever)
        self.listener_thread.daemon = True
        self.listener_thread.start()

    def on_open(self, ws):
        print("🔌 Verbindung zum Server hergestellt.")
        self.ws.send('ge')

    def on_close(self, ws, close_status_code, close_msg):
        print("❌ Verbindung zum Server geschlossen.")

    def on_error(self, ws, error):
        print(f"⚠️ WebSocket Fehler: {error}")

    def on_message(self, ws, message):
        print(f"📨 Nachricht vom Server: {message}")
        try:
            data = json.loads(message)
            self.last_server_action = data.get("action")
        except json.JSONDecodeError:
            print("⚠️ Ungültiges JSON erhalten")

    def send_result(self, filename, result):
        payload = {
            "event": "face_result",
            "filename": filename,
            "result": result
        }
        self.ws.send(json.dumps(payload))
        print(f"📤 Ergebnis gesendet: {payload}")

    def get_last_action(self):
        return self.last_server_action

    def reset_action(self):
        self.last_server_action = None
