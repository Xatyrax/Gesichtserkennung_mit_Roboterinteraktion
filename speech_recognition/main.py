import asyncio
import pathlib
import threading
import time
import traceback

import torch

import tts

import pydub
from transformers import pipeline, AutoModelForCausalLM, AutoTokenizer
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

import client as ws


# llm_queue = queue.Queue()
llm_event = threading.Event()
# speech_queue = queue.Queue()
speech_event = threading.Event()




device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(torch.cuda.is_available())
t0 = time.time()
transcriber = pipeline(model="openai/whisper-large-v3-turbo")
t1 = time.time()
print(f"Whisper loaded in {t1 - t0:.2f} seconds.")
#0.5 deutlich schneller
#1.5 sehr langsam aber weniger halluzinationen

t2 = time.time()
model_name = "Qwen/Qwen2.5-0.5B-Instruct"

model = AutoModelForCausalLM.from_pretrained(
         model_name,
         torch_dtype="auto",
         device_map="auto")
tokenizer = AutoTokenizer.from_pretrained(model_name)
t3 = time.time()
print(f"Qwen loaded in {t3 - t2:.2f} seconds.")
print(f"Loading both took {t3 - t0:.2f} seconds.")
async def waitForInput(queue, client):
    while True:
        print("Waiting for input...")
        prompt = await queue.get()
        t4 = time.time()
        if prompt == None:
            time.sleep(1)
            print("Nap time zzz")
        print("LLM Starting with prompt: ", prompt)
        messages = [
            {"role": "system", "content": "You are Qwen, created by Alibaba Cloud. Your job is to take sentences "
                                          "said by some people and to format them into a json format. dont put formatting qoutes"
                                          "You will usually receive a firstname, lastname, their sex"
                                          "their date of birth, their phone number and their email address."
                                          "make all of those seperate fields in the json and also try to replace"
                                          "the spoken at with an @ symbol in their email address, for sex please return"
                                          "M for male, W for female, and D in any other case"
                                          "If you can't detect one of these fields they maybe missing please set it to null then."
                                          "Return your response as plain text without the json formatting flag."
            },
            {"role": "user", "content": prompt}
        ]
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        model_inputs = tokenizer([text], return_tensors="pt").to(model.device)

        generated_ids = model.generate(
            **model_inputs,
            max_new_tokens=512
        )
        generated_ids = [
            output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
        ]

        response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        t5 = time.time()
        print(f"Transcription to json took {t5 - t4:.2f} seconds.")
        print(f"Transcription to json with model loading took {t5 - t4 + (t3-t2):.2f} seconds.")
        print("Job finished")
        response = response.replace(r"```json", "").replace("```", "")
        print(response)
        await client.send_message(f'''
        {{
        "type": "EXTRACT_DATA_FROM_AUDIO_SUCCESS",
            "message": {{
                    "text": {response}
                        }}
        }}      ''')
        llm_event.set()


async def speechToJson(in_queue, out_queue, client):
    while True:
        print("Waiting for speech")
        filename = await in_queue.get()
        t6 = time.time()
        print("Speechrecognition starting new job, with file: ", filename)
        await client.send_message(f'''
        {{
            "type": "EXTRACT_DATA_FROM_AUDIO_STARTING",
            "message": {{
                "text": {{
                    "fileName": "{filename}"
                }}
            }}
        }}
        ''')
        infile = "data/in/" + filename
        outfile = "data/out/" + filename.split(".")[0] + ".wav"
        # Read the m4a file
        sound = pydub.AudioSegment.from_file(infile)
        # Write the data to a wav file
        sound.export(outfile, format="wav")
        res = transcriber(outfile, generate_kwargs={"language": "german"})
        t7 = time.time()
        print(f"Transcription took {t7 - t6:.2f} seconds.")
        print(f"Transcription with model loading took {t7 - t6 + (t1-t0):.2f} seconds.")
        print(res.__str__())
        print("Finished transcription, passing to llm")
        await out_queue.put(res['text'])
        speech_event.set()




class MonitorDirectory(FileSystemEventHandler):
    def __init__(self, loop, queue):
        self.loop = loop
        self.queue = queue

    #def on_any_event(self, event):
    #    print(event)
    #    print(event.event_type)
    #    print(event.src_path.split('\\')[-1])

    def on_created(self, event):
        # Run function when a file is moved to the directory
        filename = event.src_path.split('\\')[-1]
        if not event.is_directory:
            print("File Created")
            #speech_queue.put(filename)
            # asyncio.run_coroutine_threadsafe(self.handle_modified(event), self.loop)

    # only for testing text to speech
    def on_modified(self, event):
        print("File Modified")
        future = asyncio.run_coroutine_threadsafe(self.handle_modified(event), self.loop)

        # Optionally, check for errors
        try:
            future.result(timeout=90)  # Wait up to 2s for the coroutine to finish
        except Exception as e:
            print("[ERROR] Coroutine failed:")
            traceback.print_exception(type(e), e, e.__traceback__)


    async def handle_modified(self, event):
        print("Coroutine started")
        filename = event.src_path.split('\\')[-1]
        if not event.is_directory:
            await self.queue.put(filename)
            print("queue filled")


def start_observer(loop, queue, path):
    event_handler = MonitorDirectory(loop, queue)
    observer = Observer()
    observer.schedule(event_handler, path, recursive=False)
    observer.start()
    print("[Observer] Started watching", path)
    observer.join()

# threading.Thread(target=speechToJson, daemon=True).start()
# threading.Thread(target=waitForInput, daemon=True).start()

async def main():
    loop = asyncio.get_running_loop()
    text_queue = asyncio.Queue()
    speech_queue = asyncio.Queue()
    llm_queue = asyncio.Queue()
    client = ws.WebSocketClient("ws://localhost:8080", text_queue)
    asyncio.create_task(tts.get_audio(text_queue))
    asyncio.create_task(speechToJson(speech_queue, llm_queue, client))
    asyncio.create_task(waitForInput(llm_queue, client))
    await client.connect()
    await client.send_message("sp")
    path = pathlib.Path("data/in").resolve()
    print(path)
    threading.Thread(target=start_observer, args=(loop, speech_queue, path), daemon=True).start()
    print("Observer thread launched")

    while True:
        #get_audio(wsClient.get_message())
        # llm_event.wait()
        # speech_event.wait()
        await asyncio.sleep(1)
        llm_event.clear()
        speech_event.clear()
        print("Ready for next job")


if __name__ == "__main__":
    asyncio.run(main())
