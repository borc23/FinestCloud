"""PVWatts API service for accurate solar production calculations."""

import logging
from typing import Dict, List, Optional

import requests

logger = logging.getLogger(__name__)


class PVWattsService:
    """Service for interacting with NREL's PVWatts API."""

    BASE_URL = "https://developer.nrel.gov/api/pvwatts/v8.json"

    def __init__(self, api_key: str):
        """
        Initialize PVWatts service.

        Args:
            api_key: NREL API key for PVWatts access
        """
        self.api_key = api_key

    def calculate_production(
        self,
        latitude: float,
        longitude: float,
        system_capacity: float,
        module_type: int = 0,
        array_type: int = 1,
        tilt: float = 20,
        azimuth: float = 180,
        losses: float = 14,
        dc_ac_ratio: float = 1.2,
        inv_eff: float = 96,
        timeframe: str = "monthly",
    ) -> Optional[Dict]:
        """
        Calculate solar production using PVWatts API.

        Args:
            latitude: Site latitude in decimal degrees
            longitude: Site longitude in decimal degrees
            system_capacity: System capacity in kW (DC)
            module_type: Module type (0=Standard, 1=Premium, 2=Thin film)
            array_type: Array type (0=Fixed Open Rack, 1=Fixed Roof Mounted, 2=1-Axis, 3=1-Axis Backtracking, 4=2-Axis)
            tilt: Array tilt angle in degrees (0-90)
            azimuth: Array azimuth angle in degrees (0-360, 180=south)
            losses: System losses in percent (default 14%)
            dc_ac_ratio: DC to AC ratio (default 1.2)
            inv_eff: Inverter efficiency at rated power in percent (default 96%)
            timeframe: 'monthly' or 'hourly' data resolution

        Returns:
            Dictionary with production data or None if request fails
        """
        params = {
            "api_key": self.api_key,
            "lat": latitude,
            "lon": longitude,
            "system_capacity": system_capacity,
            "module_type": module_type,
            "array_type": array_type,
            "tilt": tilt,
            "azimuth": azimuth,
            "losses": losses,
            "dc_ac_ratio": dc_ac_ratio,
            "inv_eff": inv_eff,
            "timeframe": timeframe,
        }

        try:
            logger.info(
                f"Requesting PVWatts data for location ({latitude}, {longitude}), capacity: {system_capacity}kW"
            )
            response = requests.get(self.BASE_URL, params=params, timeout=10)

            logger.debug(f"PVWatts API response status: {response.status_code}")

            response.raise_for_status()
            data = response.json()

            logger.debug(
                f"PVWatts API response data keys: {data.keys() if isinstance(data, dict) else 'not a dict'}"
            )

            if "errors" in data and data["errors"]:
                logger.error(f"PVWatts API errors: {data['errors']}")
                return None

            if "outputs" not in data:
                logger.error(
                    f"PVWatts API response missing 'outputs' key. Full response: {data}"
                )
                return None

            logger.debug("PVWatts data retrieved successfully")
            return data

        except requests.exceptions.RequestException as e:
            logger.error(f"PVWatts API request failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in PVWatts calculation: {str(e)}")
            return None

    def get_monthly_production(
        self,
        latitude: float,
        longitude: float,
        system_capacity: float,
        tilt: float = 20,
        azimuth: float = 180,
    ) -> Optional[Dict]:
        """
        Get monthly production data in a simplified format.

        Args:
            latitude: Site latitude
            longitude: Site longitude
            system_capacity: System capacity in kW
            tilt: Array tilt (roof pitch)
            azimuth: Array direction (180=south, 270=west, 90=east)

        Returns:
            Dictionary with monthly and annual production data
        """
        data = self.calculate_production(
            latitude=latitude,
            longitude=longitude,
            system_capacity=system_capacity,
            tilt=tilt,
            azimuth=azimuth,
            timeframe="monthly",
        )

        if not data or "outputs" not in data:
            return None

        outputs = data["outputs"]

        # Extract monthly production (AC energy in kWh)
        monthly_ac = outputs.get("ac_monthly", [])

        # Calculate totals
        annual_ac = outputs.get("ac_annual", sum(monthly_ac))
        solrad_annual = outputs.get("solrad_annual", 0)

        return {
            "monthly_production": monthly_ac,  # List of 12 monthly values in kWh
            "annual_production": annual_ac,  # Total annual production in kWh
            "capacity_factor": outputs.get(
                "capacity_factor", 0
            ),  # System capacity factor
            "annual_solar_radiation": solrad_annual,  # Average daily solar radiation (kWh/m2/day)
            "station_info": {
                "city": data.get("station_info", {}).get("city", ""),
                "state": data.get("station_info", {}).get("state", ""),
                "distance": data.get("station_info", {}).get("distance", 0),
            },
        }

    def calculate_for_panels(
        self,
        latitude: float,
        longitude: float,
        panel_count: int,
        panel_wattage: float,
        tilt: float = 20,
        azimuth: float = 180,
    ) -> Optional[Dict]:
        """
        Calculate production based on number of panels and their wattage.

        Args:
            latitude: Site latitude
            longitude: Site longitude
            panel_count: Number of panels
            panel_wattage: Wattage per panel in watts
            tilt: Array tilt angle
            azimuth: Array azimuth angle

        Returns:
            Production data dictionary
        """
        # Calculate system capacity in kW
        system_capacity = (panel_count * panel_wattage) / 1000

        return self.get_monthly_production(
            latitude=latitude,
            longitude=longitude,
            system_capacity=system_capacity,
            tilt=tilt,
            azimuth=azimuth,
        )

    def get_month_names(self) -> List[str]:
        """Get list of month names for labeling."""
        return [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ]
