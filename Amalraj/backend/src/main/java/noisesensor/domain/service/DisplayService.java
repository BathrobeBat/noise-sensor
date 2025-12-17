package noisesensor.domain.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import io.vertx.core.json.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import noisesensor.data.model.*;
import noisesensor.data.repository.SensorRepository;
import noisesensor.presentation.other.SensorCommunityFetch;

@ApplicationScoped
public class DisplayService {

    @Inject
    SensorRepository sensorRepository;

    @Inject
    SensorCommunityFetch sensorCommunityFetch;
    
    public JsonObject dailyData(UUID id, LocalDate date) {
        String newDate = date.format(DateTimeFormatter.ofPattern("yyyy MMMM d"));
        String string = "We want the data of the day " + newDate;
        System.out.println(string);

        SensorModel sensor = sensorRepository.findByUuid(id);
        JsonObject json = new JsonObject();
        json.put("id", sensor.getId().toString());
        json.put("location", locationModelToJson(sensor.getLocation()));
        String source = sensor.getSource();
        json.put("source", source);
        List<NoiseModel> noises = sensor.getNoises();
        JsonArray noisesArray = new JsonArray();
        for (NoiseModel noise : noises) {
            if (noise.getTimestamp() != null && noise.getTimestamp().toLocalDate().isEqual(date)) {
                noisesArray.add(noiseModelToJson(noise));
            }
        }
        json.put("noises", noisesArray);
        return json;
    }

    public JsonObject weeklyData(UUID id, LocalDate date) {
        LocalDate monday = date.with(WeekFields.of(Locale.getDefault()).dayOfWeek(), 1);
        LocalDate sunday = monday.plusDays(6);
        String newDate = monday.format(DateTimeFormatter.ofPattern("d MMMM"))
                        + " to " + sunday.format(DateTimeFormatter.ofPattern("d MMM yyyy"));
        String string = "We want the data of the week from " + newDate;
        System.out.println(string);

        SensorModel sensor = sensorRepository.findByUuid(id);
        JsonObject json = new JsonObject();
        json.put("id", sensor.getId().toString());
        json.put("location", locationModelToJson(sensor.getLocation()));
        String source = sensor.getSource();
        json.put("source", source);

        List<DailyNoiseModel> noises = sensor.getDaily_noises();
        JsonArray noisesArray = new JsonArray();
        for (DailyNoiseModel noise : noises) {
            if (noise.getDate() != null) {
                LocalDate noiseDate = noise.getDate();
                if ((noiseDate.isEqual(monday) || noiseDate.isAfter(monday)) &&
                    (noiseDate.isEqual(sunday) || noiseDate.isBefore(sunday))) {
                    noisesArray.add(dailyNoiseModelToJson(noise));
                }
            }
        }
        json.put("noises", noisesArray);
        return json;
    }

    public JsonObject monthlyData(UUID id, LocalDate date) {
        String newDate = date.format(DateTimeFormatter.ofPattern("MMMM yyyy"));
        String string = "We want the data of the month " + newDate;
        System.out.println(string);

        SensorModel sensor = sensorRepository.findByUuid(id);
        JsonObject json = new JsonObject();
        json.put("id", sensor.getId().toString());
        json.put("location", locationModelToJson(sensor.getLocation()));
        String source = sensor.getSource();
        json.put("source", source);

        int month = date.getMonthValue();
        int year = date.getYear();
        List<DailyNoiseModel> noises = sensor.getDaily_noises();
        JsonArray noisesArray = new JsonArray();
        for (DailyNoiseModel noise : noises) {
            if (noise.getDate() != null) {
                LocalDate noiseDate = noise.getDate();
                if (noiseDate.getMonthValue() == month && noiseDate.getYear() == year) {
                    noisesArray.add(dailyNoiseModelToJson(noise));
                }
            }
        }
        json.put("noises", noisesArray);
        return json;
    }

    public JsonObject allTimeData(UUID id) {
        SensorModel sensor = sensorRepository.findByUuid(id);
        return sensorModelToJson(sensor);
    }

    public JsonObject sensorModelToJson(SensorModel sensor) {
        JsonObject json = new JsonObject();
        json.put("id", sensor.getId().toString());
        json.put("location", locationModelToJson(sensor.getLocation()));
        String source = sensor.getSource();
        json.put("source", source);

        List<DailyNoiseModel> noises = sensor.getDaily_noises();
        JsonArray noisesArray = new JsonArray();
        for (DailyNoiseModel noise : noises) {
            noisesArray.add(dailyNoiseModelToJson(noise));
        }
        json.put("noises", noisesArray);
        
        return json;
    }

