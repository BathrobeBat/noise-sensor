package noisesensor.common.api.request;

import lombok.*;

@AllArgsConstructor
@Setter
@Getter
@NoArgsConstructor
public class SubscribeRequest {    
    String country;
    Float latitude;
    Float longitude;
    Float altitude = 0f;
    Boolean indoor;
}
