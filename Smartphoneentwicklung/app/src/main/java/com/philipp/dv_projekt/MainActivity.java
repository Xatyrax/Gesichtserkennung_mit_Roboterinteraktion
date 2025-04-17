package com.philipp.dv_projekt;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Dialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Bundle;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import android.widget.Button;
import android.widget.ImageView;
import android.widget.Toast;
import java.io.File;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import okhttp3.OkHttpClient;

public class MainActivity extends AppCompatActivity implements View.OnClickListener, WebSocketCallback {

    private static final long TIMEOUT_IN_MILLIS = 10_000;  // Muss noch auf 30_000 gesetzt werden (am ende)
    private final Handler timeoutHandler = new Handler(Looper.getMainLooper());
    private Runnable timeoutRunnable;
    private ListenableFuture<ProcessCameraProvider> cameraProviderFuture;
    private PreviewView previewView;
    private ImageCapture imageCapture;
    private MediaPlayer player;
    private final OkHttpClient client = new OkHttpClient();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        Button bBildAufnehmen = findViewById(R.id.bCapture);
        previewView = findViewById(R.id.previewView);

        WebSocketClient webSocketClient = new WebSocketClient();
        webSocketClient.setCallback(this);
        webSocketClient.connect(client);

        getWindow().setStatusBarColor(ContextCompat.getColor(this, android.R.color.black));

