/**
 * PDF Report Generator
 * Utilities for generating professional solar panel installation reports
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ReportData, ReportOptions } from '@/types/report'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number
    }
  }
}

/**
 * Generate a professional PDF report for solar installation
 */
export function generateSolarReport(
  data: ReportData,
  options: ReportOptions = {}
): jsPDF {
  const {
    includeFinancials = true,
    includeMonthlyBreakdown = false,
    includeSystemSpecs = true,
    includeEnvironmental = true,
    language = 'en',
  } = options

  const doc = new jsPDF()
  let yPos = 20

  // Colors
  const primaryColor: [number, number, number] = [76, 175, 80] // Green
  const textColor: [number, number, number] = [60, 60, 60] // Dark gray
  const lightGray: [number, number, number] = [240, 240, 240]

  // Header
  yPos = addHeader(doc, data, yPos, primaryColor)
  yPos += 10

  // Executive Summary
  yPos = addExecutiveSummary(doc, data, yPos, primaryColor, textColor)
  yPos += 10

  // System Specifications
  if (includeSystemSpecs) {
    yPos = addSystemSpecifications(doc, data, yPos, primaryColor, textColor, lightGray)
    yPos += 10
  }

  // Financial Analysis
  if (includeFinancials) {
    yPos = addFinancialAnalysis(doc, data, yPos, primaryColor, textColor, lightGray)
    yPos += 10
  }

  // Cost Breakdown
  if (includeFinancials) {
    yPos = addCostBreakdown(doc, data, yPos, primaryColor, textColor, lightGray)
    yPos += 10
  }

  // Environmental Impact
  if (includeEnvironmental) {
    yPos = addEnvironmentalImpact(doc, data, yPos, primaryColor, textColor, lightGray)
    yPos += 10
  }

  // Footer
  addFooter(doc, data)

  return doc
}

/**
 * Add header section
 */
