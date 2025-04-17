import subprocess
import asyncio


async def run_command_in_subprocess(command: str, cwd):
    # Use a subprocess shell on Windows.
    proc = await asyncio.create_subprocess_shell(
        command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        shell=True,  # shell should be True to invoke the command shell.
        cwd=cwd
    )

    # Wait for the process to complete.
    stdout, stderr = await proc.communicate()

    # Decode and print output.
    if stdout:
        print(f"[stdout]\n{stdout.decode()}")
    if stderr:
        print(f"[stderr]\n{stderr.decode()}")


async def get_audio(queue):
    piper_path = r"C:\Users\dervi\Desktop\piper"
    piper_command = r'| .\piper.exe '
    modell_hessisch = '-m Thorsten-Voice_Hessisch_Piper_high-Oct2023.onnx '
    modell_normal = '-m de_DE-thorsten-high.onnx '
    output_path = r'-d C:\Users\dervi\PycharmProjects\speechPoc\data\generated'

    while True:
        input = await queue.get()
        input_text = f'echo "{input}" '
        print(input_text)
        command = input_text + piper_command + modell_normal + output_path
        print(command)

        # Run the command in a separate thread using asyncio.to_thread
        await asyncio.create_task(run_command_in_subprocess(command, piper_path))
