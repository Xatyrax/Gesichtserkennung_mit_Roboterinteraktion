import asyncio
import websockets
import json

connected_clients = set()

async def handler(websocket):
    print("🟢 Client verbunden")
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            print(f"\n📩 Nachricht erhalten:")
            print(message)

            data = json.loads(message)
            filename = data.get("filename", "unbekannt")

            # Interaktive Eingabe
            print(f"🤖 Aktion für Datei '{filename}'?")
            print("👉 [s] save  |  [k] skip  |  [leer] keine Antwort")
            user_input = input("🧪 Eingabe (s/k/Enter): ").strip().lower()

            if user_input == "s":
                action = {"action": "save"}
            elif user_input == "k":
                action = {"action": "skip"}
            else:
                print("⏸️  Keine Aktion gesendet.")
                continue

            await websocket.send(json.dumps(action))
            print(f"📤 Antwort gesendet: {action}")

    except websockets.ConnectionClosed:
        print("🔴 Verbindung geschlossen")
    finally:
        connected_clients.remove(websocket)

async def main():
    print("🚀 Interaktiver Test-WebSocket-Server auf ws://localhost:8765")
    async with websockets.serve(handler, "localhost", 8765):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
