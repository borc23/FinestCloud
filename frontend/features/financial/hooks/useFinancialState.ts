/**
 * Custom Hook: useFinancialState
 * Manages financial calculator state using useReducer for better performance
 * Reduces re-renders by grouping related state updates
 */

import { useReducer, useMemo } from 'react'

export interface FinancialState {
  // Utility rates
  costPerKwh: number
  avgMonthlyBill: number
  escalationRate: number
  feedInTariff: number

  // System costs
  systemCostInput: number

  // Incentives
  stateGrant: number
  municipalGrant: number

  // Financial parameters
  selfConsumptionRate: number
  discountRate: number

  // Financing
  financingType: 'cash' | 'kfw' | 'loan'
  downPayment: number
  loanTerm: number
  kfwInterestRate: number
  customInterestRate: number

  // UI state
  showAdvanced: boolean
}

type FinancialAction =
  | { type: 'SET_COST_PER_KWH'; payload: number }
  | { type: 'SET_AVG_MONTHLY_BILL'; payload: number }
  | { type: 'SET_ESCALATION_RATE'; payload: number }
  | { type: 'SET_FEED_IN_TARIFF'; payload: number }
  | { type: 'SET_SYSTEM_COST'; payload: number }
  | { type: 'SET_STATE_GRANT'; payload: number }
  | { type: 'SET_MUNICIPAL_GRANT'; payload: number }
  | { type: 'SET_SELF_CONSUMPTION_RATE'; payload: number }
  | { type: 'SET_DISCOUNT_RATE'; payload: number }
  | { type: 'SET_FINANCING_TYPE'; payload: 'cash' | 'kfw' | 'loan' }
  | { type: 'SET_DOWN_PAYMENT'; payload: number }
  | { type: 'SET_LOAN_TERM'; payload: number }
  | { type: 'SET_KFW_INTEREST_RATE'; payload: number }
  | { type: 'SET_CUSTOM_INTEREST_RATE'; payload: number }
  | { type: 'TOGGLE_ADVANCED' }
  | { type: 'UPDATE_UTILITY_RATES'; payload: { costPerKwh: number; avgMonthlyBill: number; escalationRate: number } }
  | { type: 'UPDATE_FINANCING'; payload: { type: 'cash' | 'kfw' | 'loan'; downPayment: number; loanTerm: number } }
  | { type: 'RESET_TO_DEFAULTS'; payload: { systemSize: number } }

function financialReducer(state: FinancialState, action: FinancialAction): FinancialState {
  switch (action.type) {
    case 'SET_COST_PER_KWH':
      return { ...state, costPerKwh: action.payload }
    case 'SET_AVG_MONTHLY_BILL':
      return { ...state, avgMonthlyBill: action.payload }
    case 'SET_ESCALATION_RATE':
      return { ...state, escalationRate: action.payload }
    case 'SET_FEED_IN_TARIFF':
      return { ...state, feedInTariff: action.payload }
    case 'SET_SYSTEM_COST':
      return { ...state, systemCostInput: action.payload }
    case 'SET_STATE_GRANT':
      return { ...state, stateGrant: action.payload }
    case 'SET_MUNICIPAL_GRANT':
      return { ...state, municipalGrant: action.payload }
    case 'SET_SELF_CONSUMPTION_RATE':
      return { ...state, selfConsumptionRate: action.payload }
    case 'SET_DISCOUNT_RATE':
      return { ...state, discountRate: action.payload }
    case 'SET_FINANCING_TYPE':
      return { ...state, financingType: action.payload }
    case 'SET_DOWN_PAYMENT':
      return { ...state, downPayment: action.payload }
    case 'SET_LOAN_TERM':
      return { ...state, loanTerm: action.payload }
    case 'SET_KFW_INTEREST_RATE':
      return { ...state, kfwInterestRate: action.payload }
    case 'SET_CUSTOM_INTEREST_RATE':
      return { ...state, customInterestRate: action.payload }
    case 'TOGGLE_ADVANCED':
      return { ...state, showAdvanced: !state.showAdvanced }

    // Batch updates for better performance
    case 'UPDATE_UTILITY_RATES':
      return {
        ...state,
        costPerKwh: action.payload.costPerKwh,
        avgMonthlyBill: action.payload.avgMonthlyBill,
        escalationRate: action.payload.escalationRate
      }

    case 'UPDATE_FINANCING':
      return {
        ...state,
        financingType: action.payload.type,
        downPayment: action.payload.downPayment,
        loanTerm: action.payload.loanTerm
      }

    case 'RESET_TO_DEFAULTS':
      return getInitialState(action.payload.systemSize)

    default:
      return state
  }
}

