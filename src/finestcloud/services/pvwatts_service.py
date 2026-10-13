"""NREL PVWatts v8 client for solar production estimates."""

import httpx

PVWATTS_URL = "https://developer.nlr.gov/api/pvwatts/v8.json"
# Standard modules on a fixed roof mount, with PVWatts' default losses and inverter
SYSTEM_DEFAULTS = {
    "module_type": 0,
    "array_type": 1,
    "losses": 14,
    "dc_ac_ratio": 1.2,
    "inv_eff": 96,
    "timeframe": "monthly",
}


async def get_monthly_production(
    api_key: str,
    latitude: float,
    longitude: float,
    system_capacity_kw: float,
    tilt: float,
    azimuth: float,
) -> dict:
    """Monthly and annual AC production; raises httpx.HTTPError or ValueError."""
    params = {
        **SYSTEM_DEFAULTS,
        "lat": latitude,
        "lon": longitude,
        "system_capacity": system_capacity_kw,
        "tilt": tilt,
        "azimuth": azimuth,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            PVWATTS_URL, params=params, headers={"X-Api-Key": api_key}
        )

    data = response.json()  # NREL errors are JSON too; anything else raises
    if response.is_error or data.get("errors") or "outputs" not in data:
        raise ValueError(f"PVWatts {response.status_code}: {str(data)[:300]}")

    outputs, station = data["outputs"], data.get("station_info", {})
    monthly = outputs.get("ac_monthly", [])
    return {
        "monthly_production": monthly,
        "annual_production": outputs.get("ac_annual", sum(monthly)),
        "capacity_factor": outputs.get("capacity_factor", 0),
        "annual_solar_radiation": outputs.get("solrad_annual", 0),
        "station_info": {
            "city": station.get("city", ""),
            "state": station.get("state", ""),
            "distance": station.get("distance", 0),
        },
    }
