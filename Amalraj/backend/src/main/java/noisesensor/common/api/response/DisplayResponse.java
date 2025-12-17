package noisesensor.common.api.response;

import java.util.List;

import lombok.Value;

@Value
public class DisplayResponse {
    LocationResponse locationResponse;
    List<NoiseResponse> noiseResponses;
    String source;
}
