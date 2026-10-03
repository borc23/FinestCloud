/**
 * Electrical System Design Calculations
 * Calculations for string configuration, inverter selection, and electrical sizing
 */

import type {
  PanelSpecs,
  StringConfiguration,
  InverterType,
  InverterKind,
  WireSizing,
  BreakerSizing,
  ElectricalDesign,
  ElectricalInputs,
} from "@/features/electrical/types/electrical";

/**
 * Standard panel specifications (common German market panels)
 */
export const STANDARD_PANEL_SPECS: Record<number, PanelSpecs> = {
  400: {
    wattage: 400,
    voc: 49.5,
    vmp: 41.2,
    isc: 10.4,
    imp: 9.8,
    tempCoeff: -0.35,
  },
  450: {
    wattage: 450,
    voc: 49.8,
    vmp: 41.5,
    isc: 11.6,
    imp: 10.9,
    tempCoeff: -0.36,
  },
  500: {
    wattage: 500,
    voc: 50.2,
    vmp: 42.0,
    isc: 12.8,
    imp: 12.0,
    tempCoeff: -0.37,
  },
};

/**
 * Calculate optimal string configuration
 */
function calculateStringConfiguration(
  panelSpecs: PanelSpecs,
  totalPanels: number,
  inverterType: InverterKind,
  roofTemp: number = 60,
): StringConfiguration {
  // Temperature correction for voltage
  const tempDiff = roofTemp - 25; // Standard test condition is 25°C
  const voltageCorrection = 1 + (panelSpecs.tempCoeff * tempDiff) / 100;

  if (inverterType !== "string") {
    // Microinverters / power optimizers: 1 panel each
    return {
      panelsPerString: 1,
      numberOfStrings: totalPanels,
      totalPanels,
      stringVoltageVoc: panelSpecs.voc * voltageCorrection,
      stringVoltageVmp: panelSpecs.vmp * voltageCorrection,
      stringCurrent: panelSpecs.imp,
      totalSystemCurrent: panelSpecs.imp * totalPanels,
    };
  }

  // String inverter: optimize string length
  // Target voltage range: 350-600V for most string inverters
  const targetMinVoltage = 350;
  const targetMaxVoltage = 600;

  const minPanelsPerString = Math.ceil(
    targetMinVoltage / (panelSpecs.vmp * voltageCorrection),
  );
  const maxPanelsPerString = Math.floor(
    targetMaxVoltage / (panelSpecs.voc * voltageCorrection),
  );

  // Find optimal configuration
  let bestConfig = { panelsPerString: minPanelsPerString, numberOfStrings: 0 };
  let minWaste = Infinity;

  for (let pps = minPanelsPerString; pps <= maxPanelsPerString; pps++) {
    const strings = Math.ceil(totalPanels / pps);
    const waste = strings * pps - totalPanels;
    if (waste < minWaste) {
      minWaste = waste;
      bestConfig = { panelsPerString: pps, numberOfStrings: strings };
    }
  }

  const { panelsPerString, numberOfStrings } = bestConfig;

  return {
    panelsPerString,
    numberOfStrings,
    totalPanels: panelsPerString * numberOfStrings,
    stringVoltageVoc: panelSpecs.voc * voltageCorrection * panelsPerString,
    stringVoltageVmp: panelSpecs.vmp * voltageCorrection * panelsPerString,
    stringCurrent: panelSpecs.imp,
    totalSystemCurrent: panelSpecs.imp * numberOfStrings,
  };
}

/**
 * Select appropriate inverter specifications
 */
