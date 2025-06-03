// Pension contribution calculation
export function calculatePension(salary: number): number {
  return Math.min(salary * 0.045, 150000)
}

// Health insurance calculation
export function calculateHealth(salary: number): number {
  return salary * 0.03545
}

// Long-term care insurance calculation
export function calculateCare(health: number): number {
  return health * 0.2377
}

// Employment insurance calculation
export function calculateEmployment(salary: number): number {
  return salary * 0.0105
}

// Accident insurance calculation
export function calculateAccident(salary: number): number {
  return salary * 0.008
}

// Retirement benefit calculation
export function calculateRetirement(salary: number): number {
  return salary / 12
}

// Main function to calculate total fixed cost
export function calculateFixedCost(salary: number): number {
  const pension = calculatePension(salary)
  const health = calculateHealth(salary)
  const care = calculateCare(health)
  const emp = calculateEmployment(salary)
  const accident = calculateAccident(salary)
  const retirement = calculateRetirement(salary)

  return salary + pension + health + care + emp + accident + retirement
} 