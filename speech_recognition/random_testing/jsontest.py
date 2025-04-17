from pydantic import BaseModel

class Message(BaseModel):
    fileName: str | None
    text: str

class Event(BaseModel):
    type: str
    message: Message


Text2Audio = {
    "type": "GENERATE_AUDIO_REQUEST",
    "message": {
        "fileName":"idOrSomething",
        "text":"Test audio generation"
               }
}

Audio2Text = {
    "type": "EXTRACT_DATA_FROM_AUDIO_SUCCESS",
    "message": {
        "text":{
            "lastname": "nachname",
            "firstname": "vorname",
            "sex": "M | W | D",
            "dateOfBirth": "01.01.1970",
            "phoneNumber": "0123 7654893",
            "emailAddress": "mail.something@domain.com"}
               }
}

Audio2Command = {
    "type": "EXECUTE_COMMAND_SUCCESS",
    "message": {
        "text":"TRUE | FALSE"
               }
}

errorExample = {
    "type": "XXX_YYY_ERROR",
    "message": {
                "text": "error message"
    }
}



jsonString = """
{
    "type": "GENERATE_AUDIO",
    "message": {
        "fileName":"idOrSomething",
        "text":"Test audio generation"
               }
}
"""