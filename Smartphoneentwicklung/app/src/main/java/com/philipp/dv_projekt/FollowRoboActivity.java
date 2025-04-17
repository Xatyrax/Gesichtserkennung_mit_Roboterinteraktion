package com.philipp.dv_projekt;

import android.content.Intent;
import android.media.MediaPlayer;
import android.os.Bundle;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import java.util.Objects;
import okhttp3.OkHttpClient;

public class FollowRoboActivity extends AppCompatActivity implements WebSocketCallback {

    private MediaPlayer player;
    private final OkHttpClient client = new OkHttpClient();
    private final WebSocketClient webSocketClient = new WebSocketClient();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_follow_robo);

        webSocketClient.setCallback(this);
        webSocketClient.connect(client);

    }

    @Override
    public void onMessageReceived(String jsonText) {
        runOnUiThread(() -> {
            ServerResponseHandler handler = new ServerResponseHandler();
            ResponseType type = handler.getResponseType(jsonText);

            if (Objects.requireNonNull(type) == ResponseType.ROBOT_REACHED_GOAL) {
                if (player == null) {
                    player = MediaPlayer.create(FollowRoboActivity.this, R.raw.roboterfolgen);

                    player.setOnCompletionListener(mediaPlayer -> {
                        Intent intentSmartphoneBackActivity = new Intent(FollowRoboActivity.this, SmartphoneBackActivity.class);
                        startActivity(intentSmartphoneBackActivity);
                        finish();
                    });

                    player.start();
                }
            } else {
                Toast.makeText(this, "❓ Unbekannte Antwort vom Server", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
