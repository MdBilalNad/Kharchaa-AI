
export type BudgetInput = {
  allowance: number
  hostel: number
  mess: number
  otherFixed: number
  savingsPercent?: number
  emergencyPercent?: number
  miscellaneousPercent?: number
}

export type BudgetPlan = {
  totalAllowance: number
  fixedCosts: number
  availableAfterFixed: number
  dailySpending: number
  savings: number
  emergencyFund: number
  miscellaneous: number
  dailyLimit: number
  daysRemaining: number
  shortfall: number
}

export function createBudgetPlan(
  input: BudgetInput,
  daysRemaining: number,
): BudgetPlan {
  const values = [
    input.allowance,
    input.hostel,
    input.mess,
    input.otherFixed,
  ]

  if (
    values.some(
      (value) => !Number.isFinite(value) || value < 0,
    )
  ) {
    throw new Error('Budget amounts must be valid non-negative numbers.')
  }

  if (!Number.isInteger(daysRemaining) || daysRemaining < 1) {
    throw new Error('Days remaining must be a positive integer.')
  }

  const savingsPercent = input.savingsPercent ?? 20
  const emergencyPercent = input.emergencyPercent ?? 10
  const miscellaneousPercent = input.miscellaneousPercent ?? 10

  const percentages = [
    savingsPercent,
    emergencyPercent,
    miscellaneousPercent,
  ]

  if (
    percentages.some(
      (value) => !Number.isFinite(value) || value < 0,
    ) ||
    percentages.reduce((sum, value) => sum + value, 0) > 100
  ) {
    throw new Error('Allocation percentages must total no more than 100%.')
  }

  const fixedCosts = input.hostel + input.mess + input.otherFixed
  const availableAfterFixed = input.allowance - fixedCosts
  const shortfall = Math.max(0, -availableAfterFixed)
  const distributable = Math.max(0, availableAfterFixed)

  const savings = distributable * savingsPercent / 100
  const emergencyFund = distributable * emergencyPercent / 100
  const miscellaneous = distributable * miscellaneousPercent / 100
  const dailySpending = Math.max(
    0,
    distributable - savings - emergencyFund - miscellaneous,
  )

  return {
    totalAllowance: input.allowance,
    fixedCosts,
    availableAfterFixed,
    dailySpending,
    savings,
    emergencyFund,
    miscellaneous,
    dailyLimit: dailySpending / daysRemaining,
    daysRemaining,
    shortfall,
  }
}