        bBildAufnehmen.setOnClickListener(this);

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, 100);
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.MANAGE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.MANAGE_EXTERNAL_STORAGE}, 100);
        }


        cameraProviderFuture = ProcessCameraProvider.getInstance(this);
        cameraProviderFuture.addListener(() -> {
            try {
                ProcessCameraProvider cameraProvider = cameraProviderFuture.get();
                startCameraX(cameraProvider);
            } catch (ExecutionException e) {
                Log.e("MainActivity", "ExecutionException beim Abrufen des CameraProviders", e);
            } catch (InterruptedException e) {
                Log.e("MainActivity", "InterruptedException beim Abrufen des CameraProviders", e);
            }
        }, getExecutor());

        startInactivityTimeout();

        // Audio abspielen
        if (player == null) {
            player = MediaPlayer.create(MainActivity.this, R.raw.bildaufnehmen);
            player.start();
        }
    }

    private Executor getExecutor() {
        return ContextCompat.getMainExecutor(this);
    }

    @SuppressLint("RestrictedApi")
    private void startCameraX(ProcessCameraProvider cameraProvider) {
        cameraProvider.unbindAll();

        CameraSelector cameraSelector = new CameraSelector.Builder()
                .requireLensFacing(CameraSelector.LENS_FACING_FRONT)
                .build();

        Preview preview = new Preview.Builder().build();

        preview.setSurfaceProvider(previewView.getSurfaceProvider());

        imageCapture = new ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                .build();

        cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageCapture);
    }


    @SuppressLint("RestrictedApi")
    @Override
    public void onClick(View v) {
        if (v.getId() == R.id.bCapture) {
            capturePhoto();
        }
    }

    private void capturePhoto() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 101);
        }

        File photoDir = new File(getExternalFilesDir(Environment.DIRECTORY_PICTURES), "Pictures");
        if (!photoDir.exists() && !photoDir.mkdirs()) {
            Toast.makeText(this, "❌ Fehler: Konnte Verzeichnis nicht erstellen!", Toast.LENGTH_LONG).show();
            return;
        }

        String fileName = "photo_" + System.currentTimeMillis() + ".jpg";
        File photoFile = new File(photoDir, fileName);

        ImageCapture.OutputFileOptions outputFileOptions =
                new ImageCapture.OutputFileOptions.Builder(photoFile).build();

        imageCapture.takePicture(
                outputFileOptions,
                ContextCompat.getMainExecutor(this),
                new ImageCapture.OnImageSavedCallback() {
                    @Override
                    public void onImageSaved(@NonNull ImageCapture.OutputFileResults outputFileResults) {
                        // Der Toast muss später noch weg
                        Toast.makeText(MainActivity.this, "📸 Foto gespeichert!", Toast.LENGTH_SHORT).show();
                        Log.d("MainActivity", "✅ Foto gespeichert unter: " + photoFile.getAbsolutePath());
                        showPhoto(photoFile);
                    }

                    @Override
                    public void onError(@NonNull ImageCaptureException exception) {
                        Toast.makeText(MainActivity.this, "❌ Fehler beim Speichern: " + exception.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                }
        );
    }

    private void showPhoto(File photoFile) {
        Dialog dialog = new Dialog(this);
        dialog.setContentView(R.layout.layout_photo_preview);

        ImageView imageCheckView = dialog.findViewById(R.id.imageCheckView);
        Button imageDeleteBtn = dialog.findViewById(R.id.imageDeleteBtn);
        Button imageAcceptBtn = dialog.findViewById(R.id.imageAcceptBtn);

        imageDeleteBtn.setOnClickListener(v -> {
            if (photoFile.delete()) {
                Toast.makeText(this, "✅ Foto gelöscht!", Toast.LENGTH_SHORT).show();
                dialog.dismiss();
            } else {
                Toast.makeText(this, "❌ Fehler beim Löschen des Fotos!", Toast.LENGTH_SHORT).show();
            }
        });

        imageAcceptBtn.setOnClickListener(v -> {
            Toast.makeText(this, "✅ Foto akzeptiert!", Toast.LENGTH_SHORT).show();
            dialog.dismiss();

            stopInactivityTimeout();

            // Bild hochladen
            UploadHelper.uploadImage(photoFile, "http://192.168.10.128:3000/upload/gesicht", client);

            // Hier wird Audio abgespielt (noch nicht da)
            // player = MediaPlayer.create(MainActivity.this, R.raw.phototoserver);
            // player.start();

            // Nicht erkannt
            //startActivity(new Intent(this, RecordActivity.class));
            // ##############################################
            // Erkannt
            // startActivity(new Intent(this, FollowRoboActivity.class));
            // ##############################################
            // erkannt aber kein Termin
            //startActivity(new Intent(this, RecordTerminActivity.class));
            // ##############################################
            startActivity(new Intent(this, AudioPlayActivity.class));
        });

        imageCheckView.setImageURI(Uri.fromFile(photoFile));

        dialog.show();
    }

    @Override
    public void onMessageReceived(String jsonText) {
        runOnUiThread(() -> {
            ServerResponseHandler handler = new ServerResponseHandler();
            ResponseType type = handler.getResponseType(jsonText);

            switch (type) {
                case KNOWN_CUSTOMER:
                    JsonObject json = JsonParser.parseString(jsonText).getAsJsonObject();
                    String appointment = json.has("Appointment") ? json.get("Appointment").getAsString() : "FALSE";
                    if (appointment.equalsIgnoreCase("TRUE")) {
                        startActivity(new Intent(this, FollowRoboActivity.class));
                    } else {
                        startActivity(new Intent(this, RecordTerminActivity.class));
                    }
                    break;

                case UNKNOWN_CUSTOMER:
                    startActivity(new Intent(this, RecordActivity.class));
                    break;

                default:
                    Toast.makeText(this, "❓ Unbekannte Antwort vom Server", Toast.LENGTH_SHORT).show();
            }

            finish();
        });
    }

    private void startInactivityTimeout() {
        if (timeoutRunnable != null) {
            timeoutHandler.removeCallbacks(timeoutRunnable);
        }

        timeoutRunnable = () -> {
            Intent intent = new Intent(MainActivity.this, SplashActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            finish();
        };

        timeoutHandler.postDelayed(timeoutRunnable, TIMEOUT_IN_MILLIS);
    }

    private void resetInactivityTimeout() {
        startInactivityTimeout();
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        resetInactivityTimeout();
        return super.dispatchTouchEvent(ev);
    }

    private void stopInactivityTimeout() {
        if (timeoutRunnable != null) {
            timeoutHandler.removeCallbacks(timeoutRunnable);
        }
    }


}