function getInitialState(systemSize: number): FinancialState {
  // Import inline to avoid circular dependency
  const estimateSystemCost = (size: number) => {
    let pricePerWatt: number
    if (size <= 5) pricePerWatt = 1.60
    else if (size <= 10) pricePerWatt = 1.40
    else if (size <= 20) pricePerWatt = 1.25
    else pricePerWatt = 1.10
    return size * 1000 * pricePerWatt
  }

  // Calculate accurate German feed-in tariff (EEG 2025)
  const calculateGermanFeedInTariff = (systemSizeKw: number) => {
    const tier1Rate = 7.94 + 0.6  // 0-10 kWp + bonus
    const tier2Rate = 6.88 + 0.6  // 10-40 kWp + bonus
    const tier3Rate = 5.62 + 0.6  // 40-100 kWp + bonus

    let totalRevenue = 0
    if (systemSizeKw <= 10) {
      totalRevenue = systemSizeKw * tier1Rate
    } else if (systemSizeKw <= 40) {
      totalRevenue = 10 * tier1Rate + (systemSizeKw - 10) * tier2Rate
    } else if (systemSizeKw <= 100) {
      totalRevenue = 10 * tier1Rate + 30 * tier2Rate + (systemSizeKw - 40) * tier3Rate
    } else {
      totalRevenue = 10 * tier1Rate + 30 * tier2Rate + 60 * tier3Rate
    }
    return totalRevenue / systemSizeKw / 100  // Convert ct/kWh to €/kWh
  }

  return {
    costPerKwh: 0.37,
    avgMonthlyBill: 130,
    escalationRate: 4,
    feedInTariff: calculateGermanFeedInTariff(systemSize),
    systemCostInput: estimateSystemCost(systemSize),
    stateGrant: 0,
    municipalGrant: 0,
    selfConsumptionRate: 30,
    discountRate: 4,
    financingType: 'cash',
    downPayment: 0,
    loanTerm: 15,
    kfwInterestRate: 2.5,
    customInterestRate: 4.5,
    showAdvanced: false
  }
}

export function useFinancialState(systemSize: number) {
  const [state, dispatch] = useReducer(
    financialReducer,
    systemSize,
    getInitialState
  )

  // Memoized setters to prevent re-creating functions on every render
  const actions = useMemo(() => ({
    setCostPerKwh: (value: number) => dispatch({ type: 'SET_COST_PER_KWH', payload: value }),
    setAvgMonthlyBill: (value: number) => dispatch({ type: 'SET_AVG_MONTHLY_BILL', payload: value }),
    setEscalationRate: (value: number) => dispatch({ type: 'SET_ESCALATION_RATE', payload: value }),
    setFeedInTariff: (value: number) => dispatch({ type: 'SET_FEED_IN_TARIFF', payload: value }),
    setSystemCostInput: (value: number) => dispatch({ type: 'SET_SYSTEM_COST', payload: value }),
    setStateGrant: (value: number) => dispatch({ type: 'SET_STATE_GRANT', payload: value }),
    setMunicipalGrant: (value: number) => dispatch({ type: 'SET_MUNICIPAL_GRANT', payload: value }),
    setSelfConsumptionRate: (value: number) => dispatch({ type: 'SET_SELF_CONSUMPTION_RATE', payload: value }),
    setDiscountRate: (value: number) => dispatch({ type: 'SET_DISCOUNT_RATE', payload: value }),
    setFinancingType: (value: 'cash' | 'kfw' | 'loan') => dispatch({ type: 'SET_FINANCING_TYPE', payload: value }),
    setDownPayment: (value: number) => dispatch({ type: 'SET_DOWN_PAYMENT', payload: value }),
    setLoanTerm: (value: number) => dispatch({ type: 'SET_LOAN_TERM', payload: value }),
    setKfwInterestRate: (value: number) => dispatch({ type: 'SET_KFW_INTEREST_RATE', payload: value }),
    setCustomInterestRate: (value: number) => dispatch({ type: 'SET_CUSTOM_INTEREST_RATE', payload: value }),
    setShowAdvanced: (value: boolean) => {
      if (value !== state.showAdvanced) {
        dispatch({ type: 'TOGGLE_ADVANCED' })
      }
    },

    // Batch actions for performance
    updateUtilityRates: (costPerKwh: number, avgMonthlyBill: number, escalationRate: number) =>
      dispatch({ type: 'UPDATE_UTILITY_RATES', payload: { costPerKwh, avgMonthlyBill, escalationRate } }),

    updateFinancing: (type: 'cash' | 'kfw' | 'loan', downPayment: number, loanTerm: number) =>
      dispatch({ type: 'UPDATE_FINANCING', payload: { type, downPayment, loanTerm } }),

    resetToDefaults: () => dispatch({ type: 'RESET_TO_DEFAULTS', payload: { systemSize } })
  }), [state.showAdvanced, systemSize])

  return { state, actions }
}

/**
 * Hook to compute derived financial values
 * Separated to minimize recalculations
 */
export function useDerivedFinancialValues(
  state: FinancialState,
  systemSize: number
) {
  return useMemo(() => {
    const vatSavingsAmount = systemSize <= 30 ? state.systemCostInput * 0.19 : 0
    const netSystemCost = state.systemCostInput - vatSavingsAmount - state.stateGrant - state.municipalGrant

    return {
      vatSavingsAmount,
      netSystemCost,
      effectiveSystemCost: netSystemCost,
      pricePerWatt: state.systemCostInput / (systemSize * 1000)
    }
  }, [
    state.systemCostInput,
    state.stateGrant,
    state.municipalGrant,
    systemSize
  ])
}
