import asyncio
import websockets
import json

connected_clients = set()


async def handler(websocket):
    print("🟢 Client verbunden")
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            print(f"📩 Empfangen: {message}")
            data = json.loads(message)

            # Simuliere eine Aktion vom Server
            if data.get("event") == "face_result":
                if data.get("result") is True:
                    action = {"action": "save"}
                else:
                    action = {"action": "skip"}

                await asyncio.sleep(2)  # kleine Verzögerung zur Simulation
                await websocket.send(json.dumps(action))
                print(f"📤 Antwort gesendet: {action}")

    except websockets.ConnectionClosed:
        print("🔴 Verbindung geschlossen")
    finally:
        connected_clients.remove(websocket)


async def main():
    print("🚀 Starte Test-WebSocket-Server auf ws://localhost:8765")
    async with websockets.serve(handler, "localhost", 8765):
        await asyncio.Future()  # läuft für immer


if __name__ == "__main__":
    asyncio.run(main())
