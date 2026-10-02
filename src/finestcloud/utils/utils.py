from typing import Any, TypedDict


class DetectionResult(TypedDict):
    success: bool
    roofs: list[dict[str, Any]]
    objects: list[dict[str, Any]]


class PanelResult(TypedDict):
    success: bool
    results: dict[str, Any]


class ModuleResult(TypedDict):
    success: bool
    modules: dict[str, Any]


class CustomModuleResult(TypedDict):
    success: bool
    module: dict[str, Any]


class ResetResult(TypedDict):
    success: bool
    message: str
