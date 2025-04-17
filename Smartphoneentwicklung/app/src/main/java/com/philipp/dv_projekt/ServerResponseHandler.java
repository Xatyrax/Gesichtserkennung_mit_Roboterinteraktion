package com.philipp.dv_projekt;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

public class ServerResponseHandler {

    public ResponseType getResponseType(String jsonString) {
        try {
            JsonObject json = JsonParser.parseString(jsonString).getAsJsonObject();

            if (json.has("type")) {
                String type = json.get("type").getAsString();

                switch (type) {
                    case "Robot_reached_Goal":
                        return ResponseType.ROBOT_REACHED_GOAL;

                    case "Known_Customer":
                        return ResponseType.KNOWN_CUSTOMER;

                    case "Unknown_Customer":
                        return ResponseType.UNKNOWN_CUSTOMER;

                    default:
                        return ResponseType.UNKNOWN;
                }

            } else if (json.has("Success") && json.get("Success").getAsString().equals("TRUE") && json.get("message").isJsonObject()) {
                return ResponseType.PERSON_DATA;

            } else if (json.has("Success") && json.get("Success").getAsString().equals("FALSE")) {
                return ResponseType.PERSON_DATA_SUCCESS_FALSE;

            } else if (json.has("Success") && json.get("message").isJsonPrimitive()) {
                return ResponseType.TERMIN_INFO;

            } else if (json.has("Date") && json.has("Time") && json.has("Weekday")) {
                return ResponseType.DATE_TIME;

            } else {
                return ResponseType.UNKNOWN;
            }

        } catch (Exception e) {
            return ResponseType.UNKNOWN;
        }
    }
}