    public JsonObject locationModelToJson(LocationModel location) {
        JsonObject json = new JsonObject();
        json.put("id", location.getId().toString());
        json.put("country", location.getCountry());
        json.put("latitude", location.getLatitude());
        json.put("longitude", location.getLongitude());
        json.put("altitude", location.getAltitude());
        json.put("indoor", location.getIndoor());
        return json;
    }

    public JsonObject noiseModelToJson(NoiseModel noise) {
        JsonObject json = new JsonObject();
        json.put("id", noise.getId().toString());
        json.put("timestamp", noise.getTimestamp() != null ? noise.getTimestamp().toString() : null);
        json.put("noise_LAeq", noise.getNoise_LAeq());
        json.put("noise_LAmax", noise.getNoise_LAmax());
        json.put("noise_LAmin", noise.getNoise_LAmin());
        return json;
    }

    public JsonObject dailyNoiseModelToJson(DailyNoiseModel noise) {
        JsonObject json = new JsonObject();
        json.put("id", noise.getId().toString());
        // Convert LocalDate to timestamp string with 00:00:00 time
        String timestamp = noise.getDate() != null ? noise.getDate().atStartOfDay().toString() : null;
        json.put("timestamp", timestamp);
        json.put("noise_LAeq", noise.getNoise_LAeq());
        json.put("noise_LAmax", noise.getNoise_LAmax());
        json.put("noise_LAmin", noise.getNoise_LAmin());
        return json;
    }

    public List<JsonObject> allSensors() {
        try {
            sensorCommunityFetch.fetchData(false);
        } catch (Exception e) {
            System.err.println("Error in fetchData: " + e.getMessage());
        }
        List<SensorModel> sensors = sensorRepository.findAllSensors();
        List<JsonObject> jsonSensors = sensors.stream()
                .map(sensor -> {
                    JsonObject json = new JsonObject();
                    json.put("id", sensor.getId().toString());
                    json.put("source", sensor.getSource());
                    LocationModel location = sensor.getLocation();
                    if (location != null) {
                        json.put("country", location.getCountry());
                        json.put("latitude", location.getLatitude());
                        json.put("longitude", location.getLongitude());
                    } else {
                        json.put("country", null);
                        json.put("latitude", null);
                        json.put("longitude", null);
                    }
                    return json;
                })
                .toList();
        return jsonSensors;
    }

    public JsonObject recentData(UUID id) {
        String source = sensorRepository.findByUuid(id).getSource();
        if (source.equals("sensorcommunity")) {
            return recentDataSensorCommunity(id);
        } else if (source.equals("nightingale")) {
            return recentDataNightingale(id);
        } else {
            System.out.println("Unknown sensor source: " + source);
            return null;
        }
    }

    private JsonObject recentDataNightingale(UUID id) {
        SensorModel sensor = sensorRepository.findByUuid(id);
        List<NoiseModel> noises = sensor.getNoises();
        if (noises == null || noises.isEmpty()) {
            System.out.println("No noise data found for sensor id: " + id);
            JsonObject json = new JsonObject();
            json.put("timestamp", java.time.LocalDateTime.now()
                                        .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
            json.put("noise_LAeq", 40);
            json.put("noise_LA_max", 50);
            json.put("noise_LA_min", 30);
            return json;

            //return null;
        }
        // Find the most recent noise entry
        NoiseModel recentNoise = noises.stream()
                .filter(noise -> noise.getTimestamp() != null)
                .max((n1, n2) -> n1.getTimestamp().compareTo(n2.getTimestamp()))
                .orElse(null);
        if (recentNoise == null) {
            System.out.println("No valid noise timestamps found for sensor id: " + id);
            return null;
        }
        JsonObject json = new JsonObject();
        json.put("timestamp", recentNoise.getTimestamp().toString());
        json.put("noise_LAeq", recentNoise.getNoise_LAeq());
        json.put("noise_LA_max", recentNoise.getNoise_LAmax());
        json.put("noise_LA_min", recentNoise.getNoise_LAmin());
        return json;
    }

    private JsonObject recentDataSensorCommunity(UUID id) {
        int community_sensor_id = sensorRepository.findByUuid(id).getSensor_community_sensor_id();
        System.out.println("Fetching recent data for community_sensor_id: " + community_sensor_id);

        JsonArray data = sensorCommunityFetch.recentData(community_sensor_id);
        System.out.println("recentData fetched: " + data);
        if (data != null && data.size() > 0) {
            JsonObject json = data.getJsonObject(0);
            JsonObject result = new JsonObject();
            result.put("timestamp", json.getString("timestamp"));

            JsonArray sensordatavalues = json.getJsonArray("sensordatavalues");
            for (Object obj : sensordatavalues) {
                JsonObject sdv = (JsonObject) obj;
                String valueType = sdv.getString("value_type");
                String value = sdv.getString("value");
                result.put(valueType, value);
            }
            
            return result;
        } else {
            return null;
        }
    }
}