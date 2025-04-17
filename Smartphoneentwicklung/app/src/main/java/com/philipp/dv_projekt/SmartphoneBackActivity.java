package com.philipp.dv_projekt;

import android.content.Intent;
import android.media.MediaPlayer;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.appcompat.app.AppCompatActivity;

public class SmartphoneBackActivity extends AppCompatActivity {

    private MediaPlayer player;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_smartphone_back);


        // Audio abspielen
        if (player == null) {
            player = MediaPlayer.create(SmartphoneBackActivity.this, R.raw.smartphonezurueklegen);

            // Setze OnCompletionListener, um auf das Ende des Audios zu warten
            player.setOnCompletionListener(mediaPlayer -> {

                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    Intent intent = new Intent(SmartphoneBackActivity.this, SplashActivity.class);
                    startActivity(intent);
                    finish();
                }, 5000); // 5 Sekunden warten
            });

            player.start();
        }
    }
}
