package noisesensor.data.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;
import java.time.LocalDateTime;

@With
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Table(name = "noise")
@Entity
public class NoiseModel {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "UUID", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "sensor_id")
    private SensorModel sensor;

    @Column(name = "timestamp")
    private LocalDateTime timestamp;

    @Column(name = "noise_LAeq")
    private float noise_LAeq;

    @Column(name = "noise_LAmax")
    private float noise_LAmax;

    @Column(name = "noise_LAmin")
    private float noise_LAmin;
}