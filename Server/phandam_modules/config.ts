let fixedValues = {
    NotUsedVariableString: '',
    NotUsedVariableDate: new Date(1900,0,0,0,0,0),
    TermindauerInMinuten: 30,
    OeffnungszeitVon: 8,
    OeffnungszeitBis: 17,
    MaximaleVerfruehungsDauerInMinuten:500,
    MaximaleVerspaetungsDauerInMinuten:500,
    TimeoutSpracheInSekunden: 500,
    TimeoutAudiogenerierungInSekunden: 500,
    TimeoutGesichtInSekunden: 500,
    TimeoutRoboterInSekunden: 500,
    TimeoutPatient: 300,
    TimeoutWorkflow: 120,
    websocket_smartphoneID: 'sm',
    websocket_gesichtserkennungID: 'ge',
    websocket_spracherkennungID: 'sp',
    websocket_RoboterID: 'ro',
    gesichtsdateien_speicherort: 'uploads/gesicht/', //Vom Server Root Ordner aus gesehen
    sprachdateien_speicherort: 'uploads/sprache/', //Vom Server Root Ordner aus gesehen
    generierteAudio_dateiname: 'audio.wav', //Vom Server Root Ordner aus gesehen
    generierteAudio_pfad: '' //Wird im Programmverlauf gefüllt //TODO: Nicht "fixed!" Values
}

export default fixedValues;
