package com.featuresignals.sdk;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public class EvalContext {
    private final String key;
    private final Map<String, Object> attributes;

    public EvalContext(String key) {
        this(key, Collections.emptyMap());
    }

    public EvalContext(String key, Map<String, Object> attributes) {
        this.key = key;
        this.attributes = Collections.unmodifiableMap(new HashMap<>(attributes));
    }

    public String getKey() { return key; }
    public Map<String, Object> getAttributes() { return attributes; }

    public EvalContext withAttribute(String name, Object value) {
        Map<String, Object> newAttrs = new HashMap<>(this.attributes);
        newAttrs.put(name, value);
        return new EvalContext(this.key, newAttrs);
    }
}
