"""ABM SDK data types — Python dataclasses matching the cross-language contract.

See: product/wiki/public/ABM_SDK_SPECIFICATION.md §2 — Data Types
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class ABMConfig:
    """Configuration for the ABM client.

    Attributes:
        environment_key: Server-side environment key for the ABM API.
        base_url: FeatureSignals API base URL.
        cache_ttl_seconds: How long resolved behaviors are cached locally.
            Default 60. Set to 0 to disable caching.
        max_cache_entries: Maximum number of cache entries before LRU eviction.
            Default 10000.
        timeout_seconds: HTTP request timeout in seconds. Default 10.
    """

    environment_key: str
    base_url: str = "https://app.featuresignals.com"
    cache_ttl_seconds: int = 10  # Per ABM_SDK_SPECIFICATION.md §1.3
    max_cache_entries: int = 10000
    timeout_seconds: float = 10.0


@dataclass
class ResolveRequest:
    """Request to resolve which behavior variant an agent should use.

    Attributes:
        behavior_key: The behavior key to resolve (e.g., "search-ranking").
        agent_id: Unique identifier for the agent instance.
        agent_type: The type/category of agent (e.g., "recommender").
        user_id: Optional end-user identifier.
        attributes: Arbitrary key-value pairs for targeting.
        session_id: Optional session identifier for sticky behaviors.
    """

    behavior_key: str
    agent_id: str
    agent_type: str
    user_id: Optional[str] = None
    attributes: Optional[dict[str, Any]] = None
    session_id: Optional[str] = None


@dataclass
class ResolveResponse:
    """Result of resolving a behavior.

    Attributes:
        behavior_key: The behavior key that was resolved.
        variant: The selected variant name.
        config: Arbitrary configuration for the variant (JSON).
        reason: Why this variant was selected
            ("targeting_match", "default", "percentage_rollout", "fallback").
        resolved_at: UTC timestamp of resolution (seconds since epoch).
        is_sticky: Whether this resolution should persist for the session.
        ttl_seconds: Cache TTL recommended by the server.
    """

    behavior_key: str
    variant: str
    config: Optional[dict[str, Any]] = None
    reason: str = "default"
    resolved_at: float = field(default_factory=time.time)
    is_sticky: bool = False
    ttl_seconds: int = 10  # Per ABM_SDK_SPECIFICATION.md §1.3


@dataclass
class TrackEvent:
    """An agent behavior event for analytics and billing.

    Attributes:
        behavior_key: The behavior key this event relates to.
        agent_id: Unique identifier for the agent instance.
        agent_type: The type/category of agent.
        variant: The variant that was applied.
        action: The action taken (e.g., "behavior.applied", "search.ranked").
        outcome: Optional outcome classification (e.g., "displayed", "clicked").
        value: Optional numeric value for cost/billing attribution.
        metadata: Arbitrary key-value metadata.
        user_id: Optional end-user identifier.
        session_id: Optional session identifier.
        recorded_at: UTC timestamp (set by client if not provided).
    """

    behavior_key: str
    agent_id: str
    agent_type: str
    variant: str
    action: str
    outcome: Optional[str] = None
    value: Optional[float] = None
    metadata: Optional[dict[str, Any]] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    recorded_at: Optional[float] = None
