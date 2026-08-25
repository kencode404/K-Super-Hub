export type DatedCashFlow = {
  date: Date
  amount: number
  kind: 'initial' | 'contribution' | 'terminal'
}

export type ProjectionPoint = {
  date: Date
  invested: number
  portfolio: number
}

export type InvestmentProjection = {
  cashFlows: DatedCashFlow[]
  points: ProjectionPoint[]
  finalValue: number
  totalInvested: number
  totalGrowth: number
  npvResidual: number
}

const DAYS_PER_YEAR = 365.2425
const SOLVER_TOLERANCE = 1e-10
const MAX_SOLVER_ITERATIONS = 220

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

/** Keeps the original calendar day where possible and clamps at month end. */
export function addCalendarMonths(date: Date, months: number) {
  const source = startOfLocalDay(date)
  const targetMonthStart = new Date(source.getFullYear(), source.getMonth() + months, 1)
  const day = Math.min(source.getDate(), daysInMonth(targetMonthStart.getFullYear(), targetMonthStart.getMonth()))
  return new Date(targetMonthStart.getFullYear(), targetMonthStart.getMonth(), day)
}

function yearFraction(start: Date, end: Date) {
  return (startOfLocalDay(end).getTime() - startOfLocalDay(start).getTime()) / 86_400_000 / DAYS_PER_YEAR
}

export function xnpv(rate: number, cashFlows: readonly DatedCashFlow[]) {
  if (rate <= -1 || cashFlows.length === 0) return Number.NaN
  const origin = cashFlows[0].date
  return cashFlows.reduce(
    (npv, flow) => npv + flow.amount / Math.pow(1 + rate, yearFraction(origin, flow.date)),
    0,
  )
}

/**
 * Finds the positive terminal cash flow whose XNPV is zero at the requested
 * annual rate. XNPV is monotonic in this value, so bisection is deterministic
 * and cannot diverge like an unconstrained Newton step.
 */
function solveTerminalValue(negativeFlows: readonly DatedCashFlow[], endDate: Date, targetRate: number) {
  const npvForTerminal = (terminal: number) => xnpv(targetRate, [
    ...negativeFlows,
    { date: endDate, amount: terminal, kind: 'terminal' as const },
  ])

  let low = 0
  let high = Math.max(1, Math.abs(negativeFlows.reduce((sum, flow) => sum + flow.amount, 0)))

  while (npvForTerminal(high) < 0) high *= 2

  for (let iteration = 0; iteration < MAX_SOLVER_ITERATIONS; iteration += 1) {
    const midpoint = (low + high) / 2
    const residual = npvForTerminal(midpoint)
    if (Math.abs(residual) <= SOLVER_TOLERANCE) return midpoint
    if (residual < 0) low = midpoint
    else high = midpoint
  }

  return (low + high) / 2
}

export function createInvestmentProjection({
  initialValue,
  monthlyContribution,
  targetXirrPercent,
  years,
  today = new Date(),
}: {
  initialValue: number
  monthlyContribution: number
  targetXirrPercent: number
  years: number
  today?: Date
}): InvestmentProjection {
  const startDate = startOfLocalDay(today)
  const monthCount = Math.max(1, Math.round(years * 12))
  const targetRate = targetXirrPercent / 100
  const negativeFlows: DatedCashFlow[] = [
    { date: startDate, amount: -initialValue, kind: 'initial' },
    ...Array.from({ length: monthCount }, (_, index) => ({
      date: addCalendarMonths(startDate, index + 1),
      amount: -monthlyContribution,
      kind: 'contribution' as const,
    })),
  ]
  const endDate = addCalendarMonths(startDate, monthCount)
  const finalValue = solveTerminalValue(negativeFlows, endDate, targetRate)
  const cashFlows: DatedCashFlow[] = [
    ...negativeFlows,
    { date: endDate, amount: finalValue, kind: 'terminal' },
  ]

  let invested = initialValue
  let portfolio = initialValue
  let previousDate = startDate
  const points: ProjectionPoint[] = [{ date: startDate, invested, portfolio }]

  for (let month = 1; month <= monthCount; month += 1) {
    const date = addCalendarMonths(startDate, month)
    portfolio *= Math.pow(1 + targetRate, yearFraction(previousDate, date))
    portfolio += monthlyContribution
    invested += monthlyContribution
    points.push({ date, invested, portfolio })
    previousDate = date
  }

  // Use the solver result at the terminal date so the chart and matrix share
  // exactly the same final cash flow, including floating-point rounding.
  points[points.length - 1].portfolio = finalValue

  return {
    cashFlows,
    points,
    finalValue,
    totalInvested: invested,
    totalGrowth: finalValue - invested,
    npvResidual: xnpv(targetRate, cashFlows),
  }
}
