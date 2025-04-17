const Text2Audio = {
    "type": "GENERATE_AUDIO_REQUEST",
    "message": {
        "fileName":"idOrSomething",
        "text":"Test audio generation"
               }
}

const Audio2Text = {
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

module.exports = {Text2Audio,Audio2Text};
