package noisesensor.domain.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import org.hibernate.exception.ConstraintViolationException;

import io.vertx.core.json.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;
import noisesensor.data.model.SensorModel;
import noisesensor.data.model.LocationModel;
import noisesensor.data.model.NoiseModel;
import noisesensor.data.repository.SensorRepository;
import noisesensor.data.repository.LocationRepository;
import noisesensor.data.repository.NoiseRepository;

@ApplicationScoped
public class SensorCommunityService {

    @Inject
    SensorRepository sensorRepository;

    @Inject
    LocationRepository locationRepository;

    @Inject
    NoiseRepository noiseRepository;
    
    // Transforming the raw JSON string into a JsonArray
    public JsonArray processData(String string) {
        if (string != null && !string.isEmpty()) {
            System.out.println("processData : " + string.length() + " caracters");
            JsonArray jsonArray = new JsonArray(string);
            return jsonArray;
        } else {
            System.out.println("processData dataJson : null or nothing");
            throw new IllegalArgumentException("Input string is null or empty");
        }
    }

    // Filtering the data to only take the noise sensors
    public JsonArray filterData(JsonArray jsonArray) {
        JsonArray filteredJsonArray = new JsonArray();

        for (int i = 0; i < jsonArray.size(); i++) {
            JsonObject object = jsonArray.getJsonObject(i);
            JsonArray dataValues = (JsonArray)object.getJsonArray("sensordatavalues");
            JsonArray tempArray = new JsonArray();
            for (int j = 0; j < dataValues.size(); j++) {
                if (dataValues.getJsonObject(j).getString("value_type").matches("^noise.*")) {
                    JsonObject tmp = transformData(object);
                    tempArray.add(tmp);
                    break;
                }
            }
            filteredJsonArray.addAll(tempArray);
        }
        
        return filteredJsonArray;
    }

    // Transform a single JsonObject to the desired structure (with noise values)
    public JsonObject transformData(JsonObject jsonObject) {
        JsonObject newObject = new JsonObject();
        newObject.put("sensor_id", jsonObject.getJsonObject("sensor").getInteger("id"));
        newObject.put("timestamp", jsonObject.getString("timestamp"));

        newObject.put("location_id", jsonObject.getJsonObject("location").getInteger("id"));
        newObject.put("country", jsonObject.getJsonObject("location").getString("country"));
        newObject.put("latitude", jsonObject.getJsonObject("location").getString("latitude"));
        newObject.put("longitude", jsonObject.getJsonObject("location").getString("longitude"));
        newObject.put("altitude", jsonObject.getJsonObject("location").getString("altitude"));
        // Convert int (0 or 1) to boolean
        boolean indoor = jsonObject.getJsonObject("location").getInteger("indoor", 0) == 1;
        newObject.put("indoor", indoor);

        JsonArray tmp = jsonObject.getJsonArray("sensordatavalues");
        String noise_LAeq = tmp.getJsonObject(0).getString("value");
        newObject.put("noise_LAeq", noise_LAeq);
        newObject.put("noise_LAmax", tmp.size() > 1 ? tmp.getJsonObject(1).getString("value") : noise_LAeq);
        newObject.put("noise_LAmin", tmp.size() > 2 ? tmp.getJsonObject(2).getString("value") : noise_LAeq);
        return newObject;
    }

    // Store the filtered data (sensors and locations) into the database (and noise values if storeNoise is true)
    @Transactional
    public int storeSensor(JsonArray filteredJsonArray, boolean storeNoise) {
        for (Object tmp : filteredJsonArray) {
            if (tmp instanceof JsonObject) {
                JsonObject object = (JsonObject) tmp;

                // 1. Check if LocationModel exists
                LocationModel location = locationRepository.findBySensorCommunityLocationId(object.getInteger("location_id"));
                if (location == null) {
                    try {
                        location = locationRepository.createLocation(object.getString("country"),
                                                        Integer.parseInt(object.getString("location_id")),
                                                        Float.parseFloat(object.getString("latitude")),
                                                        Float.parseFloat(object.getString("longitude")),
                                                        Float.parseFloat(object.getString("altitude")),
                                                        Boolean.parseBoolean(object.getString("indoor")));
                    } catch (PersistenceException e) {
                        if (e.getCause() instanceof ConstraintViolationException) {
                            location = locationRepository.findBySensorCommunityLocationId(object.getInteger("location_id"));
                        } else {
                            throw e;
                        }
                    }
                }

                // 2. Check if SensorModel exists for this location
                SensorModel sensor = sensorRepository.findBySensorCommunitySensorId(object.getInteger("sensor_id"));
                if (sensor == null) {
                    sensor = new SensorModel();
                    sensor.setLocation(location);
                    sensor.setSource("sensorcommunity");
                    sensor.setSensor_community_sensor_id(object.getInteger("sensor_id"));
                    sensorRepository.persist(sensor);
                }

                if (!storeNoise) {
                    continue;
                }
                
                // 3. Parse date
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                LocalDateTime date = LocalDateTime.parse(object.getString("timestamp"), formatter);

                // 4. Create and persist NoiseModel
                NoiseModel noise = new NoiseModel();
                noise.setSensor(sensor);
                noise.setTimestamp(date);
                noise.setNoise_LAeq(Float.parseFloat(object.getString("noise_LAeq")));
                noise.setNoise_LAmax(Float.parseFloat(object.getString("noise_LAmax")));
                noise.setNoise_LAmin(Float.parseFloat(object.getString("noise_LAmin")));
                noiseRepository.persist(noise);
            }
        }

        sensorRepository.flush();
        locationRepository.flush();
        noiseRepository.flush();
        return filteredJsonArray.size();
    }
}