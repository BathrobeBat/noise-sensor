package noisesensor.data.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import noisesensor.data.model.NoiseModel;
import noisesensor.data.model.SensorModel;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class NoiseRepository implements PanacheRepository<NoiseModel> {
    public NoiseModel findByUuid(UUID id){
        return find("id", id).firstResult();
    }

    public void deleteByUuid(UUID id){
        delete("id", id);
    }

    public List<NoiseModel> findBySensorAndDateRange(SensorModel sensor, LocalDateTime startOfDay,
            LocalDateTime endOfDay) {
        return list("sensor = ?1 and timestamp >= ?2 and timestamp <= ?3", sensor, startOfDay, endOfDay);
    }

    @Transactional
    public void deleteOlderThan(LocalDateTime minusDays) {
        delete("timestamp < ?1", minusDays);
    }
}
