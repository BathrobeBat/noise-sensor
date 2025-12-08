package noisesensor.data.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;
import java.util.UUID;

@With
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Table(name = "sensor")
@Entity
public class SensorModel {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "UUID", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "source")
    private String source;

    @Column(name = "sensor_community_sensor_id", nullable = true, unique = true)
    private Integer sensor_community_sensor_id;

    @OneToOne
    @JoinColumn(name = "location_id", referencedColumnName = "id")
    private LocationModel location;

    @OneToMany(mappedBy = "sensor", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<NoiseModel> noises;

    @OneToMany(mappedBy = "sensor", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DailyNoiseModel> daily_noises;
}