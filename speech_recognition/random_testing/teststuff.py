import asyncio
import websockets  # pip install websockets


async def run_command_in_subprocess(command: str):
    # Use a subprocess shell on Windows.
    proc = await asyncio.create_subprocess_shell(
        command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        shell=True  # shell should be True to invoke the command shell.
    )

    # Wait for the process to complete.
    stdout, stderr = await proc.communicate()

    # Decode and print output.
    if stdout:
        print(f"[stdout]\n{stdout.decode()}")
    if stderr:
        print(f"[stderr]\n{stderr.decode()}")


async def websocket_client(uri: str):
    async with websockets.connect(uri) as websocket:
        print(f"Connected to {uri}")

        while True:
            try:
                message = await websocket.recv()
                print(f"Received message: {message}")

                # Launch the command asynchronously.
                # Depending on your needs, you can also await run_command_in_subprocess(message)
                asyncio.create_task(run_command_in_subprocess(message))
            except websockets.exceptions.ConnectionClosed:
                print("Connection closed.")
                break


if __name__ == "__main__":
    # Replace with the actual websocket server URI.
    uri = "ws://localhost:8080"
    asyncio.run(websocket_client(uri))