package noisesensor.presentation.other;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import io.vertx.core.json.JsonArray;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import noisesensor.domain.service.SensorCommunityService;
import io.quarkus.scheduler.Scheduled;

@ApplicationScoped
public class SensorCommunityFetch {
    
    @Inject
    SensorCommunityService sensorCommunityService;

    private final HttpClient httpClient;
    
    public SensorCommunityFetch() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();
    }
    
    // Scheduled fetch every hour
    @Scheduled(cron = "0 0 * * * ?")
    public void scheduledFetchData() {
        fetchData(true);
    }

    // Getting the data from the from the sensor.community
    public boolean fetchData(boolean storeNoise) {
        String API_URL = "https://data.sensor.community/static/v2/data.1h.json";
        try {            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL))
                    .timeout(Duration.ofSeconds(60))
                    .header("Accept", "application/json")
                    .header("User-Agent", "NoiseSensor/1.0")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, 
                    HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                String jsonData = response.body();
                System.out.println("fetchData : " + jsonData.length() + " caracters");

                JsonArray processedData = sensorCommunityService.processData(jsonData);
                JsonArray filteredData = sensorCommunityService.filterData(processedData);
                sensorCommunityService.storeSensor(filteredData, storeNoise);

                return true;
            } else {
                System.out.println("HTTP error : " + response.statusCode());
                return false;
            }
        } catch (Exception e) {
            System.out.println("fetchData error : " + e);
            return false;
        }
    }
    
    public JsonArray recentData(Integer id) {
        String API_URL = "https://data.sensor.community/airrohr/v1/sensor/" + id + "/";
        System.out.println(API_URL);
        try {            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL))
                    .timeout(Duration.ofSeconds(60))
                    .header("Accept", "application/json")
                    .header("User-Agent", "NoiseSensor/1.0")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, 
                    HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                String jsonData = response.body();
                System.out.println("recentData : " + jsonData.length() + " caracters");
                JsonArray processedData = sensorCommunityService.processData(jsonData);
                System.out.println("Number of elements stored : " + processedData.size());
                return processedData;
            } else {
                System.out.println("HTTP error : " + response.statusCode());
                return null;
            }
        } catch (Exception e) {
            System.out.println("recentData error : " + e);
            return null;
        }
    }
}