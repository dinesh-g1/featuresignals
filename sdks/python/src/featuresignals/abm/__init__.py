"""
FeatureSignals Agent Behavior Mesh (ABM) Python SDK.

ABM is the agent equivalent of feature flags. It allows customer applications
to manage AI agent behaviors — resolving behavior variants, tracking agent
actions, and measuring outcomes — with the same governance and observability
as feature flags.

Basic usage::

    import os
    from featuresignals.abm import ABMClient, ResolveRequest, TrackEvent

    client = ABMClient(
        environment_key=os.environ["FS_ENVIRONMENT_KEY"],
    )

    resp = client.resolve(ResolveRequest(
        behavior_key="search-ranking",
        agent_id="recommender-v2",
        agent_type="recommender",
    ))

    client.track(TrackEvent(
        behavior_key="search-ranking",
        agent_id="recommender-v2",
        variant=resp.variant,
        action="search.ranked",
        outcome="displayed",
    ))
"""

from featuresignals.abm.client import ABMClient, ABMConfig
from featuresignals.abm.types import (
    ResolveRequest,
    ResolveResponse,
    TrackEvent,
)

__all__ = [
    "ABMClient",
    "ABMConfig",
    "ResolveRequest",
    "ResolveResponse",
    "TrackEvent",
]
