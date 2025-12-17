package noisesensor.domain.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import noisesensor.data.model.SensorModel;
import noisesensor.data.model.NoiseModel;
import noisesensor.data.repository.SensorRepository;
import noisesensor.data.repository.NoiseRepository;
import noisesensor.data.model.DailyNoiseModel;
import noisesensor.data.repository.DailyNoiseRepository;

@ApplicationScoped
public class DailyAggregationService {
    
    @Inject
    SensorRepository sensorRepository;

    @Inject
    NoiseRepository noiseRepository;
    
    @Inject
    DailyNoiseRepository dailyNoiseRepository;
    
    @Scheduled(cron = "0 0 1 * * ?") // Every day at 1 AM
    @Transactional
    public void scheduledDailyData() {
        aggregateDailyData();
    }

    @Transactional
    void aggregateDailyData() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalDateTime startOfDay = yesterday.atStartOfDay();
        LocalDateTime endOfDay = yesterday.atTime(23, 59, 59);
        System.out.println("Aggregating daily data for date: " + yesterday);

        List<SensorModel> sensors = sensorRepository.listAll();
        
        for (SensorModel sensor : sensors) {
            // Gather hourly data for the sensor from yesterday
            List<NoiseModel> hourlyData = noiseRepository.findBySensorAndDateRange(
                sensor, startOfDay, endOfDay
            );
            
            if (hourlyData.isEmpty()) continue;
            
            float avgLAeq = (float) hourlyData.stream()
                .mapToDouble(NoiseModel::getNoise_LAeq)
                .average()
                .orElse(0.0);
            
            float maxLAmax = (float) hourlyData.stream()
                .mapToDouble(NoiseModel::getNoise_LAmax)
                .max()
                .orElse(0.0);
            
            float minLAmin = (float) hourlyData.stream()
                .mapToDouble(NoiseModel::getNoise_LAmin)
                .min()
                .orElse(0.0);
            
            // Create and persist the daily aggregation
            DailyNoiseModel dailyNoise = new DailyNoiseModel();
            dailyNoise.setSensor(sensor);
            dailyNoise.setDate(yesterday);
            dailyNoise.setNoise_LAeq(avgLAeq);
            dailyNoise.setNoise_LAmax(maxLAmax);
            dailyNoise.setNoise_LAmin(minLAmin);
            
            dailyNoiseRepository.persist(dailyNoise);
        }
        
        // Delete noise data older than 1 day
        noiseRepository.deleteOlderThan(startOfDay.minusDays(1));

        // Delete daily noise data older than 30 days
        dailyNoiseRepository.deleteOlderThan(startOfDay.minusDays(30));
    }
}