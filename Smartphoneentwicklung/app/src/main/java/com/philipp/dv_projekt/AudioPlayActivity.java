package com.philipp.dv_projekt;

import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Bundle;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import java.io.IOException;

public class AudioPlayActivity extends AppCompatActivity {

    private MediaPlayer player;
    private static final String AUDIO_URL = "http://192.168.10.128:3000/upload/sprache/ausrufUser.mp3";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_audio_play);

        streamAudio();
    }

    private void streamAudio() {
        if (player != null) {
            player.release();
        }

        player = new MediaPlayer();
        player.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build());

        // erst hier start() aufrufen, wenn der Player wirklich vorbereitet ist
        player.setOnPreparedListener(MediaPlayer::start);
        player.setOnCompletionListener(mp -> {
            Toast.makeText(this, "Wiedergabe beendet", Toast.LENGTH_SHORT).show();
            mp.release();
        });

        try {
            player.setDataSource(AudioPlayActivity.AUDIO_URL);
            // nicht direkt start() – erst vorbereiten
            player.prepareAsync();
        } catch (IOException e) {
            Toast.makeText(this, "Fehler beim Starten: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (player != null) {
            player.release();
            player = null;
        }
    }
}
