package noisesensor.common.api.response;

import lombok.Value;

@Value
public class LocationResponse {
    String country;
    Float latitude;
    Float longitude;
    Float altitude;
    Boolean indoor;
}
