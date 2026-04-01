from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any


@dataclass
class EvalContext:
    """Represents the user/entity being evaluated."""

    key: str
    attributes: dict[str, Any] = field(default_factory=dict)

    def with_attribute(self, name: str, value: Any) -> EvalContext:
        """Return a copy with an additional attribute."""
        attrs = {**self.attributes, name: value}
        return EvalContext(key=self.key, attributes=attrs)
