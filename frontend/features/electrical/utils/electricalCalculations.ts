/**
 * Electrical System Design Calculations
 * Calculations for string configuration, inverter selection, and electrical sizing
 */

import type {
  PanelSpecs,
  StringConfiguration,
  InverterType,
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
export function calculateStringConfiguration(
  panelSpecs: PanelSpecs,
  totalPanels: number,
  inverterType: "string" | "microinverter" | "optimizer",
  roofTemp: number = 60,
): StringConfiguration {
  // Temperature correction for voltage
  const tempDiff = roofTemp - 25; // Standard test condition is 25°C
  const voltageCorrection = 1 + (panelSpecs.tempCoeff * tempDiff) / 100;

  if (inverterType === "microinverter") {
    // Microinverters: 1 panel per inverter
    return {
      panelsPerString: 1,
      numberOfStrings: totalPanels,
      totalPanels,
      stringVoltageVoc: panelSpecs.voc * voltageCorrection,
      stringVoltageVmp: panelSpecs.vmp * voltageCorrection,
      stringCurrent: panelSpecs.imp,
      totalSystemVoltage: panelSpecs.vmp * voltageCorrection,
      totalSystemCurrent: panelSpecs.imp * totalPanels,
    };
  }

  if (inverterType === "optimizer") {
    // Power optimizers: typically 1-2 panels per optimizer
    const panelsPerOptimizer = 1;
    return {
      panelsPerString: panelsPerOptimizer,
      numberOfStrings: Math.ceil(totalPanels / panelsPerOptimizer),
      totalPanels,
      stringVoltageVoc: panelSpecs.voc * voltageCorrection * panelsPerOptimizer,
      stringVoltageVmp: panelSpecs.vmp * voltageCorrection * panelsPerOptimizer,
      stringCurrent: panelSpecs.imp,
      totalSystemVoltage:
        panelSpecs.vmp * voltageCorrection * panelsPerOptimizer,
      totalSystemCurrent:
        panelSpecs.imp * Math.ceil(totalPanels / panelsPerOptimizer),
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
    totalSystemVoltage: panelSpecs.vmp * voltageCorrection * panelsPerString,
    totalSystemCurrent: panelSpecs.imp * numberOfStrings,
  };
}

/**
 * Select appropriate inverter specifications
 */
export function selectInverter(
  systemSizeKw: number,
  stringConfig: StringConfiguration,
  inverterType: "string" | "microinverter" | "optimizer",
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

/**
 * Calculate wire sizing based on current and distance
 */
export function calculateWireSizing(
  stringConfig: StringConfiguration,
  inverterType: InverterType,
  dcCableLength: number = 15,
  acCableLength: number = 10,
): WireSizing {
  // DC cable sizing (from array to inverter)
  const dcCurrent = stringConfig.stringCurrent * 1.25; // 25% safety factor per NEC/IEC
  const dcVoltage = stringConfig.stringVoltageVmp;

  // Wire sizing chart (mm² for different current ratings)
  const wireChart: Record<
    number,
    { size: number; maxCurrent: number; resistance: number }
  > = {
    4: { size: 4, maxCurrent: 32, resistance: 4.61 }, // Ω/km at 20°C
    6: { size: 6, maxCurrent: 41, resistance: 3.08 },
    10: { size: 10, maxCurrent: 57, resistance: 1.83 },
    16: { size: 16, maxCurrent: 76, resistance: 1.15 },
    25: { size: 25, maxCurrent: 101, resistance: 0.727 },
  };

  // Select DC cable size
  let dcCableSize = 6; // Default minimum for solar
  for (const [, wire] of Object.entries(wireChart)) {
    if (wire.maxCurrent >= dcCurrent) {
      dcCableSize = wire.size;
      break;
    }
  }

  // Calculate voltage drop (round trip = 2x length)
  const dcResistance = wireChart[dcCableSize].resistance;
  const dcVoltageDrop =
    ((2 * dcCableLength * dcCurrent * dcResistance) / 1000 / dcVoltage) * 100;

  // AC cable sizing (from inverter to grid)
  const systemSizeKw = (stringConfig.totalPanels * 400) / 1000; // Approximate
  const acCurrent = ((systemSizeKw * 1000) / 230) * 1.25; // 230V single phase, 25% safety

  let acCableSize = 4; // Default minimum
  for (const [, wire] of Object.entries(wireChart)) {
    if (wire.maxCurrent >= acCurrent) {
      acCableSize = wire.size;
      break;
    }
  }

  const acResistance = wireChart[acCableSize].resistance;
  const acVoltageDrop =
    ((2 * acCableLength * acCurrent * acResistance) / 1000 / 230) * 100;

  return {
    dcCableLengthOneWay: dcCableLength,
    acCableLengthOneWay: acCableLength,
    dcCableSize,
    acCableSize,
    dcVoltageDrop: Math.round(dcVoltageDrop * 100) / 100,
    acVoltageDrop: Math.round(acVoltageDrop * 100) / 100,
    dcCableType: `${dcCableSize}mm² PV cable (UV resistant, rated for outdoor use)`,
    acCableType: `${acCableSize}mm² NYM-J cable (indoor installation)`,
  };
}

/**
 * Calculate breaker/fuse sizing
 */
export function calculateBreakerSizing(
  stringConfig: StringConfiguration,
  systemSizeKw: number,
): BreakerSizing {
  // DC breaker: 1.25x string current per NEC/IEC standards
  const dcCurrent = stringConfig.stringCurrent * 1.25;
  const dcBreakerRating = Math.ceil(dcCurrent / 5) * 5; // Round up to nearest 5A

  // AC breaker: based on inverter output
  const acCurrent = ((systemSizeKw * 1000) / 230) * 1.25;
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

  // Calculate wiring
  const wiring = calculateWireSizing(
    stringConfig,
    inverter,
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
  const breakers = calculateBreakerSizing(stringConfig, systemSizeKw);

  return {
    stringConfig,
    inverter,
    wiring,
    breakers,
    warnings,
  };
}

/**
 * Compare inverter types for a given system
 */
export function compareInverterTypes(
  panelSpecs: PanelSpecs,
  totalPanels: number,
  systemSizeKw: number,
): Record<
  "string" | "microinverter" | "optimizer",
  { design: ElectricalDesign; cost: number; pros: string[]; cons: string[] }
> {
  const types: ("string" | "microinverter" | "optimizer")[] = [
    "string",
    "microinverter",
    "optimizer",
  ];

  const comparison: any = {};

  types.forEach((type) => {
    const design = calculateElectricalDesign({
      panelSpecs,
      totalPanels,
      systemSizeKw,
      inverterType: type,
    });

    // Rough cost estimates (German market)
    let cost = 0;
    let pros: string[] = [];
    let cons: string[] = [];

    switch (type) {
      case "string":
        cost = systemSizeKw * 200; // ~200€/kW for string inverter
        pros = [
          "Lowest upfront cost",
          "High efficiency (97-98%)",
          "Proven technology",
          "Easy monitoring of whole system",
        ];
        cons = [
          "Single point of failure",
          "Shading affects entire string",
          "No panel-level monitoring",
          "Requires proper string design",
        ];
        break;
      case "microinverter":
        cost = totalPanels * 120; // ~120€/panel for microinverters
        pros = [
          "Panel-level MPPT",
          "No single point of failure",
          "Easy system expansion",
          "Excellent for shading/complex roofs",
          "Panel-level monitoring",
        ];
        cons = [
          "Higher upfront cost",
          "More points of failure",
          "Slightly lower efficiency (96-97%)",
          "Harder to service (roof access)",
        ];
        break;
      case "optimizer":
        cost = systemSizeKw * 200 + totalPanels * 80; // Inverter + optimizers
        pros = [
          "Panel-level MPPT",
          "Panel-level monitoring",
          "Good for shading",
          "Central inverter for easy service",
          "High efficiency (99%)",
        ];
        cons = [
          "Highest upfront cost",
          "Two systems to maintain",
          "More complex installation",
        ];
        break;
    }

    comparison[type] = { design, cost: Math.round(cost), pros, cons };
  });

  return comparison;
}