function selectInverter(
  systemSizeKw: number,
  stringConfig: StringConfiguration,
  inverterType: InverterKind,
): InverterType {
  if (inverterType === "microinverter") {
    return {
      type: "microinverter",
      efficiency: 96.5,
      maxInputVoltage: 60,
      minInputVoltage: 22,
      mppVoltageRange: [25, 55],
      maxInputCurrent: 15,
      unitCount: stringConfig.totalPanels,
      model: "Enphase IQ8+ (typical)",
    };
  }

  if (inverterType === "optimizer") {
    return {
      type: "optimizer",
      efficiency: 99.5, // Optimizers are very efficient
      maxInputVoltage: 60,
      minInputVoltage: 12,
      mppVoltageRange: [12, 60],
      maxInputCurrent: 15,
      unitCount: stringConfig.totalPanels,
      model: "SolarEdge P-Series (typical)",
    };
  }

  // String inverter - size to system
  const inverterSizeKw = Math.ceil(systemSizeKw / 3) * 3; // Round to nearest 3kW

  return {
    type: "string",
    efficiency: 97.5,
    maxInputVoltage: 1000,
    minInputVoltage: 150,
    mppVoltageRange: [200, 850],
    maxInputCurrent: 12.5 * Math.ceil(stringConfig.numberOfStrings / 2), // Typical per MPPT
    numberOfMPPTs: Math.ceil(stringConfig.numberOfStrings / 2),
    unitCount: 1,
    model: `${inverterSizeKw}kW String Inverter (Fronius/SMA/Huawei)`,
  };
}

// Wire sizing chart: mm² cross-section, max current (A), resistance (Ω/km at 20°C)
const WIRES = [
  { size: 4, maxCurrent: 32, resistance: 4.61 },
  { size: 6, maxCurrent: 41, resistance: 3.08 },
  { size: 10, maxCurrent: 57, resistance: 1.83 },
  { size: 16, maxCurrent: 76, resistance: 1.15 },
  { size: 25, maxCurrent: 101, resistance: 0.727 },
];

/** Smallest wire rated for the current, else the fallback size */
const selectWire = (current: number, fallbackSize: number) =>
  WIRES.find((wire) => wire.maxCurrent >= current) ??
  WIRES.find((wire) => wire.size === fallbackSize)!;

/** Voltage drop in % (round trip = 2x length) */
const voltageDrop = (
  lengthM: number,
  current: number,
  resistance: number,
  voltage: number,
) => {
  const percent = ((2 * lengthM * current * resistance) / 1000 / voltage) * 100;
  return Math.round(percent * 100) / 100;
};

/**
 * Calculate wire sizing based on design currents (incl. safety factor) and distance
 */
function calculateWireSizing(
  stringConfig: StringConfiguration,
  dcCurrent: number,
  acCurrent: number,
  dcCableLength: number,
  acCableLength: number,
): WireSizing {
  // DC cable (array to inverter): 6mm² minimum for solar; AC cable (inverter to grid, 230V)
  const dc = selectWire(dcCurrent, 6);
  const ac = selectWire(acCurrent, 4);

  return {
    dcCableLengthOneWay: dcCableLength,
    acCableLengthOneWay: acCableLength,
    dcCableSize: dc.size,
    acCableSize: ac.size,
    dcVoltageDrop: voltageDrop(
      dcCableLength,
      dcCurrent,
      dc.resistance,
      stringConfig.stringVoltageVmp,
    ),
    acVoltageDrop: voltageDrop(acCableLength, acCurrent, ac.resistance, 230),
    dcCableType: `${dc.size}mm² PV cable (UV resistant, rated for outdoor use)`,
    acCableType: `${ac.size}mm² NYM-J cable (indoor installation)`,
  };
}

/**
 * Calculate breaker/fuse sizing, rounded up to the nearest 5A
 */
function calculateBreakerSizing(
  dcCurrent: number,
  acCurrent: number,
): BreakerSizing {
  const dcBreakerRating = Math.ceil(dcCurrent / 5) * 5;
  const acBreakerRating = Math.ceil(acCurrent / 5) * 5;

  return {
    dcBreakerRating,
    acBreakerRating,
    dcBreakerType: `DC breaker ${dcBreakerRating}A, 2-pole, 1000VDC rated`,
    acBreakerType: `AC breaker ${acBreakerRating}A, RCD 30mA Type A, B-characteristic`,
  };
}

/**
 * Perform complete electrical design calculation
 */
