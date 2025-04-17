import string

from websockets.sync.server import serve


def echo(websocket):
    for message in websocket:
        print(message)
        q.put(message)
        websocket.send(str(message).upper())


def main(q):
    with serve(echo, "localhost", 8765) as server:
        server.serve_forever()


if __name__ == "__main__":
    main()