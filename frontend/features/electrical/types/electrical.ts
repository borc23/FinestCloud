/**
 * Electrical System Design Types
 * Type definitions for solar electrical design calculations
 */

export interface PanelSpecs {
  wattage: number; // W per panel
  voc: number; // Open circuit voltage (V)
  vmp: number; // Maximum power voltage (V)
  isc: number; // Short circuit current (A)
  imp: number; // Maximum power current (A)
  tempCoeff: number; // Temperature coefficient (%/°C), typically -0.35 to -0.45
}

export interface StringConfiguration {
  panelsPerString: number;
  numberOfStrings: number;
  totalPanels: number;
  stringVoltageVoc: number; // V at open circuit
  stringVoltageVmp: number; // V at max power
  stringCurrent: number; // A
  totalSystemCurrent: number; // A
}

export type InverterKind = "string" | "microinverter" | "optimizer";

export interface InverterType {
  type: InverterKind;
  model?: string;
  efficiency: number; // % (typically 96-99%)
  maxInputVoltage: number; // V
  minInputVoltage: number; // V
  mppVoltageRange: [number, number]; // [min, max] V for MPPT
  maxInputCurrent: number; // A
  numberOfMPPTs?: number; // For string inverters
  unitCount?: number; // Number of inverters/optimizers needed
}

export interface WireSizing {
  dcCableLengthOneWay: number; // meters (from array to inverter)
  acCableLengthOneWay: number; // meters (from inverter to grid connection)
  dcCableSize: number; // mm² cross-section
  acCableSize: number; // mm² cross-section
  dcVoltageDrop: number; // % voltage drop
  acVoltageDrop: number; // % voltage drop
  dcCableType: string; // e.g., "6mm² PV cable (UV resistant)"
  acCableType: string; // e.g., "4mm² NYM-J cable"
}

export interface BreakerSizing {
  dcBreakerRating: number; // A (array disconnect)
  acBreakerRating: number; // A (grid connection)
  dcBreakerType: string; // e.g., "DC 600V 25A 2-pole"
  acBreakerType: string; // e.g., "AC 230V 20A RCD 30mA"
}

export interface ElectricalDesign {
  stringConfig: StringConfiguration;
  inverter: InverterType;
  wiring: WireSizing;
  breakers: BreakerSizing;
  warnings: string[]; // Any design warnings or recommendations
}

export interface ElectricalInputs {
  panelSpecs: PanelSpecs;
  totalPanels: number;
  systemSizeKw: number;
  inverterType: InverterKind;
  dcCableLength?: number; // meters, default 15m
  acCableLength?: number; // meters, default 10m
  roofTemp?: number; // °C, default 60°C (important for voltage calculations)
}
