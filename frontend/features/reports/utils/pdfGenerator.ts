/**
 * PDF Report Generator
 * Utilities for generating professional solar panel installation reports
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ReportData, ReportOptions } from '@/features/reports/types/report'
import { hexToRgb } from '@/shared/utils/colorUtils'

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
    includeCustomerInfo = true,
    includeSiteInfo = true,
    includeEnergyProduction = true,
    includeFinancials = true,
    includeMonthlyBreakdown = false,
    includeSystemSpecs = true,
    includeEnvironmental = true,
    includeElectrical = true,
    includeMonitoring = true,
    language = 'en',
  } = options

  const doc = new jsPDF()
  let yPos = 20

  // Colors - Use organization branding if available
  const primaryColor: [number, number, number] = data.organizationPrimaryColor
    ? hexToRgb(data.organizationPrimaryColor)
    : [76, 175, 80] // Fallback to green
  const textColor: [number, number, number] = [60, 60, 60] // Dark gray
  const lightGray: [number, number, number] = [240, 240, 240]

  // Header
  yPos = addHeader(doc, data, yPos, primaryColor)
  yPos += 10

  // Customer & Site Information
  if (includeCustomerInfo && data.customer) {
    yPos = checkPageBreak(doc, yPos, 60)
    yPos = addCustomerInfo(doc, data, yPos, primaryColor, textColor, lightGray)
    yPos += 10
  }

  if (includeSiteInfo && data.site) {
    yPos = checkPageBreak(doc, yPos, 50)
    yPos = addSiteInfo(doc, data, yPos, primaryColor, textColor, lightGray)
    yPos += 10
  }

  // Executive Summary
  yPos = checkPageBreak(doc, yPos, 30)
  yPos = addExecutiveSummary(doc, data, yPos, primaryColor, textColor)
  yPos += 10

  // System Specifications
  if (includeSystemSpecs) {
    yPos = checkPageBreak(doc, yPos, 60)
    yPos = addSystemSpecifications(doc, data, yPos, primaryColor, textColor, lightGray)
    yPos += 10
  }

  // Energy Production Estimate
  if (includeEnergyProduction && data.energyProduction) {
    yPos = checkPageBreak(doc, yPos, 80)
    yPos = addEnergyProduction(doc, data, yPos, primaryColor, textColor, lightGray)
    yPos += 10
  }

  // Financial Analysis
  if (includeFinancials) {
    yPos = checkPageBreak(doc, yPos, 60)
    yPos = addFinancialAnalysis(doc, data, yPos, primaryColor, textColor, lightGray)
    yPos += 10
  }

  // Cost Breakdown
  if (includeFinancials) {
    yPos = checkPageBreak(doc, yPos, 60)
    yPos = addCostBreakdown(doc, data, yPos, primaryColor, textColor, lightGray)
    yPos += 10
  }

  // Environmental Impact
  if (includeEnvironmental) {
    yPos = checkPageBreak(doc, yPos, 50)
    yPos = addEnvironmentalImpact(doc, data, yPos, primaryColor, textColor, lightGray)
    yPos += 10
  }

  // Electrical Design Summary
  if (includeElectrical && data.electricalDesign) {
    yPos = checkPageBreak(doc, yPos, 60)
    yPos = addElectricalDesign(doc, data, yPos, primaryColor, textColor, lightGray)
    yPos += 10
  }

  // Monitoring & Maintenance
  if (includeMonitoring && data.monitoring) {
    yPos = checkPageBreak(doc, yPos, 60)
    yPos = addMonitoringMaintenance(doc, data, yPos, primaryColor, textColor, lightGray)
    yPos += 10
  }

  // Footer
  addFooter(doc, data)

  return doc
}

/**
 * Check if page break is needed and add new page if necessary
 */
