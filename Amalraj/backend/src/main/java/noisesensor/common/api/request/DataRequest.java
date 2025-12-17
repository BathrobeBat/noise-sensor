package noisesensor.common.api.request;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.*;

@AllArgsConstructor
@Setter
@Getter
@NoArgsConstructor
public class DataRequest {
    UUID sensor_id;
    UUID location_id;
    LocalDateTime timestamp;
    
    Float noise_LAeq;
    Float noise_LAmax;
    Float noise_LAmin;
}
