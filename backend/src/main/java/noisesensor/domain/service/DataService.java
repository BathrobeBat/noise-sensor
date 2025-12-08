package noisesensor.domain.service;

import java.util.UUID;

import io.vertx.core.json.JsonObject;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import noisesensor.common.api.request.DataRequest;
import noisesensor.common.api.request.SubscribeRequest;
import noisesensor.data.model.LocationModel;
import noisesensor.data.model.NoiseModel;
import noisesensor.data.model.SensorModel;
import noisesensor.data.repository.LocationRepository;
import noisesensor.data.repository.NoiseRepository;
import noisesensor.data.repository.SensorRepository;

@ApplicationScoped
public class DataService {

    @Inject
    SensorRepository sensorRepository;

    @Inject
    LocationRepository locationRepository;

    @Inject
    NoiseRepository noiseRepository;
    
    @Transactional
    public JsonObject registerSensor(SubscribeRequest request) {
        SensorModel sensor = sensorRepository.createSensor();
        LocationModel location = locationRepository.createLocation(request.getCountry(),
                                                            request.getLatitude(),
                                                            request.getLongitude(),
                                                            request.getAltitude(),
                                                            request.getIndoor());

        UUID sensor_id = sensor.getId();
        UUID location_id = location.getId();
        sensor.setLocation(location);
        sensor.setSource("nightingale");
        sensorRepository.persist(sensor);
        JsonObject array = new JsonObject();
        array.put("sensor_id", sensor_id);
        array.put("location_id", location_id);
        return array;
    }

    @Transactional
    public boolean receiveData(DataRequest dataRequest) {
        // 1. Check if SensorModel and LocationModel exist
        SensorModel sensor = sensorRepository.findByUuid(dataRequest.getSensor_id());
        LocationModel location = locationRepository.findByUuid(dataRequest.getLocation_id());
        if (sensor == null || location == null) {
            System.out.println("Sensor or location not found");
            return false;
        }

        // 2. Create and persist NoiseModel
        NoiseModel noise = new NoiseModel();
        noise.setSensor(sensor);
        noise.setTimestamp(dataRequest.getTimestamp());
        noise.setNoise_LAeq(dataRequest.getNoise_LAeq());
        noise.setNoise_LAmax(dataRequest.getNoise_LAmax());
        noise.setNoise_LAmin(dataRequest.getNoise_LAmin());
        noiseRepository.persist(noise);

        return true;
    }
}