"""OpenFeature provider for FeatureSignals.

Implements the OpenFeature provider interface so FeatureSignals can be
used via the vendor-neutral OpenFeature SDK:

    from openfeature import api
    from featuresignals import FeatureSignalsProvider, ClientOptions

    provider = FeatureSignalsProvider("sdk-key", ClientOptions(env_key="production"))
    api.set_provider(provider)
    client = api.get_client()
    value = client.get_boolean_value("my-flag", False)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from .client import FeatureSignalsClient, ClientOptions


class ErrorCode(str, Enum):
    FLAG_NOT_FOUND = "FLAG_NOT_FOUND"
    TYPE_MISMATCH = "TYPE_MISMATCH"
    GENERAL = "GENERAL"


@dataclass
class ProviderMetadata:
    name: str = "featuresignals"


@dataclass
class ResolutionDetails:
    value: Any
    reason: str = "CACHED"
    error_code: ErrorCode | None = None
    error_message: str | None = None


class FeatureSignalsProvider:
    """OpenFeature-compatible provider backed by FeatureSignalsClient."""

    def __init__(self, sdk_key: str, options: ClientOptions) -> None:
        self._client = FeatureSignalsClient(sdk_key, options)
        self.metadata = ProviderMetadata()

    @property
    def client(self) -> FeatureSignalsClient:
        return self._client

    def resolve_boolean_evaluation(
        self, flag_key: str, default_value: bool, context: dict[str, Any] | None = None
    ) -> ResolutionDetails:
        return self._resolve(flag_key, default_value, bool)

    def resolve_string_evaluation(
        self, flag_key: str, default_value: str, context: dict[str, Any] | None = None
    ) -> ResolutionDetails:
        return self._resolve(flag_key, default_value, str)

    def resolve_integer_evaluation(
        self, flag_key: str, default_value: int, context: dict[str, Any] | None = None
    ) -> ResolutionDetails:
        return self._resolve(flag_key, default_value, (int, float))

    def resolve_float_evaluation(
        self, flag_key: str, default_value: float, context: dict[str, Any] | None = None
    ) -> ResolutionDetails:
        return self._resolve(flag_key, default_value, (int, float))

    def resolve_object_evaluation(
        self, flag_key: str, default_value: Any, context: dict[str, Any] | None = None
    ) -> ResolutionDetails:
        flags = self._client.all_flags()
        val = flags.get(flag_key)
        if val is None:
            return ResolutionDetails(
                value=default_value,
                error_code=ErrorCode.FLAG_NOT_FOUND,
                error_message=f"flag '{flag_key}' not found",
            )
        return ResolutionDetails(value=val)

    def shutdown(self) -> None:
        self._client.close()

    def _resolve(self, flag_key: str, default: Any, expected_type: type | tuple) -> ResolutionDetails:
        flags = self._client.all_flags()
        val = flags.get(flag_key)
        if val is None:
            return ResolutionDetails(
                value=default,
                error_code=ErrorCode.FLAG_NOT_FOUND,
                error_message=f"flag '{flag_key}' not found",
            )
        if not isinstance(val, expected_type):
            return ResolutionDetails(
                value=default,
                error_code=ErrorCode.TYPE_MISMATCH,
                error_message=f"expected {expected_type}, got {type(val).__name__}",
            )
        return ResolutionDetails(value=val)
