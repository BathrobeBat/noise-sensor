package noisesensor.utils;

public interface IHttpError {
    RuntimeException get(Object... args);

    void throwException(Object... args);
}
