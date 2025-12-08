package noisesensor.data.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import noisesensor.data.model.DailyNoiseModel;

import java.time.LocalDateTime;
import java.util.UUID;

@ApplicationScoped
public class DailyNoiseRepository implements PanacheRepository<DailyNoiseModel> {
    public DailyNoiseModel findByUuid(UUID id){
        return find("id", id).firstResult();
    }

    public void deleteByUuid(UUID id){
        delete("id", id);
    }

    public void deleteOlderThan(LocalDateTime minusDays) {
        delete("date < ?1", minusDays.toLocalDate());
    }
}
