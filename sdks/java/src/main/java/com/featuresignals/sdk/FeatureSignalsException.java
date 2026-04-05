package com.featuresignals.sdk;

/**
 * Base exception for all FeatureSignals SDK errors.
 *
 * <p>Wraps HTTP failures, deserialization errors, and other SDK-specific
 * error conditions so callers can distinguish SDK errors from unrelated
 * runtime failures.
 */
public class FeatureSignalsException extends RuntimeException {

    private final int httpStatus;

    public FeatureSignalsException(String message) {
        super(message);
        this.httpStatus = 0;
    }

    public FeatureSignalsException(String message, Throwable cause) {
        super(message, cause);
        this.httpStatus = 0;
    }

    public FeatureSignalsException(String message, int httpStatus) {
        super(message);
        this.httpStatus = httpStatus;
    }

    public FeatureSignalsException(String message, int httpStatus, Throwable cause) {
        super(message, cause);
        this.httpStatus = httpStatus;
    }

    /**
     * Returns the HTTP status code that caused the error, or 0 if not HTTP-related.
     */
    public int getHttpStatus() {
        return httpStatus;
    }
}
