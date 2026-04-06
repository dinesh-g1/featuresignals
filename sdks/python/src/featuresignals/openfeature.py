"""OpenFeature provider for FeatureSignals.

Implements the OpenFeature provider interface so FeatureSignals can be
used via the vendor-neutral OpenFeature SDK:

    from openfeature import api as of_api
    from openfeature.provider import AbstractProvider

    from featuresignals.openfeature import FeatureSignalsProvider

    provider = FeatureSignalsProvider("sdk-key", ClientOptions(env_key="production"))
    of_api.set_provider(provider)
    client = of_api.get_client()
    value = client.get_boolean_value("my-flag", False)

Requires: openfeature-sdk >= 0.7.0
"""

from __future__ import annotations

from typing import Any, List, Optional, Union

from openfeature.exception import ErrorCode
from openfeature.flag_evaluation import FlagResolutionDetails, Reason
from openfeature.hook import Hook
from openfeature.provider import AbstractProvider, Metadata

from .client import FeatureSignalsClient, ClientOptions


class FeatureSignalsProvider(AbstractProvider):
    """OpenFeature-compliant provider backed by FeatureSignalsClient.

    All evaluations are local lookups against the client's cached flags.
    """

    def __init__(self, sdk_key: str, options: ClientOptions) -> None:
        self._client = FeatureSignalsClient(sdk_key, options)

    @property
    def client(self) -> FeatureSignalsClient:
        return self._client

    def get_metadata(self) -> Metadata:
        return Metadata(name="featuresignals")

    def get_provider_hooks(self) -> List[Hook]:
        return []

    def initialize(self, evaluation_context: Optional[dict[str, Any]] = None) -> None:
        self._client.wait_for_ready(timeout=30.0)

    def shutdown(self) -> None:
        self._client.close()

    def resolve_boolean_details(
        self,
        flag_key: str,
        default_value: bool,
        evaluation_context: Optional[dict[str, Any]] = None,
    ) -> FlagResolutionDetails[bool]:
        return self._resolve(flag_key, default_value, bool)

    def resolve_string_details(
        self,
        flag_key: str,
        default_value: str,
        evaluation_context: Optional[dict[str, Any]] = None,
    ) -> FlagResolutionDetails[str]:
        return self._resolve(flag_key, default_value, str)

    def resolve_integer_details(
        self,
        flag_key: str,
        default_value: int,
        evaluation_context: Optional[dict[str, Any]] = None,
    ) -> FlagResolutionDetails[int]:
        return self._resolve(flag_key, default_value, (int, float))

    def resolve_float_details(
        self,
        flag_key: str,
        default_value: float,
        evaluation_context: Optional[dict[str, Any]] = None,
    ) -> FlagResolutionDetails[float]:
        return self._resolve(flag_key, default_value, (int, float))

    def resolve_object_details(
        self,
        flag_key: str,
        default_value: Any,
        evaluation_context: Optional[dict[str, Any]] = None,
    ) -> FlagResolutionDetails[Any]:
        flags = self._client.all_flags()
        val = flags.get(flag_key)
        if val is None and flag_key not in flags:
            return FlagResolutionDetails(
                value=default_value,
                reason=Reason.ERROR,
                error_code=ErrorCode.FLAG_NOT_FOUND,
                error_message=f"flag '{flag_key}' not found",
            )
        return FlagResolutionDetails(value=val, reason=Reason.CACHED)

    def _resolve(
        self,
        flag_key: str,
        default: Any,
        expected_type: Union[type, tuple[type, ...]],
    ) -> FlagResolutionDetails[Any]:
        flags = self._client.all_flags()
        val = flags.get(flag_key)
        if val is None and flag_key not in flags:
            return FlagResolutionDetails(
                value=default,
                reason=Reason.ERROR,
                error_code=ErrorCode.FLAG_NOT_FOUND,
                error_message=f"flag '{flag_key}' not found",
            )
        if not isinstance(val, expected_type):
            return FlagResolutionDetails(
                value=default,
                reason=Reason.ERROR,
                error_code=ErrorCode.TYPE_MISMATCH,
                error_message=f"expected {expected_type}, got {type(val).__name__}",
            )
        return FlagResolutionDetails(value=val, reason=Reason.CACHED)
