import asyncio
import threading
import pathlib
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


class MonitorDirectory(FileSystemEventHandler):
    def __init__(self, loop, queue):
        self.loop = loop
        self.queue = queue

    def on_modified(self, event):
        if event.is_directory:
            return
        print("[on_modified] Detected change:", event.src_path)
        try:
            future = asyncio.run_coroutine_threadsafe(self.handle_modified(event), self.loop)
            # You can omit this timeout or set it to None if you're debugging
            future.result(timeout=5)
        except Exception as e:
            print("[on_modified] Coroutine failed:")
            import traceback
            traceback.print_exception(type(e), e, e.__traceback__)

    async def handle_modified(self, event):
        print("[COROUTINE] Started")
        filename = pathlib.Path(event.src_path).name
        await self.queue.put(filename)
        print(f"[COROUTINE] Put {filename} into queue")


def start_observer(loop, queue, path):
    event_handler = MonitorDirectory(loop, queue)
    observer = Observer()
    observer.schedule(event_handler, str(path), recursive=False)
    observer.start()
    print("[Observer] Watching:", path)
    observer.join()


async def queue_consumer(queue):
    while True:
        item = await queue.get()
        print(f"[CONSUMER] Got item from queue: {item}")
        queue.task_done()


async def main():
    loop = asyncio.get_running_loop()
    queue = asyncio.Queue()
    path = pathlib.Path("../data/in").resolve()
    path.mkdir(parents=True, exist_ok=True)

    # Start the watchdog observer in a separate thread
    threading.Thread(target=start_observer, args=(loop, queue, path), daemon=True).start()

    # Start the coroutine consumer
    asyncio.create_task(queue_consumer(queue))

    print("[MAIN] Watching directory. Modify any file in:", path)
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("[MAIN] Shutting down")


if __name__ == "__main__":
    asyncio.run(main())
