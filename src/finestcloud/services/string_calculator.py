"""
String Calculator for Solar Panel Electrical System Design
Implements basic string planning and electrical component calculations
"""

import math
from dataclasses import dataclass


@dataclass
class InverterSpec:
    """Inverter specifications for string planning"""

    max_dc_voltage: int = 1000  # Maximum DC input voltage (V)
    min_dc_voltage: int = 200  # Minimum DC input voltage (V)
    max_dc_current: float = 15.0  # Maximum DC input current (A)
    max_power_kw: float = 10.0  # Maximum power rating (kW)
    efficiency: float = 0.97  # Inverter efficiency
    mppt_channels: int = 2  # Number of MPPT inputs


@dataclass
class StringConfiguration:
    """Configuration for a single string"""

    string_id: int
    panel_count: int
    total_voltage: float
    total_current: float
    total_power: float
    panels_per_string: int


@dataclass
class ElectricalSystem:
    """Complete electrical system design"""

    total_strings: int
    inverter_count: int
    inverter_size_kw: float
    string_configurations: list[StringConfiguration]
    dc_ac_ratio: float
    estimated_wire_length: float
    electrical_components: dict


class StringCalculator:
    """Basic string calculator for solar panel systems"""

    def __init__(self, inverter_spec: InverterSpec | None = None):
        self.inverter_spec = inverter_spec or InverterSpec()

        # Panel voltage specifications (typical values)
        self.panel_specs = {
            "standard": {
                "voc": 49.5,  # Open circuit voltage (V)
                "vmp": 41.2,  # Maximum power voltage (V)
                "imp": 9.7,  # Maximum power current (A)
                "isc": 10.3,  # Short circuit current (A)
                "power": 400,  # Power rating (W)
            },
            "premium": {
                "voc": 51.8,
                "vmp": 43.1,
                "imp": 10.4,
                "isc": 11.1,
                "power": 450,
            },
            "compact": {"voc": 46.2, "vmp": 38.5, "imp": 9.1, "isc": 9.8, "power": 350},
        }

    def calculate_system_design(
        self,
        total_panels: int,
        module_type: str = "standard",
        temperature_factor: float = 1.2,  # Safety factor for cold weather voltage increase
    ) -> ElectricalSystem:
        """
        Calculate optimal string configuration for given panel count

        Args:
            total_panels: Total number of panels in the system
            module_type: Type of solar module ('standard', 'premium', 'compact')
            temperature_factor: Temperature derating factor for voltage

        Returns:
            ElectricalSystem: Complete electrical system configuration
        """
        if total_panels == 0:
            return self._empty_system()

        panel_spec = self.panel_specs.get(module_type, self.panel_specs["standard"])

        # Calculate optimal panels per string considering voltage constraints
        max_panels_per_string = self._calculate_max_panels_per_string(
            panel_spec, temperature_factor
        )

        # Calculate optimal string configuration
        optimal_panels_per_string = self._find_optimal_string_size(
            total_panels, max_panels_per_string
        )

        # Calculate number of strings
        total_strings = math.ceil(total_panels / optimal_panels_per_string)

        # Create string configurations
        string_configurations = self._create_string_configurations(
            total_panels, optimal_panels_per_string, panel_spec
        )

        # Calculate inverter requirements
        total_power_kw = (total_panels * panel_spec["power"]) / 1000
        inverter_count, inverter_size_kw = self._calculate_inverter_requirements(
            total_power_kw, total_strings
        )

        # Calculate DC/AC ratio
        dc_ac_ratio = total_power_kw / (inverter_count * inverter_size_kw)

        # Estimate electrical components
        electrical_components = self._estimate_electrical_components(
            total_strings, total_power_kw, inverter_count
        )

        # Estimate wire length (rough calculation)
        estimated_wire_length = self._estimate_wire_length(total_strings, total_panels)

        return ElectricalSystem(
            total_strings=total_strings,
            inverter_count=inverter_count,
            inverter_size_kw=inverter_size_kw,
            string_configurations=string_configurations,
            dc_ac_ratio=round(dc_ac_ratio, 2),
            estimated_wire_length=estimated_wire_length,
            electrical_components=electrical_components,
        )

    def _calculate_max_panels_per_string(
        self, panel_spec: dict, temperature_factor: float
    ) -> int:
        """Calculate maximum panels per string based on voltage constraints"""
        # Use open circuit voltage for worst-case scenario (cold weather)
        max_string_voltage = panel_spec["voc"] * temperature_factor
        max_panels = int(self.inverter_spec.max_dc_voltage / max_string_voltage)

        # Ensure we have at least minimum voltage
        min_panels = math.ceil(self.inverter_spec.min_dc_voltage / panel_spec["vmp"])

        return max(
            min_panels, min(max_panels, 20)
        )  # Cap at 20 panels for practical reasons

    def _find_optimal_string_size(
        self, total_panels: int, max_panels_per_string: int
    ) -> int:
        """Find optimal string size to minimize waste"""
        if total_panels <= max_panels_per_string:
            return total_panels

        # Try different string sizes to minimize unused panels
        best_string_size = max_panels_per_string
        min_waste = total_panels % max_panels_per_string

        for string_size in range(8, max_panels_per_string + 1):
            waste = total_panels % string_size
            if waste < min_waste:
                min_waste = waste
                best_string_size = string_size

        return best_string_size

    def _create_string_configurations(
        self, total_panels: int, panels_per_string: int, panel_spec: dict
    ) -> list[StringConfiguration]:
        """Create individual string configurations"""
        configurations = []
        remaining_panels = total_panels
        string_id = 1

        while remaining_panels > 0:
            panels_in_string = min(remaining_panels, panels_per_string)

            # Calculate string electrical properties
            string_voltage = panels_in_string * panel_spec["vmp"]
            string_current = panel_spec["imp"]
            string_power = panels_in_string * panel_spec["power"]

            configurations.append(
                StringConfiguration(
                    string_id=string_id,
                    panel_count=panels_in_string,
                    total_voltage=round(string_voltage, 1),
                    total_current=round(string_current, 1),
                    total_power=round(string_power, 0),
                    panels_per_string=panels_in_string,
                )
            )

            remaining_panels -= panels_in_string
            string_id += 1

        return configurations

    def _calculate_inverter_requirements(
        self, total_power_kw: float, total_strings: int
    ) -> tuple[int, float]:
        """Calculate number and size of inverters needed"""
        # Basic inverter sizing - aim for 110-120% DC/AC ratio
        target_ac_power = total_power_kw / 1.15  # Target 115% DC/AC ratio

        # Determine number of inverters
        inverters_needed = math.ceil(target_ac_power / self.inverter_spec.max_power_kw)

        # Calculate size per inverter
        power_per_inverter = target_ac_power / inverters_needed

        # Round up to common inverter sizes
        standard_sizes = [3, 5, 6, 8, 10, 12, 15, 20, 25]
        inverter_size = next(
            (size for size in standard_sizes if size >= power_per_inverter),
            standard_sizes[-1],
        )

        return inverters_needed, inverter_size

    def _estimate_electrical_components(
        self, total_strings: int, total_power_kw: float, inverter_count: int
    ) -> dict:
        """Estimate required electrical components"""
        return {
            "combiner_boxes": max(
                1, math.ceil(total_strings / 8)
            ),  # 8 strings per combiner
            "dc_disconnects": inverter_count,
            "ac_disconnect": 1,
            "production_meter": 1 if total_power_kw > 10 else 0,
            "monitoring_system": 1,
            "grounding_equipment": 1,
            "surge_protectors": inverter_count,
        }

    def _estimate_wire_length(self, total_strings: int, total_panels: int) -> float:
        """Rough estimate of total wire length needed"""
        # Basic estimation: average 15m per string + 30m AC run
        dc_wire_length = total_strings * 15  # meters
        ac_wire_length = 30  # meters
        return dc_wire_length + ac_wire_length

    def _empty_system(self) -> ElectricalSystem:
        """Return empty electrical system for zero panels"""
        return ElectricalSystem(
            total_strings=0,
            inverter_count=0,
            inverter_size_kw=0,
            string_configurations=[],
            dc_ac_ratio=0,
            estimated_wire_length=0,
            electrical_components={},
        )
