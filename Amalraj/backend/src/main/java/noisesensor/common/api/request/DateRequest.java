package noisesensor.common.api.request;

import java.time.LocalDateTime;

import lombok.*;

@AllArgsConstructor
@Setter
@Getter
@NoArgsConstructor
public class DateRequest {
    LocalDateTime date;
}
