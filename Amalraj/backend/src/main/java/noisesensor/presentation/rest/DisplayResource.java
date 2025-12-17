package noisesensor.presentation.rest;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import noisesensor.common.api.response.DisplayResponse;
import noisesensor.common.api.response.LocationResponse;
import noisesensor.common.api.response.NoiseResponse;
import noisesensor.domain.service.DisplayService;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import io.vertx.core.json.JsonObject;

@Path("/api")
public class DisplayResource {

    @Inject
    DisplayService displayService;

    @GET
    @Path("/{mode}/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response sendNoiseData(@PathParam("mode") String mode,
                            @PathParam("id") UUID id) {
        LocalDate date = LocalDate.now();

        JsonObject response = null;
        LocationResponse locationResponse = null;
        List<NoiseResponse> noiseResponses = null;
        DisplayResponse displayResponse = null;
        switch (mode) {
            case "day":
                response = displayService.dailyData(id, date);
                locationResponse = response.getJsonObject("location").mapTo(LocationResponse.class);
                noiseResponses = response.getJsonArray("noises").stream()
                        .map(obj -> ((JsonObject) obj).mapTo(NoiseResponse.class))
                        .toList();

                displayResponse = new DisplayResponse(locationResponse, noiseResponses, response.getString("source"));

                break;

            case "week":
                response = displayService.weeklyData(id, date);
                locationResponse = response.getJsonObject("location").mapTo(LocationResponse.class);
                noiseResponses = response.getJsonArray("noises").stream()
                        .map(obj -> ((JsonObject) obj).mapTo(NoiseResponse.class))
                        .toList();

                displayResponse = new DisplayResponse(locationResponse, noiseResponses, response.getString("source"));

                break;

            case "month":
                response = displayService.monthlyData(id, date);
                locationResponse = response.getJsonObject("location").mapTo(LocationResponse.class);
                noiseResponses = response.getJsonArray("noises").stream()
                        .map(obj -> ((JsonObject) obj).mapTo(NoiseResponse.class))
                        .toList();

                displayResponse = new DisplayResponse(locationResponse, noiseResponses, response.getString("source"));

                break;

            case "alltime":
                response = displayService.allTimeData(id);
                locationResponse = response.getJsonObject("location").mapTo(LocationResponse.class);
                noiseResponses = response.getJsonArray("noises").stream()
                        .map(obj -> ((JsonObject) obj).mapTo(NoiseResponse.class))
                        .toList();

                displayResponse = new DisplayResponse(locationResponse, noiseResponses, response.getString("source"));
                break;
        
            default:
                return Response.status(404).build();

        }
        return Response.ok(displayResponse).build();
    }
    
    @GET
    @Path("/allsensors")
    @Produces(MediaType.APPLICATION_JSON)
    public Response allSensors() {
        List<JsonObject> response = displayService.allSensors();
        return Response.ok(response).build();
    }

    @GET
    @Path("/recentdata/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public NoiseResponse recentDataForOneSensor(@PathParam("id") UUID id) {
        JsonObject response = displayService.recentData(id);
        System.out.println(response);
        java.time.LocalDateTime timestamp = null;
        if (response.getString("timestamp") != null) {
            timestamp = java.time.LocalDateTime.parse(response.getString("timestamp"), java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        }
        Float laeq = response.getString("noise_LAeq") != null ? Float.parseFloat(response.getString("noise_LAeq")) : null;
        Float lamin = response.getString("noise_LA_min") != null ? Float.parseFloat(response.getString("noise_LA_min")) : null;
        Float lamax = response.getString("noise_LA_max") != null ? Float.parseFloat(response.getString("noise_LA_max")) : null;
        NoiseResponse noiseResponse = new NoiseResponse(timestamp, laeq, lamax, lamin);
        return noiseResponse;
    }
}