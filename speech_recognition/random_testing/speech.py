import pathlib
import queue
import threading
import time

import pydub
from transformers import pipeline
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer


transcriber = pipeline(model="primeline/whisper-large-v3-turbo-german")

input_queue = queue.Queue()

def speechToJson():
    while True:
        filename = input_queue.get()
        print("Speechrecognition startin new job")
        infile = "data/in/" + filename
        outfile = "data/out/" + filename.split(".")[0] + ".wav"
        # Read the m4a file
        sound = pydub.AudioSegment.from_file(infile)
        # Write the data to a wav file
        sound.export(outfile, format="wav")
        res = transcriber(outfile, generate_kwargs={"language": "german"})
        print(res)
        print(res.__str__())


class MonitorDirectory(FileSystemEventHandler):
    def on_any_event(self, event):
        print(event)
        print(event.event_type)
        print(event.src_path.split('\\')[-1])

    def on_created(self, event):
        # Run your function when a file is moved to the directory
        filename = event.src_path.split('\\')[-1]
        if not event.is_directory:
            input_queue.put(filename)


threading.Thread(target=speechToJson, daemon=True).start()


def watching():
    path = pathlib.Path("../data/in").resolve()
    print(path)
    event_handler = MonitorDirectory()
    observer = Observer()
    observer.schedule(event_handler, path, recursive=False)
    observer.start()
    print("Listening...")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
    print("Observer now exiting")


if __name__ == "__main__":
    watching()