export function calculateElectricalDesign(
  inputs: ElectricalInputs,
): ElectricalDesign {
  const {
    panelSpecs,
    totalPanels,
    systemSizeKw,
    inverterType,
    dcCableLength = 15,
    acCableLength = 10,
    roofTemp = 60,
  } = inputs;

  const warnings: string[] = [];

  // Calculate string configuration
  const stringConfig = calculateStringConfiguration(
    panelSpecs,
    totalPanels,
    inverterType,
    roofTemp,
  );

  // Check if we need extra panels
  if (stringConfig.totalPanels > totalPanels) {
    warnings.push(
      `Optimal configuration requires ${
        stringConfig.totalPanels
      } panels (you have ${totalPanels}). Consider adding ${
        stringConfig.totalPanels - totalPanels
      } more panels for balanced strings.`,
    );
  }

  // Select inverter
  const inverter = selectInverter(systemSizeKw, stringConfig, inverterType);

  // Validate voltage ranges
  if (inverterType === "string") {
    if (stringConfig.stringVoltageVoc > inverter.maxInputVoltage) {
      warnings.push(
        `⚠️ String open-circuit voltage (${Math.round(
          stringConfig.stringVoltageVoc,
        )}V) exceeds inverter maximum (${
          inverter.maxInputVoltage
        }V). Reduce panels per string.`,
      );
    }
    if (stringConfig.stringVoltageVmp < inverter.mppVoltageRange[0]) {
      warnings.push(
        `⚠️ String MPPT voltage (${Math.round(
          stringConfig.stringVoltageVmp,
        )}V) is below inverter minimum (${
          inverter.mppVoltageRange[0]
        }V). Increase panels per string.`,
      );
    }
  }

  // Design currents with 25% safety factor per NEC/IEC: DC per string, AC at 230V single phase
  const dcCurrent = stringConfig.stringCurrent * 1.25;
  const acCurrent = ((systemSizeKw * 1000) / 230) * 1.25;

  // Calculate wiring
  const wiring = calculateWireSizing(
    stringConfig,
    dcCurrent,
    acCurrent,
    dcCableLength,
    acCableLength,
  );

  // Check voltage drop
  if (wiring.dcVoltageDrop > 3) {
    warnings.push(
      `DC voltage drop is ${
        wiring.dcVoltageDrop
      }% (recommended <3%). Consider using ${
        wiring.dcCableSize + 2
      }mm² cable or reducing cable length.`,
    );
  }
  if (wiring.acVoltageDrop > 1) {
    warnings.push(
      `AC voltage drop is ${wiring.acVoltageDrop}% (recommended <1%). Consider using larger cable.`,
    );
  }

  // Calculate breakers
  const breakers = calculateBreakerSizing(dcCurrent, acCurrent);

  return {
    stringConfig,
    inverter,
    wiring,
    breakers,
    warnings,
  };
}

/**
 * Inverter types with rough cost estimates (German market) and trade-offs
 */
export const INVERTER_OPTIONS: {
  type: InverterKind;
  icon: string;
  name: string;
  estimateCost: (systemSizeKw: number, totalPanels: number) => number;
  pros: string[];
  cons: string[];
}[] = [
  {
    type: "string",
    icon: "🔌",
    name: "String Inverter",
    estimateCost: (kw) => kw * 200, // ~200€/kW for string inverter
    pros: [
      "Lowest upfront cost",
      "High efficiency (97-98%)",
      "Proven technology",
      "Easy monitoring of whole system",
    ],
    cons: [
      "Single point of failure",
      "Shading affects entire string",
      "No panel-level monitoring",
      "Requires proper string design",
    ],
  },
  {
    type: "microinverter",
    icon: "🔋",
    name: "Microinverters",
    estimateCost: (_kw, panels) => panels * 120, // ~120€/panel for microinverters
    pros: [
      "Panel-level MPPT",
      "No single point of failure",
      "Easy system expansion",
      "Excellent for shading/complex roofs",
      "Panel-level monitoring",
    ],
    cons: [
      "Higher upfront cost",
      "More points of failure",
      "Slightly lower efficiency (96-97%)",
      "Harder to service (roof access)",
    ],
  },
  {
    type: "optimizer",
    icon: "⚙️",
    name: "Power Optimizers",
    estimateCost: (kw, panels) => kw * 200 + panels * 80, // Inverter + optimizers
    pros: [
      "Panel-level MPPT",
      "Panel-level monitoring",
      "Good for shading",
      "Central inverter for easy service",
      "High efficiency (99%)",
    ],
    cons: [
      "Highest upfront cost",
      "Two systems to maintain",
      "More complex installation",
    ],
  },
];
