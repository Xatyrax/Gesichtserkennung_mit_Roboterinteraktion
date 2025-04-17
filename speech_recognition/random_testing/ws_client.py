
from websockets.sync.client import connect


def hello():
    with connect("ws://localhost:8008") as websocket:
        while True:
            text = input("Send a message to the server: ")
            websocket.send(text)
            message = websocket.recv()
            print(message)


if __name__ == "__main__":
    hello()