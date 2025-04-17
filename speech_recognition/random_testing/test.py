import subprocess


def run_command():
    # Command to run
    command = ['cmd.exe', '/c', 'timeout /t 3 /nobreak && echo Finished']

    # Run the command asynchronously (non-blocking)
    process = subprocess.Popen(command)

    # Continue execution immediately without waiting for the process to finish
    print("Command is running in the background...")

    return process


def main():
    process = run_command()

    # You can continue executing other code here while the process runs
    print("Continuing with other tasks...")

    # If you need the result later, you can call `process.communicate()` to get stdout/stderr.
    stdout, stderr = process.communicate()

    # Print the results after the process finishes
    print("Return code:", process.returncode)


if __name__ == '__main__':
    main()