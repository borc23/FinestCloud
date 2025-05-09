from typing import Any, Dict, List, TypedDict


class DetectionResult(TypedDict):
    success: bool
    roofs: List[Dict[str, Any]]
    objects: List[Dict[str, Any]]


class PanelResult(TypedDict):
    success: bool
    results: Dict[str, Any]


class ModuleResult(TypedDict):
    success: bool
    modules: Dict[str, Any]


class CustomModuleResult(TypedDict):
    success: bool
    module: Dict[str, Any]


class ResetResult(TypedDict):
    success: bool
    message: str
