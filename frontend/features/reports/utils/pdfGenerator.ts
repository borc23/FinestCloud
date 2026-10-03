/**
 * PDF Report Generator
 * Utilities for generating professional solar panel installation reports
 */

import jsPDF from "jspdf";
import autoTable, { type Styles, type UserOptions } from "jspdf-autotable";
import type { ReportData } from "@/features/reports/types/report";
import { hexToRgb } from "@/shared/utils/colorUtils";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

type RGB = [number, number, number];
type Row = string[];

const TEXT_COLOR: RGB = [60, 60, 60]; // Dark gray
const LIGHT_GRAY: RGB = [240, 240, 240];
const RIGHT: Partial<Styles> = { halign: "right" };
const RIGHT_BOLD: Partial<Styles> = { halign: "right", fontStyle: "bold" };
const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

/** A table, optionally preceded by a sub-heading; `gap` is extra space below it */
type Table = UserOptions & { subtitle?: string; gap?: number };

/** Two-column label/value table; striped tables get roomier cells and gray alternate rows */
function keyValueTable(
  body: Row[],
  striped: boolean,
  labelWidth: number,
  valueStyle: Partial<Styles> = {},
  gap = 0,
): Table {
  return {
    body,
    gap,
    theme: striped ? "striped" : "plain",
    styles: {
      fontSize: 10,
      cellPadding: striped ? 4 : 3,
      textColor: TEXT_COLOR,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: labelWidth },
      1: { cellWidth: "auto", ...valueStyle },
    },
    ...(striped && { alternateRowStyles: { fillColor: LIGHT_GRAY } }),
  };
}

/** Drop rows whose condition was falsy */
const rows = (...items: (Row | false | 0 | undefined)[]) =>
  items.filter((row): row is Row => !!row);

/**
 * Generate a professional PDF report for solar installation
 */
