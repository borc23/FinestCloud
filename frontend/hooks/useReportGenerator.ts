export function useReportGenerator() {
  const generateMonthlyEstimate = (annualProduction: number): number[] => {
    const monthlyDistribution = [0.04, 0.06, 0.08, 0.10, 0.11, 0.12, 0.13, 0.12, 0.10, 0.07, 0.04, 0.03]
    return monthlyDistribution.map(ratio => Math.round(annualProduction * ratio))
  }

  const generate25YearProjection = (annualProduction: number, degradationRate: number): number[] => {
    return Array.from({ length: 25 }, (_, year) => 
      Math.round(annualProduction * Math.pow(1 - degradationRate / 100, year))
    )
  }

  const buildReportData = (params: ReportParams): ReportData => {
    // Move all the ReportData construction logic here
    return { /* ... */ }
  }

  const handleGeneratePDF = (params: ReportParams) => {
    const reportData = buildReportData(params)
    const doc = generateSolarReport(reportData)
    downloadPDF(doc, `solar-proposal-${params.systemSize.toFixed(1)}kW.pdf`)
  }

  return { handleGeneratePDF }
}