function checkPageBreak(doc: jsPDF, yPos: number, requiredSpace: number): number {
  if (yPos + requiredSpace > 270) {
    doc.addPage()
    return 20
  }
  return yPos
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
  let currentY = yPos

  // Company Logo (if available)
  if (data.companyLogo) {
    try {
      // Add logo - assuming it's a base64 string or URL
      // Note: For URLs, you'd need to fetch and convert to base64 first
      doc.addImage(data.companyLogo, 'PNG', 20, currentY, 40, 20)
    } catch (err) {
      console.error('Failed to add logo to PDF:', err)
    }
  }

  // Company Name (top right)
  if (data.companyName) {
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'bold')
    doc.text(data.companyName, 190, currentY + 5, { align: 'right' })

    // Contact info below company name
    let contactY = currentY + 10
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    if (data.companyPhone) {
      doc.text(data.companyPhone, 190, contactY, { align: 'right' })
      contactY += 4
    }
    if (data.companyEmail) {
      doc.text(data.companyEmail, 190, contactY, { align: 'right' })
      contactY += 4
    }
    if (data.companyWebsite) {
      doc.text(data.companyWebsite, 190, contactY, { align: 'right' })
    }
  }

  currentY += 25

  // Title
  doc.setFontSize(24)
  doc.setTextColor(...color)
  doc.setFont('helvetica', 'bold')
  doc.text('Solar Installation Proposal', 105, currentY, { align: 'center' })

  currentY += 10

  // Subtitle
  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${data.systemSpecs.systemSize.toFixed(1)} kW System | ${data.systemSpecs.panelCount} Panels`,
    105,
    currentY,
    { align: 'center' }
  )

  currentY += 5

  // Date
  const dateStr = data.projectDate
    ? data.projectDate.toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB')
  doc.setFontSize(10)
  doc.text(`Generated: ${dateStr}`, 105, currentY, { align: 'center' })

  // Horizontal line
  currentY += 5
  doc.setDrawColor(...color)
  doc.setLineWidth(0.5)
  doc.line(20, currentY, 190, currentY)

  return currentY + 5
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
    ['System Size', `${data.systemSpecs.systemSize.toFixed(3)} kW`],
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
 * Add customer information section
 */
function addCustomerInfo(
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
  doc.text('Customer Information', 20, yPos)

  yPos += 5

  const customer = data.customer!
  const customerInfo = [
    ['Customer Name', customer.name],
    ['Address', customer.address],
  ]

  if (customer.email) {
    customerInfo.push(['Email', customer.email])
  }
  if (customer.phone) {
    customerInfo.push(['Phone', customer.phone])
  }
  if (customer.propertyType) {
    customerInfo.push(['Property Type', customer.propertyType.charAt(0).toUpperCase() + customer.propertyType.slice(1)])
  }

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: customerInfo,
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
 * Add site information section
 */
function addSiteInfo(
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
  doc.text('Site Information', 20, yPos)

  yPos += 5

  const site = data.site!
  const siteInfo = [
    ['Site Address', site.address],
  ]

  if (site.location) {
    siteInfo.push(['GPS Coordinates', `${site.location.lat.toFixed(6)}, ${site.location.lng.toFixed(6)}`])
  }
  if (site.roofType) {
    siteInfo.push(['Roof Type', site.roofType])
  }
  if (site.roofMaterial) {
    siteInfo.push(['Roof Material', site.roofMaterial])
  }
  if (site.roofAge) {
    siteInfo.push(['Roof Age', `${site.roofAge} years`])
  }
  if (site.roofCondition) {
    siteInfo.push(['Roof Condition', site.roofCondition.charAt(0).toUpperCase() + site.roofCondition.slice(1)])
  }

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: siteInfo,
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

  yPos = doc.lastAutoTable.finalY + 5

  return yPos + 5
}

/**
 * Add energy production estimate section
 */
function addEnergyProduction(
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
  doc.text('Energy Production Estimate', 20, yPos)

  yPos += 5

  const energy = data.energyProduction!
  const energyInfo = [
    ['Annual Energy Yield', `${energy.annualYield.toLocaleString()} kWh`],
    ['Performance Ratio', `${energy.performanceRatio}%`],
    ['Solar Irradiance', `${energy.solarIrradiance} kWh/m²/year`],
    ['Degradation Rate', `${energy.degradationRate}% per year`],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: energyInfo,
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

  yPos = doc.lastAutoTable.finalY + 8

  // Monthly production chart (simple table representation)
  if (energy.monthlyYield && energy.monthlyYield.length === 12) {
    doc.setFontSize(12)
    doc.setTextColor(...primaryColor)
    doc.setFont('helvetica', 'bold')
    doc.text('Monthly Production Estimate', 20, yPos)

    yPos += 5

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthlyData = energy.monthlyYield.map((yield_val, idx) => [
      months[idx],
      `${yield_val.toLocaleString()} kWh`
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['Month', 'Production']],
      body: monthlyData,
      theme: 'striped',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: textColor,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 40, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'right' },
      },
      alternateRowStyles: {
        fillColor: lightGray,
      },
      margin: { left: 20, right: 20 },
    })

    yPos = doc.lastAutoTable.finalY
  }

  return yPos + 5
}

/**
 * Add electrical design summary section
 */
function addElectricalDesign(
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
  doc.text('Electrical Design Summary', 20, yPos)

  yPos += 5

  const electrical = data.electricalDesign!
  const stringConfig = electrical.stringConfig
  const wireSizing = electrical.wiring

  const electricalInfo = [
    ['String Configuration', ''],
    ['  Panels per String', stringConfig.panelsPerString.toString()],
    ['  Number of Strings', stringConfig.numberOfStrings.toString()],
    ['  String Voltage (Voc)', `${stringConfig.stringVoltageVoc.toFixed(1)} V`],
    ['  String Voltage (Vmp)', `${stringConfig.stringVoltageVmp.toFixed(1)} V`],
    ['  String Current', `${stringConfig.stringCurrent.toFixed(1)} A`],
    ['', ''],
    ['Wire Sizing', ''],
    ['  DC Cable Size', `${wireSizing.dcCableSize} mm²`],
    ['  AC Cable Size', `${wireSizing.acCableSize} mm²`],
    ['  DC Voltage Drop', `${wireSizing.dcVoltageDrop.toFixed(2)}%`],
    ['  AC Voltage Drop', `${wireSizing.acVoltageDrop.toFixed(2)}%`],
    ['', ''],
    ['Protection', ''],
    ['  DC Breaker', `${electrical.breakers.dcBreakerRating}A`],
    ['  AC Breaker', `${electrical.breakers.acBreakerRating}A`],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: electricalInfo,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      textColor: textColor,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { cellWidth: 'auto', halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  })

  yPos = doc.lastAutoTable.finalY + 5

  // Safety note
  if (data.electricalSafety) {
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'italic')
    doc.text(
      `Grounding: ${data.electricalSafety.grounding} | Surge Protection: ${data.electricalSafety.surgeProtection ? 'Yes' : 'No'}`,
      20,
      yPos
    )
    yPos += 4
    if (data.electricalSafety.localCompliance.length > 0) {
      doc.text(
        `Compliance: ${data.electricalSafety.localCompliance.join(', ')}`,
        20,
        yPos
      )
      yPos += 4
    }
  }

  return yPos + 5
}

/**
 * Add monitoring and maintenance section
 */
function addMonitoringMaintenance(
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
  doc.text('Monitoring & Maintenance', 20, yPos)

  yPos += 5

  const monitoring = data.monitoring!
  const monitoringInfo = []

  if (monitoring.monitoringSystem) {
    monitoringInfo.push(['Monitoring System', monitoring.monitoringSystem])
  }
  monitoringInfo.push(['App Access', monitoring.appAccess ? 'Yes' : 'No'])
  monitoringInfo.push(['Maintenance Frequency', monitoring.maintenanceSchedule.frequency])

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: monitoringInfo,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      textColor: textColor,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: 20, right: 20 },
  })

  yPos = doc.lastAutoTable.finalY + 8

  // Warranty Information
  doc.setFontSize(12)
  doc.setTextColor(...primaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text('Warranty Coverage', 20, yPos)

  yPos += 5

  const warrantyInfo = [
    ['Solar Panels', `${monitoring.warranty.panels} years`],
    ['Inverter', `${monitoring.warranty.inverter} years`],
    ['Installation Workmanship', `${monitoring.warranty.installation} years`],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: warrantyInfo,
    theme: 'striped',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: textColor,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { cellWidth: 'auto', halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    margin: { left: 20, right: 20 },
  })

  yPos = doc.lastAutoTable.finalY + 8

  // Maintenance Tasks
  if (monitoring.maintenanceSchedule.tasks.length > 0) {
    doc.setFontSize(12)
    doc.setTextColor(...primaryColor)
    doc.setFont('helvetica', 'bold')
    doc.text('Recommended Maintenance Tasks', 20, yPos)

    yPos += 5

    const taskList = monitoring.maintenanceSchedule.tasks.map(task => [task])

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: taskList,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 2,
        textColor: textColor,
      },
      margin: { left: 25, right: 20 },
    })

    yPos = doc.lastAutoTable.finalY
  }

  return yPos + 5
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
