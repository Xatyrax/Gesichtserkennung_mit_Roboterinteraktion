package com.philipp.dv_projekt;

import androidx.annotation.NonNull;
import okhttp3.*;

public class WebSocketClient {

    private WebSocket webSocket;
    private WebSocketCallback callback;

    public void setCallback(WebSocketCallback callback) {
        this.callback = callback;
    }

    public void connect(OkHttpClient client) {


        Request request = new Request.Builder()
                .url("ws://192.168.10.128:3001") // ← IP des Servers samt port
                .build();

        webSocket = client.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(@NonNull WebSocket webSocket, @NonNull Response response) {
                System.out.println("✅ WebSocket geöffnet!");
                sendMessage("sm");
            }

            @Override
            public void onMessage(@NonNull WebSocket webSocket, @NonNull String text) {
                System.out.println("📨 Nachricht empfangen: " + text);

                /*if (callback != null) {
                    callback.onMessageReceived(text);
                }

                try {
                    ServerResponseHandler handler = new ServerResponseHandler();
                    handler.getResponseType(text);

                } catch (JsonSyntaxException e) {
                    System.out.println("⚠️ Ungültiges JSON: " + text);

                } catch (IllegalStateException e) {
                    System.out.println("⚠️ JSON ist kein Objekt: " + text);
                }*/
            }

            @Override
            public void onFailure(@NonNull WebSocket webSocket, @NonNull Throwable t, Response response) {
                System.out.println("❌ Fehler: " + t.getMessage());
            }
        });

    }

    public void sendMessage(String message) {
        if (webSocket != null) {
            webSocket.send(message);
        }
    }

    public void disconnect() {
        if (webSocket != null) {
            webSocket.close(1000, "App geschlossen");
        }
    }
}
