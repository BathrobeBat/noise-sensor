package noisesensor.data.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@With
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Table(name = "location")
@Entity
public class LocationModel {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "UUID", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "sensor_community_location_id", nullable = true, unique = true)
    private Integer sensor_community_location_id;

    @Column(name = "country")
    private String country;

    @Column(name = "latitude")
    private float latitude;

    @Column(name = "longitude")
    private float longitude;

    @Column(name = "altitude")
    private float altitude;

    @Column(name = "indoor")
    private Boolean indoor;
}