export function generateSolarReport(data: ReportData): jsPDF {
  const doc = new jsPDF();
  const { financials: f, systemSpecs: specs, energyProduction: energy } = data;
  const monitoring = data.monitoring;

  // Colors - Use organization branding if available
  const primaryColor: RGB = data.organizationPrimaryColor
    ? hexToRgb(data.organizationPrimaryColor)
    : [76, 175, 80]; // Fallback to green

  const heading = (text: string, y: number, fontSize: number) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text(text, 20, y);
  };

  let yPos = addHeader(doc, data, 20, primaryColor) + 10;

  /** Titled section of tables, moved to a new page if `space` doesn't fit */
  const section = (title: string, space: number, tables: Table[]) => {
    yPos = checkPageBreak(doc, yPos, space);
    heading(title, yPos, 14);
    yPos += 5;
    for (const { subtitle, gap = 0, ...options } of tables) {
      if (subtitle) {
        heading(subtitle, yPos, 12);
        yPos += 5;
      }
      autoTable(doc, {
        startY: yPos,
        head: [],
        margin: { left: 20, right: 20 },
        ...options,
      });
      yPos = doc.lastAutoTable.finalY + gap;
    }
    yPos += 15;
  };

  if (data.site) {
    const { address, location } = data.site;
    section("Site Information", 50, [
      keyValueTable(
        rows(
          ["Site Address", address],
          !!location && [
            "GPS Coordinates",
            `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
          ],
        ),
        false,
        60,
        {},
        5,
      ),
    ]);
  }

  yPos = checkPageBreak(doc, yPos, 30);
  yPos = addExecutiveSummary(doc, data, yPos, primaryColor) + 10;

  section("System Specifications", 60, [
    keyValueTable(
      rows(
        ["System Size", `${specs.systemSize.toFixed(3)} kW`],
        ["Number of Panels", specs.panelCount.toString()],
        ["Panel Wattage", `${specs.panelWattage} W`],
        ["Annual Production", `${specs.annualProduction.toLocaleString()} kWh`],
        !!specs.avgPitch && [
          "Average Roof Pitch",
          `${specs.avgPitch.toFixed(1)}°`,
        ],
        !!specs.avgAzimuth && [
          "Average Azimuth",
          `${specs.avgAzimuth.toFixed(1)}°`,
        ],
      ),
      false,
      60,
    ),
  ]);

  if (energy) {
    section("Energy Production Estimate", 80, [
      keyValueTable(
        rows(
          ["Annual Energy Yield", `${energy.annualYield.toLocaleString()} kWh`],
          energy.capacityFactor !== undefined && [
            "Capacity Factor",
            `${energy.capacityFactor.toFixed(1)}%`,
          ],
          energy.solarIrradiance !== undefined && [
            "Solar Irradiance",
            `${energy.solarIrradiance.toLocaleString()} kWh/m²/year`,
          ],
          ["Degradation Rate", `${energy.degradationRate}% per year`],
        ),
        true,
        80,
        RIGHT,
        8,
      ),
      // Monthly production chart (simple table representation)
      ...(energy.monthlyYield?.length === 12
        ? [
            {
              subtitle: "Monthly Production Estimate",
              head: [["Month", "Production"]],
              body: energy.monthlyYield.map((value, idx) => [
                MONTHS[idx],
                `${value.toLocaleString()} kWh`,
              ]),
              theme: "striped",
              styles: { fontSize: 9, cellPadding: 3, textColor: TEXT_COLOR },
              headStyles: {
                fillColor: primaryColor,
                textColor: [255, 255, 255],
                fontStyle: "bold",
              },
              columnStyles: {
                0: { cellWidth: 40, halign: "center" },
                1: { cellWidth: "auto", halign: "right" },
              },
              alternateRowStyles: { fillColor: LIGHT_GRAY },
            } satisfies Table,
          ]
        : []),
    ]);
  }

  section("Financial Analysis", 60, [
    keyValueTable(
      [
        ["First Year Savings", `€${f.firstYearSavings.toLocaleString()}`],
        [
          "First Year Feed-in Revenue",
          `€${f.firstYearFeedInRevenue.toLocaleString()}`,
        ],
        [
          "25-Year Total Savings",
          `€${f.twentyFiveYearSavings.toLocaleString()}`,
        ],
        [
          "25-Year Feed-in Revenue",
          `€${f.twentyFiveYearFeedInRevenue.toLocaleString()}`,
        ],
        ["Return on Investment (ROI)", `${f.roi}%`],
        ["Payback Period", `${f.paybackPeriod} years`],
      ],
      true,
      80,
      RIGHT_BOLD,
    ),
  ]);

  section("Cost Breakdown", 60, [
    keyValueTable(
      rows(
        ["Gross System Cost", `€${f.grossSystemCost.toLocaleString()}`],
        f.vatSavings > 0 && [
          "VAT Savings (19%)",
          `-€${f.vatSavings.toLocaleString()}`,
        ],
        ["Net System Cost", `€${f.netSystemCost.toLocaleString()}`],
        ["Cost per Watt", `€${f.effectiveCostPerWatt.toFixed(2)}/W`],
      ),
      true,
      80,
      RIGHT_BOLD,
      10,
    ),
    {
      subtitle: "Monthly Bill Comparison",
      ...keyValueTable(
        [
          ["Before Solar", `€${f.avgMonthlyBillBefore}`],
          ["After Solar", `€${f.avgMonthlyBillAfter}`],
          ["Monthly Savings", `€${f.avgMonthlySavings}`],
          ["Monthly Feed-in Revenue", `€${f.avgMonthlyFeedInRevenue}`],
        ],
        false,
        80,
        RIGHT_BOLD,
      ),
    },
  ]);

  section("Environmental Impact", 50, [
    keyValueTable(
      [
        ["Household Energy Offset", `${f.energyOffsetPercentage}%`],
        [
          "Self-Consumed Energy",
          `${f.selfConsumptionAmount.toLocaleString()} kWh/year`,
        ],
        ["Grid Feed-in", `${f.gridFeedInAmount.toLocaleString()} kWh/year`],
        ["Lifetime CO₂ Offset", `${f.lifetimeCO2Offset} tons`],
      ],
      true,
      80,
      RIGHT,
    ),
  ]);

  if (monitoring) {
    const { warranty, maintenanceSchedule } = monitoring;
    section("Monitoring & Maintenance", 60, [
      keyValueTable(
        rows(
          !!monitoring.monitoringSystem && [
            "Monitoring System",
            monitoring.monitoringSystem,
          ],
          ["App Access", monitoring.appAccess ? "Yes" : "No"],
          ["Maintenance Frequency", maintenanceSchedule.frequency],
        ),
        false,
        70,
        {},
        8,
      ),
      {
        subtitle: "Warranty Coverage",
        ...keyValueTable(
          [
            ["Solar Panels", `${warranty.panels} years`],
            ["Inverter", `${warranty.inverter} years`],
            ["Installation Workmanship", `${warranty.installation} years`],
          ],
          true,
          70,
          RIGHT,
          8,
        ),
      },
      ...(maintenanceSchedule.tasks.length > 0
        ? [
            {
              subtitle: "Recommended Maintenance Tasks",
              body: maintenanceSchedule.tasks.map((task) => [task]),
              theme: "plain",
              styles: { fontSize: 9, cellPadding: 2, textColor: TEXT_COLOR },
              margin: { left: 25, right: 20 },
            } satisfies Table,
          ]
        : []),
    ]);
  }

  addFooter(doc);

  return doc;
}

/**
 * Check if page break is needed and add new page if necessary
 */
function checkPageBreak(
  doc: jsPDF,
  yPos: number,
  requiredSpace: number,
): number {
  if (yPos + requiredSpace > 270) {
    doc.addPage();
    return 20;
  }
  return yPos;
}

/**
 * Add header section
 */
function addHeader(
  doc: jsPDF,
  data: ReportData,
  yPos: number,
  color: RGB,
): number {
  let currentY = yPos;

  // Company Logo (if available)
  if (data.companyLogo) {
    try {
      // Add logo - assuming it's a base64 string or URL
      // Note: For URLs, you'd need to fetch and convert to base64 first
      doc.addImage(data.companyLogo, "PNG", 20, currentY, 40, 20);
    } catch (err) {
      console.error("Failed to add logo to PDF:", err);
    }
  }

  // Company Name (top right)
  if (data.companyName) {
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "bold");
    doc.text(data.companyName, 190, currentY + 5, { align: "right" });

    // Contact info below company name
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    [data.companyPhone, data.companyEmail, data.companyWebsite]
      .filter((line): line is string => !!line)
      .forEach((line, idx) =>
        doc.text(line, 190, currentY + 10 + idx * 4, { align: "right" }),
      );
  }

  currentY += 25;

  // Title
  doc.setFontSize(24);
  doc.setTextColor(...color);
  doc.setFont("helvetica", "bold");
  doc.text("Solar Installation Proposal", 105, currentY, { align: "center" });

  currentY += 10;

  // Subtitle
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${data.systemSpecs.systemSize.toFixed(1)} kW System | ${
      data.systemSpecs.panelCount
    } Panels`,
    105,
    currentY,
    { align: "center" },
  );

  currentY += 5;

  // Date
  const dateStr = (data.projectDate ?? new Date()).toLocaleDateString("en-GB");
  doc.setFontSize(10);
  doc.text(`Generated: ${dateStr}`, 105, currentY, { align: "center" });

  // Horizontal line
  currentY += 5;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.5);
  doc.line(20, currentY, 190, currentY);

  return currentY + 5;
}

/**
 * Add executive summary with key metrics
 */
function addExecutiveSummary(
  doc: jsPDF,
  data: ReportData,
  yPos: number,
  primaryColor: RGB,
): number {
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", 20, yPos);

  yPos += 8;

  // Key metrics in boxes
  const metrics: { label: string; value: string; color: RGB }[] = [
    {
      label: "Payback Period",
      value: `${data.financials.paybackPeriod} years`,
      color: [33, 150, 243], // Blue
    },
    {
      label: "25-Year Savings",
      value: `€${data.financials.twentyFiveYearSavings.toLocaleString()}`,
      color: [76, 175, 80], // Green
    },
    {
      label: "ROI",
      value: `${data.financials.roi}%`,
      color: [255, 152, 0], // Orange
    },
  ];

  const boxWidth = 55;
  const boxHeight = 20;
  let xPos = 20;

  metrics.forEach((metric) => {
    // Box background
    doc.setFillColor(...metric.color);
    doc.roundedRect(xPos, yPos, boxWidth, boxHeight, 3, 3, "F");

    // Label
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.text(metric.label, xPos + boxWidth / 2, yPos + 6, { align: "center" });

    // Value
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(metric.value, xPos + boxWidth / 2, yPos + 15, { align: "center" });

    xPos += boxWidth + 7.5;
  });

  return yPos + boxHeight + 5;
}

/**
 * Add footer to all pages
 */
function addFooter(doc: jsPDF): void {
  const pageCount = doc.internal.pages.length - 1;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");

    // Page number
    doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: "center" });

    // Disclaimer
    doc.text(
      "This proposal is an estimate based on provided data. Actual results may vary.",
      105,
      290,
      { align: "center" },
    );
  }
}
