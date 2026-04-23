import { useState, useMemo } from 'react'
import { buildSimulatorData, type SimulatorPoint } from '../utils/simulatorHelpers'

export const HORIZON_PRESETS = [5, 10, 20, 30] as const

export function useInvestmentSimulator() {
  const [returnStr,    setReturnStr]    = useState('7')
  const [inflationStr, setInflationStr] = useState('2')
  const [initialStr,   setInitialStr]   = useState('1000')
  const [monthlyStr,   setMonthlyStr]   = useState('200')
  const [horizonStr,   setHorizonStr]   = useState('20')
  const [ticker,       setTicker]       = useState('')

  const annualReturn   = parseFloat(returnStr.replace(',', '.'))    || 0
  const inflationPct   = parseFloat(inflationStr.replace(',', '.')) || 0
  const initialAmount  = parseFloat(initialStr.replace(',', '.'))   || 0
  const monthlyContrib = parseFloat(monthlyStr.replace(',', '.'))   || 0
  const horizonYears   = Math.min(Math.max(parseInt(horizonStr) || 20, 1), 50)

  const chartData = useMemo<SimulatorPoint[]>(
    () => buildSimulatorData(initialAmount, annualReturn, inflationPct, monthlyContrib, horizonYears),
    [initialAmount, annualReturn, inflationPct, monthlyContrib, horizonYears],
  )

  const finalPoint = chartData[chartData.length - 1] ?? null

  return {
    returnStr,    setReturnStr,
    inflationStr, setInflationStr,
    initialStr,   setInitialStr,
    monthlyStr,   setMonthlyStr,
    horizonStr,   setHorizonStr,
    ticker,       setTicker,
    chartData,
    finalPoint,
  }
}
