export interface Alert {
  id: string
  type: "warning" | "success" | "info"
  message: string
  date: string
}

export interface MenuSales {
  menuId: string
  quantity: number
}

export interface DailySales {
  date: string
  menuSales: MenuSales[]
  otherRevenue: number
  otherCosts: number
  totalRevenue: number
  totalCosts: number
  netProfit: number
  bepAchieved: boolean
}

export interface TargetGoals {
  targetProfit: number
  targetRevenue: number
}

export interface MenuAnalysis {
  menuId: string
  totalSold: number
  totalRevenue: number
  totalProfit: number
  averageDaily: number
  profitMargin: number
}

export interface CostDetailItem {
  id: string
  name: string
  amount: number
  person?: string
  memo?: string
  dailyWage?: number
  workDays?: number
  autoRetirementFundDisplay?: string
  autoInsuranceDisplay?: string
}

export interface FixedCosts {
  rent: CostDetailItem[]
  depreciation: CostDetailItem[]
  employeeSalary: CostDetailItem[]
  retirementFund: CostDetailItem[]
  welfare: CostDetailItem[]
  insurance: CostDetailItem[]
  phone: CostDetailItem[]
  posRental: CostDetailItem[]
  security: CostDetailItem[]
  internet: CostDetailItem[]
  pest: CostDetailItem[]
  loanInterest: CostDetailItem[]
  advertising: CostDetailItem[]
  rental: CostDetailItem[]
  tax: CostDetailItem[]
  [key: string]: CostDetailItem[]
}

export interface VariableCosts {
  ingredients: CostDetailItem[]
  electricity: CostDetailItem[]
  gas: CostDetailItem[]
  water: CostDetailItem[]
  employeeBonus: CostDetailItem[]
  partTime: CostDetailItem[]
  vat: CostDetailItem[]
  [key: string]: CostDetailItem[]
}

export interface SpecificCardFeeData {
  id: string
  name: string
  feeRate: number
  salesAmount: number
  calculatedFee: number
} 