package noisesensor.common.api.response;

import java.time.LocalDateTime;

import lombok.Value;

@Value
public class NoiseResponse {
    LocalDateTime timestamp;
    
    Float noise_LAeq;
    Float noise_LAmax;
    Float noise_LAmin;
}
