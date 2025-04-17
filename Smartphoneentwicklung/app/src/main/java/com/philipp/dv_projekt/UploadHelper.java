package com.philipp.dv_projekt;

import androidx.annotation.NonNull;

import java.io.File;
import java.io.IOException;

import okhttp3.*;

public class UploadHelper {

    public static void uploadImage(File imageFile, String serverUrl, OkHttpClient client) {

        // MediaType für ein Bild (z.B. JPEG oder PNG)
        MediaType mediaType = MediaType.parse("image/jpeg");

        // RequestBody für die Bilddatei
        RequestBody fileBody = RequestBody.create(imageFile, mediaType);

        // MultipartBody (Formulardaten mit Datei)
        RequestBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("myfile", imageFile.getName(), fileBody)
                // Optional: weitere Felder im Formular
                .build();

        // URL deines Servers
        Request request = new Request.Builder()
                .url(serverUrl)
                .post(requestBody)
                .build();

        // Asynchroner Aufruf
        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                System.out.println("❌ onFailure Fehler :" + e.getMessage());
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                if (response.isSuccessful()) {
                    assert response.body() != null;
                    System.out.println("✅ Upload erfolgreich: " + response.body().string());
                } else {
                    System.out.println("❌ Response Fehler: " + response.code());
                }
            }
        });
    }

    public static void uploadAudio(File audioFile, String serverUrl, OkHttpClient client) {

        // MediaType für eine .m4a-Audiodatei
        MediaType mediaType = MediaType.parse("audio/m4a");

        // RequestBody für die Audiodatei
        RequestBody fileBody = RequestBody.create(audioFile, mediaType);

        // MultipartBody (Formulardaten mit Datei)
        RequestBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("myfile", audioFile.getName(), fileBody) // "audio" statt "image"
                .build();

        // URL deines Servers
        Request request = new Request.Builder()
                .url(serverUrl)
                .post(requestBody)
                .build();

        // Asynchroner Aufruf
        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                System.out.println("❌ Fehler :" + e.getMessage());
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                if (response.isSuccessful()) {
                    assert response.body() != null;
                    System.out.println("✅ Upload erfolgreich: " + response.body().string());
                } else {
                    System.out.println("❌ Fehler: " + response.code());
                }
            }
        });
    }
}
