import asyncio
import threading
import time

import websockets
from websockets import ConnectionClosed
from websockets.asyncio.server import serve


# class Server:
#     def __init__(self, host, port, q=None):
#         self.host = host
#         self.port = port
#         self.q = q
#
#     def handler(self, websocket):
#         for message in websocket:
#             print(message)
#             if self.q is not None:
#                 self.q.put(message)
#             websocket.send("Message received")
#
#
#     def send_message(self, message):
#         for client in self.clients:
#             try:
#                 client.send(message)
#             except Exception as e:
#                 print(f"Error sending message to client: {e}")
#                 self.clients.remove(client)
#
#
#     def start(self):
#         with serve(self.handler, self.host, self.port) as server:
#             print("Server started at http://{}:{}".format(self.host, self.port))
#             server.serve_forever()
#
#
# class Content(BaseModel):
#     fileName: str
#     text: str
#
#
# class Message(BaseModel):
#     event: str
#     message: Content
#

async def consumer_handler(websocket):
    # Handle incoming messages from the client
    try:
        async for message in websocket:
            print(f"Received from client: {message}")
    except ConnectionClosed:
        print("Consumer: Connection closed.")


async def produce():
    # This function runs input() in a thread so it doesn’t block the event loop.
    return await asyncio.to_thread(input, "Send a message to the client: ")


async def producer_handler(websocket):
    # Handle outgoing messages to the client
    while True:
        try:
            message = await produce()
            await websocket.send(message)
        except ConnectionClosed:
            print("Producer: Connection closed.")
            break


async def handler(websocket):
    # Use asyncio.gather to run producer and consumer concurrently.
    consumer_task = asyncio.create_task(consumer_handler(websocket))
    producer_task = asyncio.create_task(producer_handler(websocket))

    # Wait for either to finish (which happens on connection closure)
    done, pending = await asyncio.wait(
        [consumer_task, producer_task],
        return_when=asyncio.FIRST_COMPLETED,
    )

    # Cancel any pending tasks
    for task in pending:
        task.cancel()


async def main():
    print("Server starting at ws://localhost:8080")
    async with serve(handler, host='localhost', port=8080):
        await asyncio.Future()  # Run forever


if __name__ == '__main__':
    asyncio.run(main())