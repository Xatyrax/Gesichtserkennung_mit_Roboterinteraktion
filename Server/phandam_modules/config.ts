let fixedValues = {
    NotUsedVariableString: '',
    NotUsedVariableDate: new Date(1900,0,0,0,0,0),
    TermindauerInMinuten: 30,
    OeffnungszeitVon: 8, //Nur volle Stunden
    OeffnungszeitBis: 17, //Nur volle Stunden
    MaximaleVerfruehungsDauerInMinuten:15,
    MaximaleVerspaetungsDauerInMinuten:15,
    TimeoutSpracheInSekunden: 180,
    TimeoutAudiogenerierungInSekunden: 120,
    TimeoutGesichtInSekunden: 180,
    TimeoutRoboterInSekunden: 240,
    TimeoutPatient: 180,
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
