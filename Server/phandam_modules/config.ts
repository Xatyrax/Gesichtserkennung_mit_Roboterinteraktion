const fixedValues = {
    NotUsedVariableString: '',
    NotUsedVariableDate: new Date(),
    TermindauerInMinuten: 30,
    OeffnungszeitVon: 8,
    OeffnungszeitBis: 17,
    MaximaleVerspaetungsDauerInMinuten:10,
    TimeoutSpracheInSekunden: 50,
    TimeoutAudiogenerierungInSekunden: 5,
    TimeoutGesichtInSekunden: 50,
    TimeoutRoboterInSekunden: 5,
    websocket_smartphoneID: 'sm',
    websocket_gesichtserkennungID: 'ge',
    websocket_spracherkennungID: 'sp',
    websocket_RoboterID: 'ro',
    gesichtsdateien_speicherort: 'uploads/gesicht/', //Vom Server Root Ordner aus gesehen
    sprachdateien_speicherort: 'uploads/sprache/', //Vom Server Root Ordner aus gesehen
    generierteAudio_dateiname: 'audio.wav', //Vom Server Root Ordner aus gesehen
    generierteAudio_pfad: '' //Wird im Programmverlauf gefüllt
}

export default fixedValues;
