import threading
import queue
import time

from transformers import AutoModelForCausalLM, AutoTokenizer

def main():
    input_queue = queue.Queue()
    event = threading.Event()

    model_name = "Qwen/Qwen2.5-0.5B-Instruct"

    model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype="auto",
            device_map="auto"
            )
    tokenizer = AutoTokenizer.from_pretrained(model_name)

    def waitForInput():
        while True:
            prompt = input_queue.get()
            if prompt == None:
                time.sleep(1)
                print("Nap time zzz")
            print("Starting with prompt: ", prompt)
            messages = [
                {"role": "system", "content": "You are Qwen, created by Alibaba Cloud. Your job is to take sentences "
                                              "said by some people and to format them into a json format. "
                                              "You will usually receive a name, their adress with street number, "
                                              "their city the zipcode and their phone number."
                                              "If you can't detect one of these fields they maybe missing as not all are always present."
                                              "Do not hallucinate in things which werent in the the users prompt"},
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
            print(response)
            event.set()


    thread = threading.Thread(target=waitForInput)
    thread.daemon = True
    thread.start()

    while True:
        event.clear()
        input_text = input("Enter a sentence: ")
        if input_text == "exit":
            print("Quitting gracefully")
            return 1
        input_queue.put(input_text)
        event.wait()
        print("Job done, ready for next job")
        time.sleep(0.1)


if __name__ == '__main__':
    main()
    