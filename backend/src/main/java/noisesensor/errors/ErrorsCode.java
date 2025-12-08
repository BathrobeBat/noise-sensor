package noisesensor.errors;

import noisesensor.utils.HttpError;
import noisesensor.utils.IHttpError;
import jakarta.ws.rs.core.Response.Status;
import lombok.Getter;

import static jakarta.ws.rs.core.Response.Status.*;


@Getter
public enum ErrorsCode implements IHttpError {
    EXAMPLE_ERROR(BAD_REQUEST, "Example error: %s"),
    ERROR_400(BAD_REQUEST,"%s"),
    ERROR_401(UNAUTHORIZED,"%s"),
    ERROR_404(NOT_FOUND,"%s"),
    ERROR_403(FORBIDDEN,"%s"),
    ERROR_409(CONFLICT,"%s")
    ;

    private final HttpError error;

    ErrorsCode(Status status, String message) {
        error = new HttpError(status, message);
    }

    @Override
    public RuntimeException get(Object... args) {
        return error.get(args);
    }

    @Override
    public void throwException(Object... args) {
        throw error.get(args);
    }
}