function addHeader(
  doc: jsPDF,
  data: ReportData,
  yPos: number,
  color: [number, number, number]
): number {
  // Title
  doc.setFontSize(24)
  doc.setTextColor(...color)
  doc.setFont('helvetica', 'bold')
  doc.text('Solar Installation Proposal', 105, yPos, { align: 'center' })

  yPos += 10

  // Subtitle
  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${data.systemSpecs.systemSize.toFixed(1)} kW System | ${data.systemSpecs.panelCount} Panels`,
    105,
    yPos,
    { align: 'center' }
  )

  yPos += 5

  // Date
  const dateStr = data.projectDate
    ? data.projectDate.toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB')
  doc.setFontSize(10)
  doc.text(`Generated: ${dateStr}`, 105, yPos, { align: 'center' })

  // Horizontal line
  yPos += 5
  doc.setDrawColor(...color)
  doc.setLineWidth(0.5)
  doc.line(20, yPos, 190, yPos)

  return yPos + 5
}

/**
 * Add executive summary with key metrics
 */
function addExecutiveSummary(
  doc: jsPDF,
  data: ReportData,
  yPos: number,
  primaryColor: [number, number, number],
  textColor: [number, number, number]
): number {
  doc.setFontSize(16)
  doc.setTextColor(...primaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text('Executive Summary', 20, yPos)

  yPos += 8

  // Key metrics in boxes
  const metrics = [
    {
      label: 'Payback Period',
      value: `${data.financials.paybackPeriod} years`,
      color: [33, 150, 243], // Blue
    },
    {
      label: '25-Year Savings',
      value: `€${data.financials.twentyFiveYearSavings.toLocaleString()}`,
      color: [76, 175, 80], // Green
    },
    {
      label: 'ROI',
      value: `${data.financials.roi}%`,
      color: [255, 152, 0], // Orange
    },
  ]

  const boxWidth = 55
  const boxHeight = 20
  let xPos = 20

  metrics.forEach((metric) => {
    // Box background
    doc.setFillColor(metric.color[0], metric.color[1], metric.color[2])
    doc.roundedRect(xPos, yPos, boxWidth, boxHeight, 3, 3, 'F')

    // Label
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'normal')
    doc.text(metric.label, xPos + boxWidth / 2, yPos + 6, { align: 'center' })

    // Value
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(metric.value, xPos + boxWidth / 2, yPos + 15, { align: 'center' })

    xPos += boxWidth + 7.5
  })

  return yPos + boxHeight + 5
}

/**
 * Add system specifications table
 */
function addSystemSpecifications(
  doc: jsPDF,
  data: ReportData,
  yPos: number,
  primaryColor: [number, number, number],
  textColor: [number, number, number],
  lightGray: [number, number, number]
): number {
  doc.setFontSize(14)
  doc.setTextColor(...primaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text('System Specifications', 20, yPos)

  yPos += 5

  const specs = [
    ['System Size', `${data.systemSpecs.systemSize.toFixed(2)} kW`],
    ['Number of Panels', data.systemSpecs.panelCount.toString()],
    ['Panel Wattage', `${data.systemSpecs.panelWattage} W`],
    ['Annual Production', `${data.systemSpecs.annualProduction.toLocaleString()} kWh`],
  ]

  if (data.systemSpecs.avgPitch) {
    specs.push(['Average Roof Pitch', `${data.systemSpecs.avgPitch.toFixed(1)}°`])
  }
  if (data.systemSpecs.avgAzimuth) {
    specs.push(['Average Azimuth', `${data.systemSpecs.avgAzimuth.toFixed(1)}°`])
  }

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: specs,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      textColor: textColor,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: 20, right: 20 },
  })

  return doc.lastAutoTable.finalY + 5
}

/**
 * Add financial analysis section
 */
function addFinancialAnalysis(
  doc: jsPDF,
  data: ReportData,
  yPos: number,
  primaryColor: [number, number, number],
  textColor: [number, number, number],
  lightGray: [number, number, number]
): number {
  // Check if new page needed
  if (yPos > 240) {
    doc.addPage()
    yPos = 20
  }

  doc.setFontSize(14)
  doc.setTextColor(...primaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text('Financial Analysis', 20, yPos)

  yPos += 5

  const financial = [
    [
      'First Year Savings',
      `€${data.financials.firstYearSavings.toLocaleString()}`,
    ],
    [
      'First Year Feed-in Revenue',
      `€${data.financials.firstYearFeedInRevenue.toLocaleString()}`,
    ],
    [
      '25-Year Total Savings',
      `€${data.financials.twentyFiveYearSavings.toLocaleString()}`,
    ],
    [
      '25-Year Feed-in Revenue',
      `€${data.financials.twentyFiveYearFeedInRevenue.toLocaleString()}`,
    ],
    ['Return on Investment (ROI)', `${data.financials.roi}%`],
    ['Payback Period', `${data.financials.paybackPeriod} years`],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: financial,
    theme: 'striped',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: textColor,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    margin: { left: 20, right: 20 },
  })

  return doc.lastAutoTable.finalY + 5
}

/**
 * Add cost breakdown section
 */
function addCostBreakdown(
  doc: jsPDF,
  data: ReportData,
  yPos: number,
  primaryColor: [number, number, number],
  textColor: [number, number, number],
  lightGray: [number, number, number]
): number {
  // Check if new page needed
  if (yPos > 230) {
    doc.addPage()
    yPos = 20
  }

  doc.setFontSize(14)
  doc.setTextColor(...primaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text('Cost Breakdown', 20, yPos)

  yPos += 5

  const vatSavings =
    data.systemSpecs.systemSize <= 30 ? data.systemCost * 0.19 : 0

  const costs = [
    ['Gross System Cost', `€${data.financials.grossSystemCost.toLocaleString()}`],
  ]

  if (vatSavings > 0) {
    costs.push(['VAT Savings (19%)', `-€${Math.round(vatSavings).toLocaleString()}`])
  }

  costs.push([
    'Net System Cost',
    `€${data.financials.netSystemCost.toLocaleString()}`,
  ])
  costs.push([
    'Cost per Watt',
    `€${data.financials.effectiveCostPerWatt.toFixed(2)}/W`,
  ])

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: costs,
    theme: 'striped',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: textColor,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    margin: { left: 20, right: 20 },
  })

  yPos = doc.lastAutoTable.finalY + 10

  // Monthly bill comparison
  doc.setFontSize(12)
  doc.setTextColor(...primaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text('Monthly Bill Comparison', 20, yPos)

  yPos += 5

  const billComparison = [
    ['Before Solar', `€${data.financials.avgMonthlyBillBefore}`],
    ['After Solar', `€${data.financials.avgMonthlyBillAfter}`],
    [
      'Monthly Savings',
      `€${data.financials.avgMonthlySavings}`,
    ],
    [
      'Monthly Feed-in Revenue',
      `€${data.financials.avgMonthlyFeedInRevenue}`,
    ],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: billComparison,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      textColor: textColor,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
    },
    margin: { left: 20, right: 20 },
  })

  return doc.lastAutoTable.finalY + 5
}

/**
 * Add environmental impact section
 */
function addEnvironmentalImpact(
  doc: jsPDF,
  data: ReportData,
  yPos: number,
  primaryColor: [number, number, number],
  textColor: [number, number, number],
  lightGray: [number, number, number]
): number {
  // Check if new page needed
  if (yPos > 240) {
    doc.addPage()
    yPos = 20
  }

  doc.setFontSize(14)
  doc.setTextColor(...primaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text('Environmental Impact', 20, yPos)

  yPos += 5

  const environmental = [
    [
      'Self-Consumption Rate',
      `${data.financials.energyOffsetPercentage}%`,
    ],
    [
      'Self-Consumed Energy',
      `${data.financials.selfConsumptionAmount.toLocaleString()} kWh/year`,
    ],
    [
      'Grid Feed-in',
      `${data.financials.gridFeedInAmount.toLocaleString()} kWh/year`,
    ],
    [
      'Lifetime CO₂ Offset',
      `${data.financials.lifetimeCO2Offset} tons`,
    ],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: environmental,
    theme: 'striped',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: textColor,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    margin: { left: 20, right: 20 },
  })

  return doc.lastAutoTable.finalY + 5
}

/**
 * Add footer to all pages
 */
function addFooter(doc: jsPDF, data: ReportData): void {
  const pageCount = doc.internal.pages.length - 1

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.setFont('helvetica', 'normal')

    // Page number
    doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' })

    // Disclaimer
    doc.text(
      'This proposal is an estimate based on provided data. Actual results may vary.',
      105,
      290,
      { align: 'center' }
    )
  }
}

/**
 * Download the PDF
 */
export function downloadPDF(doc: jsPDF, fileName: string = 'solar-proposal.pdf'): void {
  doc.save(fileName)
}
