package com.featuresignals.abm;

import com.google.gson.annotations.SerializedName;

/**
 * An agent behavior event for analytics and billing.
 *
 * <p>JSON wire format uses snake_case; Java fields use camelCase with
 * {@link SerializedName} annotations for mapping.
 *
 * <p>PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
 */
public final class TrackEvent {

    @SerializedName("behavior_key")
    private final String behaviorKey;

    @SerializedName("agent_id")
    private final String agentId;

    @SerializedName("variant")
    private final String variant;

    @SerializedName("event")
    private final String event;

    @SerializedName("value")
    private final Double value;  // nullable

    @SerializedName("timestamp")
    private final String timestamp;

    /** Creates a TrackEvent. */
    public TrackEvent(
            String behaviorKey,
            String agentId,
            String variant,
            String event,
            Double value,
            String timestamp) {
        this.behaviorKey = behaviorKey;
        this.agentId = agentId;
        this.variant = variant;
        this.event = event;
        this.value = value;
        this.timestamp = timestamp != null ? timestamp : java.time.Instant.now().toString();
    }

    /** The behavior key this event relates to. */
    public String getBehaviorKey() { return behaviorKey; }

    /** Unique identifier for the agent instance. */
    public String getAgentId() { return agentId; }

    /** The variant that was applied. */
    public String getVariant() { return variant; }

    /** The event name (e.g., "behavior.applied", "behavior.error"). */
    public String getEvent() { return event; }

    /** Optional numeric value (e.g., cost, latency, tokens). May be null. */
    public Double getValue() { return value; }

    /** UTC timestamp (RFC 3339). Set by SDK if not provided. */
    public String getTimestamp() { return timestamp; }

    @Override
    public String toString() {
        return "TrackEvent{" +
                "behaviorKey='" + behaviorKey + '\'' +
                ", agentId='" + agentId + '\'' +
                ", variant='" + variant + '\'' +
                ", event='" + event + '\'' +
                ", value=" + value +
                '}';
    }
}
