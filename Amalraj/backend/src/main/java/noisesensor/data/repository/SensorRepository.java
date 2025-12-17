package noisesensor.data.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import noisesensor.data.model.SensorModel;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class SensorRepository implements PanacheRepository<SensorModel> {
    public SensorModel findByUuid(UUID id){
        return find("id", id).firstResult();
    }

    public SensorModel findBySensorCommunitySensorId(int sensorId){
        return find("sensor_community_sensor_id", sensorId).firstResult();
    }
    
    @Transactional
    public void deleteByUuid(UUID id){
        delete("id", id);
    }

    @Transactional
    public SensorModel createSensor() {
        SensorModel sensor = new SensorModel();
        persist(sensor);
        return sensor;
    }

    public List<SensorModel> findAllSensors() {
        return listAll();
    }
}
