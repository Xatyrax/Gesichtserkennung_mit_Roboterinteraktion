from pydantic import BaseModel
import websockets
import asyncio

from websockets import ConnectionClosed
import json


class WebSocketClient:
    def __init__(self, uri, queue = None):
        self.uri = uri
        self.queue = queue
        self.ws = None

    async def connect(self):
        self.ws = await websockets.connect(self.uri)
        asyncio.create_task(self.receive_messages())

    async def send_message(self, message):
        if self.ws:
            await self.ws.send(message)
        else:
            print("Not connected to the WebSocket server.")

    async def consume(self, raw):
        try:
            print(f"Raw message: {raw}")
            #message = Message.model_validate_json(raw)
            message = json.loads(raw)
            print(f"Message received: {message}")
            if message['type'] == 'GENERATE_AUDIO_REQUEST':
                text = message['message']['text']
                print("Text to generate audio from: ", message)
                await self.queue.put(text)
        except Exception as e:
            print(f"Exception occurred: {e}")

    async def receive_messages(self):
        while True:
            try:
                raw = await self.ws.recv()
                await self.consume(raw)
            except ConnectionClosed:
                print("Connection to the WebSocket server closed.")
                break

    async def close_connection(self):
        if self.ws:
            await self.ws.close()
            self.ws = None


class Content(BaseModel):
    fileName: str
    text: str

class Message(BaseModel):
    type: str
    message: Content


# Usage example:
async def main():
    client = WebSocketClient("ws://localhost:8080")
    await client.connect()
    await client.send_message("Hello, server!")
    while True:
        message = await asyncio.to_thread(input, "Send a message to the Server:")
        await client.send_message(message)


if __name__ == "__main__":
    asyncio.run(main())