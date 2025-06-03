"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Save, Download, Upload, Edit3, X } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay } from "date-fns"
import { ko } from "date-fns/locale"
import { saveAs } from "file-saver"
import { calculateFixedCost, calculatePension, calculateHealth, calculateCare, calculateEmployment, calculateAccident, calculateRetirement } from "@/lib/bep"
import { loadLatestBEPData, saveBEPData, listSavedBEPData } from "@/lib/db"

interface MenuItem {
  id: string
  name: string
  price: number
  cost: number
  costInputType: "amount" | "rate"
  costRate: number
  margin: number
  discountEnabled: boolean
  discountDays: string[]
  discountType: "rate" | "amount"
  discountRate: number
  discountAmount: number
}

interface CostDetailItem {
  id: string
  name: string
  amount: number
  person?: string
  memo?: string
  dailyWage?: number
  workDays?: number
  autoRetirementFundDisplay?: string // For edit form display
  autoInsuranceDisplay?: string // For edit form display
}

interface SpecificCardFeeData {
  id: string
  name: string
  feeRate: number
  salesAmount: number
  calculatedFee: number
}

interface FixedCosts {
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

interface VariableCosts {
  ingredients: CostDetailItem[]
  electricity: CostDetailItem[]
  gas: CostDetailItem[]
  water: CostDetailItem[]
  employeeBonus: CostDetailItem[]
  partTime: CostDetailItem[]
  vat: CostDetailItem[]
  [key: string]: CostDetailItem[]
}

interface MenuSales {
  menuId: string
  quantity: number
}

interface DailySales {
  date: string
  menuSales: MenuSales[]
  otherRevenue: number
  otherCosts: number
  totalRevenue: number
  totalCosts: number
  netProfit: number
  bepAchieved: boolean
}

interface DepreciationItem {
  id: string
  date: string
  category: string
  investmentAmount: number
  usefulLifeMonths: number
  monthlyDepreciation: number
  note: string
  targetEndDate: string
}

interface MarketingCost {
  id: string
  name: string
  amount: number
  startDate: string
  endDate: string
  period: "monthly" | "quarterly" | "biannual" | "annual"
  category: string
  memo: string
}

interface TargetGoals {
  targetProfit: number
  targetRevenue: number
}

interface Alert {
  id: string
  type: "warning" | "success" | "info"
  message: string
  date: string
}

interface MenuAnalysis {
  menuId: string
  totalSold: number
  totalRevenue: number
  totalProfit: number
  averageDaily: number
  profitMargin: number
}

const DEFAULT_FIXED_CATEGORIES = [
  { key: "storeRent", label: "매장월세", removable: false },
  { key: "depreciation", label: "감가상각비 (자동반영)", removable: false },
  { key: "laborCost", label: "인건비", removable: false }, // Main labor cost category
  { key: "retirementFund", label: "퇴직적립금 (실제적립액)", removable: true }, // For actual fund deposits
  { key: "insurance", label: "4대보험 등 (실제납부액)", removable: true }, // For actual insurance payments
  { key: "communication", label: "통신비 (전화, 인터넷)", removable: true },
  { key: "rentalFees", label: "렌탈료 (정수기, 음식물처리기 등)", removable: true },
  { key: "professionalServices", label: "전문가 비용 (세무 등)", removable: true },
  { key: "taxes", label: "기타 세금 및 공과금", removable: true },
  { key: "welfare", label: "복리후생비", removable: true },
  { key: "posRental", label: "포스기임대료", removable: true },
  { key: "security", label: "보안업체이용료", removable: true },
  { key: "pest", label: "방역/위생", removable: true },
  { key: "loanInterest", label: "대출이자", removable: true },
  { key: "advertising", label: "월 광고비 (마케팅비용과 별도)", removable: true },
]

const DEFAULT_VARIABLE_CATEGORIES = [
  { key: "ingredients", label: "식재료비 (일일매출 자동반영)", removable: false, isCalculated: true },
  { key: "electricity", label: "전기요금", removable: true },
  { key: "gas", label: "가스요금", removable: true },
  { key: "water", label: "수도요금", removable: true },
  { key: "cardFees", label: "카드수수료 (자동반영)", removable: false, isCardFee: true },
  { key: "employeeBonus", label: "정직원 추가수당", removable: true },
  { key: "partTime", label: "단기알바", removable: true },
  { key: "vatWithheld", label: "부가세 예수금 (매출 자동반영)", removable: false, isCalculated: true }, // Renamed key and label
]

const DISCOUNT_APPLICABLE_DAYS = ["월", "화", "수", "목", "금", "토", "일"]

const initialFixedCosts = (): FixedCosts =>
  DEFAULT_FIXED_CATEGORIES.reduce((acc, category) => {
    acc[category.key] = []
    return acc
  }, {} as FixedCosts)

const initialVariableCosts = (): VariableCosts =>
  DEFAULT_VARIABLE_CATEGORIES.filter((cat) => cat.key !== "cardFees").reduce((acc, category) => {
    acc[category.key] = []
    return acc
  }, {} as VariableCosts)

const initialSpecificCardFees = (): SpecificCardFeeData[] => [
  { id: "shinhan", name: "신한카드", feeRate: 0, salesAmount: 0, calculatedFee: 0 },
  { id: "kb", name: "KB국민카드", feeRate: 0, salesAmount: 0, calculatedFee: 0 },
  { id: "samsung", name: "삼성카드", feeRate: 0, salesAmount: 0, calculatedFee: 0 },
  { id: "hyundai", name: "현대카드", feeRate: 0, salesAmount: 0, calculatedFee: 0 },
  { id: "lotte", name: "롯데카드", feeRate: 0, salesAmount: 0, calculatedFee: 0 },
  { id: "woori", name: "우리카드", feeRate: 0, salesAmount: 0, calculatedFee: 0 },
  { id: "hana", name: "하나카드", feeRate: 0, salesAmount: 0, calculatedFee: 0 },
  { id: "bc", name: "BC카드", feeRate: 0, salesAmount: 0, calculatedFee: 0 },
]

const calculateTotalEmployeeCost = (salary: number): number => {
  return calculateFixedCost(salary)
}

const calculateEmployeeCostBreakdown = (salary: number) => {
  return {
    baseSalary: salary,
    pension: calculatePension(salary),
    health: calculateHealth(salary),
    care: calculateCare(calculateHealth(salary)),
    employment: calculateEmployment(salary),
    accident: calculateAccident(salary),
    retirement: calculateRetirement(salary),
    total: calculateFixedCost(salary)
  }
}

function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export default function RestaurantBEPCalculator() {
  const [restaurantName, setRestaurantName] = useState<string>("식당 BEP 계산기")
  const [isEditingRestaurantName, setIsEditingRestaurantName] = useState(false)

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [dailySales, setDailySales] = useState<DailySales[]>([])
  const [operatingDays, setOperatingDays] = useState<number>(26)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [marketingCosts, setMarketingCosts] = useState<MarketingCost[]>([])
  const [depreciationItems, setDepreciationItems] = useState<DepreciationItem[]>([])
  const [targetGoals, setTargetGoals] = useState<TargetGoals>({ targetProfit: 0, targetRevenue: 0 })
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showAlerts, setShowAlerts] = useState<boolean>(true)

  const [newMenuItem, setNewMenuItem] = useState({
    name: "",
    price: 0,
    cost: 0,
    costInputType: "amount" as "amount" | "rate",
    costRate: 0,
    discountEnabled: false,
    discountDays: [] as string[],
    discountType: "amount" as "rate" | "amount",
    discountRate: 0,
    discountAmount: 0,
  })

  const [fixedCosts, setFixedCosts] = useState<FixedCosts>(initialFixedCosts)
  const [variableCosts, setVariableCosts] = useState<VariableCosts>(initialVariableCosts)
  const [specificCardFees, setSpecificCardFees] = useState<SpecificCardFeeData[]>(initialSpecificCardFees())

  const [newFixedCostItem, setNewFixedCostItem] = useState({
    category: "",
    name: "",
    amount: "",
    person: "",
    memo: "",
    autoRetirementFundDisplay: "",
    autoInsuranceDisplay: "",
  })
  const [newVariableCostItem, setNewVariableCostItem] = useState({
    category: "",
    name: "",
    amount: "",
    person: "",
    memo: "",
    dailyWage: "",
    workDays: "",
  })

  const [newMarketingCost, setNewMarketingCost] = useState({
    name: "",
    amount: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    period: "monthly" as "monthly" | "quarterly" | "biannual" | "annual",
    category: "online",
    memo: "",
  })
  const [dailyMenuSales, setDailyMenuSales] = useState<{ [menuId: string]: string }>({})
  const [otherRevenue, setOtherRevenue] = useState<string>("")
  const [otherCosts, setOtherCosts] = useState<string>("")

  const [newDepreciationItem, setNewDepreciationItem] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    category: "",
    investmentAmount: "",
    usefulLifeMonths: "",
    note: "",
  })

  const [customVariableCategories, setCustomVariableCategories] = useState<string[]>([])
  const [customFixedCategories, setCustomFixedCategories] = useState<string[]>([])
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryType, setNewCategoryType] = useState<"fixed" | "variable">("variable")

  const [editingMenuId, setEditingMenuId] = useState<string | null>(null)
  const [editMenuItem, setEditMenuItem] = useState<MenuItem | null>(null)

  const [editingCostId, setEditingCostId] = useState<string | null>(null)
  const [editingCostCategory, setEditingCostCategory] = useState<string | null>(null)
  const [editingCostType, setEditingCostType] = useState<"fixed" | "variable" | null>(null)
  const [editCostItem, setEditCostItem] = useState<CostDetailItem | null>(null)

  const [vatSettings, setVatSettings] = useState({ enabled: true, rate: 10, autoCalculate: true })
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null)
  const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null)
  const [bulkMarginRate, setBulkMarginRate] = useState<string>("")

  const [savedList, setSavedList] = useState<any[]>([])

  const parseInputAsNumber = (value: string): number => Number.parseFloat(value.replace(/,/g, "")) || 0
  const formatNumberForDisplay = (
    value: number | string | undefined,
    unit: "천원" | "원" | "만원" | "%" = "원",
    scaleFactor = 1,
    fractionDigits = 0,
  ): string => {
    const numValue = typeof value === "string" ? parseInputAsNumber(value) : value || 0
    let displayValue = numValue / scaleFactor
    if (unit === "만원") displayValue = numValue / 10000
    else if (unit === "천원") displayValue = numValue / 1000
    else displayValue = numValue
    let formatted = displayValue.toLocaleString("ko-KR", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
    if (unit !== "%") formatted += unit
    else formatted += "%"
    return formatted
  }

  const calculateAutoVAT = useCallback(() => {
    const currentMonthStr = format(currentMonth, "yyyy-MM")
    const monthSales = dailySales.filter((sale) => sale.date.startsWith(currentMonthStr))
    const totalRevenue = monthSales.reduce((sum, sale) => sum + sale.totalRevenue, 0)
    return vatSettings.enabled && vatSettings.autoCalculate ? totalRevenue * (vatSettings.rate / 100) : 0
  }, [currentMonth, dailySales, vatSettings])

  const handleSaveAll = useCallback(() => {
    // localStorage 저장
    localStorage.setItem("restaurant-name", restaurantName)
    localStorage.setItem("restaurant-menu-items", JSON.stringify(menuItems))
    localStorage.setItem("restaurant-daily-sales", JSON.stringify(dailySales))
    localStorage.setItem("restaurant-operating-days", operatingDays.toString())
    localStorage.setItem("restaurant-fixed-costs", JSON.stringify(fixedCosts))
    localStorage.setItem("restaurant-variable-costs", JSON.stringify(variableCosts))
    localStorage.setItem("restaurant-specific-card-fees", JSON.stringify(specificCardFees))
    localStorage.setItem("restaurant-marketing-costs", JSON.stringify(marketingCosts))
    localStorage.setItem("restaurant-depreciation-items", JSON.stringify(depreciationItems))
    localStorage.setItem("restaurant-target-goals", JSON.stringify(targetGoals))
    localStorage.setItem("restaurant-custom-variable-categories", JSON.stringify(customVariableCategories))
    localStorage.setItem("restaurant-custom-fixed-categories", JSON.stringify(customFixedCategories))
    localStorage.setItem("restaurant-vat-settings", JSON.stringify(vatSettings))
    // Supabase 저장
    saveBEPData(restaurantName, {
      menuItems,
      fixedCosts,
      variableCosts,
      marketingCosts,
      depreciationItems,
      targetGoals,
    })
  }, [restaurantName, menuItems, dailySales, operatingDays, fixedCosts, variableCosts, specificCardFees, marketingCosts, depreciationItems, targetGoals, customVariableCategories, customFixedCategories, vatSettings])

  // 자동저장 (2초 debounce)
  useEffect(() => {
    const debounced = debounce(handleSaveAll, 2000)
    debounced()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantName, menuItems, dailySales, operatingDays, fixedCosts, variableCosts, specificCardFees, marketingCosts, depreciationItems, targetGoals, customVariableCategories, customFixedCategories, vatSettings])

  const handleSaveRestaurantName = () => {
    setIsEditingRestaurantName(false)
    handleSaveAll()
  }

  // 최신 데이터 불러오기
  useEffect(() => {
    async function fetchLatest() {
      const latest = await loadLatestBEPData()
      if (latest && latest.data) {
        setMenuItems(latest.data.menuItems || [])
        setFixedCosts(latest.data.fixedCosts || [])
        setVariableCosts(latest.data.variableCosts || [])
        setMarketingCosts(latest.data.marketingCosts || [])
        setDepreciationItems(latest.data.depreciationItems || [])
        setTargetGoals(latest.data.targetGoals || { targetProfit: 0, targetRevenue: 0 })
        setRestaurantName(latest.name || "식당 BEP 계산기")
      }
    }
    fetchLatest()
  }, [])

  // 저장 내역 리스트 불러오기
  useEffect(() => {
    listSavedBEPData().then(setSavedList)
  }, [])

  useEffect(() => {
    const savedName = localStorage.getItem("restaurant-name")
    if (savedName) setRestaurantName(savedName)
    const savedMenuItems = localStorage.getItem("restaurant-menu-items")
    if (savedMenuItems) setMenuItems(JSON.parse(savedMenuItems))
    const savedDailySales = localStorage.getItem("restaurant-daily-sales")
    if (savedDailySales) setDailySales(JSON.parse(savedDailySales))
    const savedOperatingDays = localStorage.getItem("restaurant-operating-days")
    if (savedOperatingDays) setOperatingDays(Number.parseInt(savedOperatingDays))
    const savedFixedCosts = localStorage.getItem("restaurant-fixed-costs")
    if (savedFixedCosts) setFixedCosts(JSON.parse(savedFixedCosts))
    else setFixedCosts(initialFixedCosts())
    const savedVariableCosts = localStorage.getItem("restaurant-variable-costs")
    if (savedVariableCosts) setVariableCosts(JSON.parse(savedVariableCosts))
    else setVariableCosts(initialVariableCosts())
    const savedSpecificCardFees = localStorage.getItem("restaurant-specific-card-fees")
    if (savedSpecificCardFees) setSpecificCardFees(JSON.parse(savedSpecificCardFees))
    else setSpecificCardFees(initialSpecificCardFees())
    const savedMarketingCosts = localStorage.getItem("restaurant-marketing-costs")
    if (savedMarketingCosts) setMarketingCosts(JSON.parse(savedMarketingCosts))
    const savedDepreciationItems = localStorage.getItem("restaurant-depreciation-items")
    if (savedDepreciationItems) setDepreciationItems(JSON.parse(savedDepreciationItems))
    const savedTargetGoals = localStorage.getItem("restaurant-target-goals")
    if (savedTargetGoals) setTargetGoals(JSON.parse(savedTargetGoals))
    const savedCustomVariableCategories = localStorage.getItem("restaurant-custom-variable-categories")
    if (savedCustomVariableCategories) setCustomVariableCategories(JSON.parse(savedCustomVariableCategories))
    const savedCustomFixedCategories = localStorage.getItem("restaurant-custom-fixed-categories")
    if (savedCustomFixedCategories) setCustomFixedCategories(JSON.parse(savedCustomFixedCategories))
    const savedVatSettings = localStorage.getItem("restaurant-vat-settings")
    if (savedVatSettings) setVatSettings(JSON.parse(savedVatSettings))

    if (!savedMenuItems || JSON.parse(savedMenuItems).length === 0) {
      const defaultMenus: MenuItem[] = [
        {
          id: "1",
          name: "한우 양념갈비 150g",
          price: 29000,
          cost: 14500,
          costInputType: "amount",
          costRate: 50,
          margin: 50,
          discountEnabled: false,
          discountDays: [],
          discountType: "amount",
          discountRate: 0,
          discountAmount: 0,
        },
        {
          id: "2",
          name: "한우 불고기솥밥",
          price: 23000,
          cost: 11500,
          costInputType: "amount",
          costRate: 50,
          margin: 50,
          discountEnabled: false,
          discountDays: [],
          discountType: "amount",
          discountRate: 0,
          discountAmount: 0,
        },
      ]
      setMenuItems(defaultMenus)
    }
  }, [])

  useEffect(() => {
    const dateString = format(selectedDate, "yyyy-MM-dd")
    const existingSale = dailySales.find((sale) => sale.date === dateString)
    if (existingSale) {
      const menuSalesMap: { [menuId: string]: string } = {}
      existingSale.menuSales.forEach((sale) => {
        menuSalesMap[sale.menuId] = sale.quantity.toString()
      })
      setDailyMenuSales(menuSalesMap)
      setOtherRevenue(existingSale.otherRevenue.toString())
      setOtherCosts(existingSale.otherCosts.toString())
    } else {
      setDailyMenuSales({})
      setOtherRevenue("0")
      setOtherCosts("0")
    }
  }, [selectedDate, dailySales])

  const calculateCostAndMargin = useCallback(
    (
      item: Omit<MenuItem, "id" | "margin"> & { price: number; cost: number; discountAmount: number },
      newPriceValue?: number,
      newCostAmountValue?: number,
      newCostRateValue?: number,
      newCostInputType?: "amount" | "rate",
    ) => {
      const price = newPriceValue !== undefined ? newPriceValue : item.price
      const costInputType = newCostInputType !== undefined ? newCostInputType : item.costInputType
      let cost: number
      if (costInputType === "amount") {
        cost = newCostAmountValue !== undefined ? newCostAmountValue : item.cost
      } else {
        const costRate = newCostRateValue !== undefined ? newCostRateValue : item.costRate
        cost = price * (costRate / 100)
      }
      const margin = price > 0 ? ((price - cost) / price) * 100 : 0
      return {
        price,
        cost: Number.parseFloat(cost.toFixed(2)),
        costRate:
          costInputType === "rate"
            ? newCostRateValue !== undefined
              ? newCostRateValue
              : item.costRate
            : price > 0
              ? Number.parseFloat(((cost / price) * 100).toFixed(2))
              : 0,
        costInputType,
        margin: Number.parseFloat(margin.toFixed(2)),
      }
    },
    [],
  )

  const addMenuItem = () => {
    if (!newMenuItem.name || !newMenuItem.price) {
      alert("메뉴명과 판매가격을 입력해주세요.")
      return
    }
    const priceValue = newMenuItem.price * 1000
    const { cost, margin, costRate, costInputType } = calculateCostAndMargin(
      { ...newMenuItem, price: priceValue, cost: newMenuItem.cost },
      priceValue,
      newMenuItem.costInputType === "amount" ? newMenuItem.cost * 1000 : undefined,
      newMenuItem.costInputType === "rate" ? newMenuItem.costRate : undefined,
      newMenuItem.costInputType,
    )
    const item: MenuItem = {
      id: Date.now().toString(),
      name: newMenuItem.name,
      price: priceValue,
      cost,
      costInputType,
      costRate,
      margin,
      discountEnabled: newMenuItem.discountEnabled,
      discountDays: newMenuItem.discountDays,
      discountType: newMenuItem.discountType,
      discountRate: newMenuItem.discountRate,
      discountAmount: newMenuItem.discountAmount * 1000,
    }
    setMenuItems([...menuItems, item])
    setNewMenuItem({
      name: "",
      price: 0,
      cost: 0,
      costInputType: "amount",
      costRate: 0,
      discountEnabled: false,
      discountDays: [],
      discountType: "amount",
      discountRate: 0,
      discountAmount: 0,
    })
  }

  const removeMenuItem = (id: string) => {
    setMenuItems(menuItems.filter((item) => item.id !== id))
  }

  const startEditMenu = (menu: MenuItem) => {
    setEditingMenuId(menu.id)
    setEditMenuItem({ ...menu, discountDays: Array.isArray(menu.discountDays) ? menu.discountDays : [] })
  }

  const cancelEditMenu = () => {
    setEditingMenuId(null)
    setEditMenuItem(null)
  }

  const saveEditMenu = () => {
    if (!editMenuItem) return
    const priceValue = Math.round(editMenuItem.price / 1000) * 1000
    const { cost, margin, costRate, costInputType } = calculateCostAndMargin(
      {
        ...editMenuItem,
        price: priceValue,
        cost: editMenuItem.cost,
        costRate: editMenuItem.costRate,
        discountAmount: editMenuItem.discountAmount,
      },
      priceValue,
      editMenuItem.costInputType === "amount" ? editMenuItem.cost : undefined,
      editMenuItem.costInputType === "rate" ? editMenuItem.costRate : undefined,
      editMenuItem.costInputType,
    )
    const updatedItem: MenuItem = {
      ...editMenuItem,
      price: priceValue,
      cost,
      costInputType,
      costRate,
      margin,
      discountAmount: Math.round(editMenuItem.discountAmount / 1000) * 1000,
      discountDays: Array.isArray(editMenuItem.discountDays) ? editMenuItem.discountDays : [],
    }
    setMenuItems((prevItems) => prevItems.map((item) => (item.id === editMenuItem.id ? updatedItem : item)))
    cancelEditMenu()
  }

  const handleNewFixedCostAmountChange = (value: string) => {
    const amount = parseInputAsNumber(value) * 1000
    let autoRetirementFundDisplay = ""
    let autoInsuranceDisplay = ""
    if (newFixedCostItem.category === "laborCost" && amount > 0) {
      // Changed here
      autoRetirementFundDisplay = `예상 퇴직적립금(8.33%): ${formatNumberForDisplay(amount * (1 / 12), "원")}` // Standard 1/12 for display
      autoInsuranceDisplay = `예상 4대보험(9%): ${formatNumberForDisplay(amount * 0.09, "원")}`
    }
    setNewFixedCostItem((prev) => ({
      ...prev,
      amount: amount.toString(),
      autoRetirementFundDisplay,
      autoInsuranceDisplay,
    }))
  }

  const handleEditCostAmountChange = (value: string) => {
    if (!editCostItem) return
    const amount = parseInputAsNumber(value) * 1000
    let autoRetirementFundDisplay = editCostItem.autoRetirementFundDisplay
    let autoInsuranceDisplay = editCostItem.autoInsuranceDisplay
    if (editingCostCategory === "laborCost" && amount > 0) {
      // Changed here
      autoRetirementFundDisplay = `예상 퇴직적립금(8.33%): ${formatNumberForDisplay(amount * (1 / 12), "원")}`
      autoInsuranceDisplay = `예상 4대보험(9%): ${formatNumberForDisplay(amount * 0.09, "원")}`
    }
    setEditCostItem((prev) => (prev ? { ...prev, amount, autoRetirementFundDisplay, autoInsuranceDisplay } : null))
  }

  const handleEditCostPartTimeChange = (field: "dailyWage" | "workDays", value: string) => {
    if (!editCostItem) return
    const numValue = parseInputAsNumber(value)
    let newAmount = editCostItem.amount
    let newDailyWage = editCostItem.dailyWage || 0
    let newWorkDays = editCostItem.workDays || 0
    let newMemo = editCostItem.memo || ""

    if (field === "dailyWage") {
      newDailyWage = numValue * 1000 // 천원 to 원
    } else {
      newWorkDays = numValue
    }

    if (newDailyWage > 0 && newWorkDays > 0) {
      newAmount = newDailyWage * newWorkDays
      const baseMemo = newMemo.split("일급:")[0]?.split(". ")[1] || ""
      newMemo = `일급: ${formatNumberForDisplay(newDailyWage, "원")}, 근무일수: ${newWorkDays}일. ${baseMemo}`.trim()
    }

    setEditCostItem((prev) =>
      prev
        ? {
            ...prev,
            amount: newAmount,
            dailyWage: field === "dailyWage" ? newDailyWage : prev.dailyWage,
            workDays: field === "workDays" ? newWorkDays : prev.workDays,
            memo: newMemo,
          }
        : null,
    )
  }

  const addFixedCostItem = () => {
    if (!newFixedCostItem.category || !newFixedCostItem.name || !newFixedCostItem.amount) {
      alert("카테고리, 세부 항목명, 금액을 모두 입력해주세요.")
      return
    }
    const amountValue = parseInputAsNumber(newFixedCostItem.amount)
    const item: CostDetailItem = {
      id: Date.now().toString(),
      name: newFixedCostItem.name,
      amount: amountValue,
      person: newFixedCostItem.person || undefined,
      memo: newFixedCostItem.memo || undefined,
    }
    if (newFixedCostItem.category === "laborCost" && amountValue > 0) {
      // Changed here
      const retirementDisplay = `예상 퇴직적립금(8.33%): ${formatNumberForDisplay(amountValue * (1 / 12), "원")}`
      const insuranceDisplay = `예상 4대보험(9%): ${formatNumberForDisplay(amountValue * 0.09, "원")}`
      item.memo =
        `${item.memo || ""} (${retirementDisplay}, ${insuranceDisplay} - 실제 납부/적립액은 해당 카테고리에 별도 입력)`.trim()
    }
    setFixedCosts((prev) => ({
      ...prev,
      [newFixedCostItem.category]: [...(prev[newFixedCostItem.category] || []), item],
    }))
    setNewFixedCostItem({
      category: "",
      name: "",
      amount: "",
      person: "",
      memo: "",
      autoRetirementFundDisplay: "",
      autoInsuranceDisplay: "",
    })
  }

  const removeFixedCostItem = (category: string, itemId: string) => {
    setFixedCosts((prev) => ({ ...prev, [category]: (prev[category] || []).filter((item) => item.id !== itemId) }))
  }

  const addVariableCostItem = () => {
    if (!newVariableCostItem.category || !newVariableCostItem.name) {
      alert("카테고리와 세부 항목명을 입력해주세요.")
      return
    }
    let amountValue: number
    let itemMemo = newVariableCostItem.memo || ""
    let dailyWageVal: number | undefined = undefined
    let workDaysVal: number | undefined = undefined

    if (newVariableCostItem.category === "partTime") {
      dailyWageVal = parseInputAsNumber(newVariableCostItem.dailyWage || "0") * 1000
      workDaysVal = parseInputAsNumber(newVariableCostItem.workDays || "0")
      if (dailyWageVal <= 0 || workDaysVal <= 0) {
        alert("단기알바의 경우 일급과 근무일수를 정확히 입력해주세요.")
        return
      }
      amountValue = dailyWageVal * workDaysVal
      itemMemo = `일급: ${formatNumberForDisplay(dailyWageVal, "원")}, 근무일수: ${workDaysVal}일. ${itemMemo}`.trim()
    } else {
      if (!newVariableCostItem.amount) {
        alert("금액을 입력해주세요.")
        return
      }
      amountValue = parseInputAsNumber(newVariableCostItem.amount) * 1000
    }
    const item: CostDetailItem = {
      id: Date.now().toString(),
      name: newVariableCostItem.name,
      amount: amountValue,
      person: newVariableCostItem.person || undefined,
      memo: itemMemo,
      dailyWage: dailyWageVal,
      workDays: workDaysVal,
    }
    setVariableCosts((prev) => ({
      ...prev,
      [newVariableCostItem.category]: [...(prev[newVariableCostItem.category] || []), item],
    }))
    setNewVariableCostItem({ category: "", name: "", amount: "", person: "", memo: "", dailyWage: "", workDays: "" })
  }

  const removeVariableCostItem = (category: string, itemId: string) => {
    setVariableCosts((prev) => ({ ...prev, [category]: (prev[category] || []).filter((item) => item.id !== itemId) }))
  }

  const startEditCost = (item: CostDetailItem, category: string, type: "fixed" | "variable") => {
    setEditingCostId(item.id)
    setEditingCostCategory(category)
    setEditingCostType(type)
    let autoRetirementFundDisplay = ""
    let autoInsuranceDisplay = ""
    if (type === "fixed" && category === "laborCost" && item.amount > 0) {
      // Changed here
      autoRetirementFundDisplay = `예상 퇴직적립금(8.33%): ${formatNumberForDisplay(item.amount * (1 / 12), "원")}`
      autoInsuranceDisplay = `예상 4대보험(9%): ${formatNumberForDisplay(item.amount * 0.09, "원")}`
    }
    setEditCostItem({ ...item, autoRetirementFundDisplay, autoInsuranceDisplay })
  }

  const cancelEditCost = () => {
    setEditingCostId(null)
    setEditingCostCategory(null)
    setEditingCostType(null)
    setEditCostItem(null)
  }

  const saveEditCost = () => {
    if (!editCostItem || !editingCostCategory || !editingCostType) return

    const finalCostItem = { ...editCostItem }

    if (editingCostType === "fixed" && editingCostCategory === "laborCost" && finalCostItem.amount > 0) {
      // Changed here
      const retirementDisplay = `예상 퇴직적립금(8.33%): ${formatNumberForDisplay(finalCostItem.amount * (1 / 12), "원")}`
      const insuranceDisplay = `예상 4대보험(9%): ${formatNumberForDisplay(finalCostItem.amount * 0.09, "원")}`
      const baseMemo = finalCostItem.memo?.split(" (예상 퇴직적립금:")[0] || finalCostItem.memo || ""
      finalCostItem.memo =
        `${baseMemo} (${retirementDisplay}, ${insuranceDisplay} - 실제 납부/적립액은 해당 카테고리에 별도 입력)`.trim()
    } else if (editingCostType === "variable" && editingCostCategory === "partTime") {
      const dailyWage = finalCostItem.dailyWage || 0
      const workDays = finalCostItem.workDays || 0
      if (dailyWage > 0 && workDays > 0) {
        finalCostItem.amount = dailyWage * workDays
        const userMemoPart = finalCostItem.memo?.split("일. ")[1] || finalCostItem.memo?.split("일.")[1] || ""
        finalCostItem.memo =
          `일급: ${formatNumberForDisplay(dailyWage, "원")}, 근무일수: ${workDays}일. ${userMemoPart}`.trim()
      }
    }

    if (editingCostType === "fixed") {
      setFixedCosts((prev) => ({
        ...prev,
        [editingCostCategory]: (prev[editingCostCategory] || []).map((item) =>
          item.id === finalCostItem.id ? finalCostItem : item,
        ),
      }))
    } else {
      setVariableCosts((prev) => ({
        ...prev,
        [editingCostCategory]: (prev[editingCostCategory] || []).map((item) =>
          item.id === finalCostItem.id ? finalCostItem : item,
        ),
      }))
    }
    cancelEditCost()
  }

  const handleSpecificCardFeeChange = (cardId: string, field: "feeRate" | "salesAmount", value: string) => {
    setSpecificCardFees((prevFees) =>
      prevFees.map((card) => {
        if (card.id === cardId) {
          const newValue = Number.parseFloat(value) || 0
          const updatedCard = { ...card, [field]: newValue }
          const calculatedFee = updatedCard.salesAmount * (updatedCard.feeRate / 100)
          return { ...updatedCard, calculatedFee: Number.parseFloat(calculatedFee.toFixed(2)) }
        }
        return card
      }),
    )
  }

  const addDepreciationItem = () => {
    if (!newDepreciationItem.category || !newDepreciationItem.investmentAmount || !newDepreciationItem.usefulLifeMonths)
      return
    const investmentAmount = parseInputAsNumber(newDepreciationItem.investmentAmount) * 1000
    const usefulLifeMonths = Number.parseInt(newDepreciationItem.usefulLifeMonths)
    const monthlyDepreciation = usefulLifeMonths > 0 ? investmentAmount / usefulLifeMonths : 0
    const startDate = new Date(newDepreciationItem.date)
    const targetEndDate = new Date(startDate)
    targetEndDate.setMonth(targetEndDate.getMonth() + usefulLifeMonths)
    const item: DepreciationItem = {
      id: Date.now().toString(),
      date: newDepreciationItem.date,
      category: newDepreciationItem.category,
      investmentAmount,
      usefulLifeMonths,
      monthlyDepreciation,
      note: newDepreciationItem.note,
      targetEndDate: format(targetEndDate, "yyyy-MM-dd"),
    }
    setDepreciationItems([...depreciationItems, item])
    setNewDepreciationItem({
      date: format(new Date(), "yyyy-MM-dd"),
      category: "",
      investmentAmount: "",
      usefulLifeMonths: "",
      note: "",
    })
  }

  const removeDepreciationItem = (id: string) => {
    setDepreciationItems(depreciationItems.filter((item) => item.id !== id))
  }

  const addMarketingCost = () => {
    if (!newMarketingCost.name || !newMarketingCost.amount) return
    const marketingCost: MarketingCost = {
      id: Date.now().toString(),
      name: newMarketingCost.name,
      amount: parseInputAsNumber(newMarketingCost.amount) * 1000,
      startDate: newMarketingCost.startDate,
      endDate: newMarketingCost.endDate,
      period: newMarketingCost.period,
      category: newMarketingCost.category,
      memo: newMarketingCost.memo,
    }
    setMarketingCosts([...marketingCosts, marketingCost])
    setNewMarketingCost({
      name: "",
      amount: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      period: "monthly",
      category: "online",
      memo: "",
    })
  }

  const removeMarketingCost = (id: string) => {
    setMarketingCosts(marketingCosts.filter((cost) => cost.id !== id))
  }

  const getCurrentDepreciationTotal = useCallback((): number => {
    const today = new Date()
    return depreciationItems
      .filter((item) => {
        const startDate = new Date(item.date)
        const endDate = new Date(item.targetEndDate)
        return today >= startDate && today <= endDate
      })
      .reduce((sum, item) => sum + item.monthlyDepreciation, 0)
  }, [depreciationItems])

  const getFixedCategoryTotal = useCallback(
    (category: string): number => {
      if (category === "depreciation") {
        return getCurrentDepreciationTotal()
      }
      return (fixedCosts[category] || []).reduce((sum, item) => sum + item.amount, 0)
    },
    [fixedCosts, getCurrentDepreciationTotal],
  )

  const getVariableCategoryTotal = useCallback(
    (category: string): number => {
      if (category === "cardFees") {
        return specificCardFees.reduce((sum, item) => sum + item.calculatedFee, 0)
      }
      return (variableCosts[category] || []).reduce((sum, item) => sum + item.amount, 0)
    },
    [variableCosts, specificCardFees],
  )

  const getTotalFixedCosts = useCallback((): number => {
    return (
      DEFAULT_FIXED_CATEGORIES.reduce((total, cat) => total + getFixedCategoryTotal(cat.key), 0) +
      customFixedCategories.reduce((total, catKey) => total + getFixedCategoryTotal(catKey), 0)
    )
  }, [fixedCosts, customFixedCategories, getFixedCategoryTotal])

  const getTotalVariableCosts = useCallback((): number => {
    const generalVariableCosts =
      DEFAULT_VARIABLE_CATEGORIES.filter(
        (cat) => (!cat.isCalculated || (cat.key === "vatWithheld" && !vatSettings.autoCalculate)) && !cat.isCardFee,
      ).reduce((total, cat) => total + getVariableCategoryTotal(cat.key), 0) +
      customVariableCategories.reduce((total, catKey) => total + getVariableCategoryTotal(catKey), 0)
    const cardFeesTotal = getVariableCategoryTotal("cardFees")
    return generalVariableCosts + cardFeesTotal
  }, [variableCosts, specificCardFees, customVariableCategories, getVariableCategoryTotal, vatSettings.autoCalculate])

  const getCurrentMonthMarketingCosts = useCallback((): number => {
    let total = 0
    marketingCosts.forEach((cost) => {
      const startDate = new Date(cost.startDate)
      const endDate = new Date(cost.endDate)
      const today = new Date()
      if (today >= startDate && today <= endDate) {
        let monthlyAmount = 0
        switch (cost.period) {
          case "monthly":
            monthlyAmount = cost.amount
            break
          case "quarterly":
            monthlyAmount = cost.amount / 3
            break
          case "biannual":
            monthlyAmount = cost.amount / 6
            break
          case "annual":
            monthlyAmount = cost.amount / 12
            break
        }
        total += monthlyAmount
      }
    })
    return total
  }, [marketingCosts])

  const getDiscountedPrice = (menu: MenuItem, dateForDiscount?: Date): number => {
    const targetDate = dateForDiscount || selectedDate
    if (!menu.discountEnabled || !targetDate) return menu.price
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"]
    const currentDay = dayNames[targetDate.getDay()]
    if (menu.discountDays.includes(currentDay)) {
      if (menu.discountType === "rate") {
        return menu.price * (1 - menu.discountRate / 100)
      } else {
        return Math.max(0, menu.price - menu.discountAmount)
      }
    }
    return menu.price
  }

  const calculateDailySalesData = () => {
    let totalRevenue = 0
    let totalCosts = 0
    const currentMenuSales: MenuSales[] = []
    menuItems.forEach((menu) => {
      const quantity = Number.parseInt(dailyMenuSales[menu.id] || "0")
      if (quantity > 0) {
        currentMenuSales.push({ menuId: menu.id, quantity })
        const discountedPrice = getDiscountedPrice(menu, selectedDate)
        totalRevenue += discountedPrice * quantity
        totalCosts += menu.cost * quantity
      }
    })
    const otherRev = parseInputAsNumber(otherRevenue) || 0
    const otherCost = parseInputAsNumber(otherCosts) || 0
    totalRevenue += otherRev
    totalCosts += otherCost
    const netProfit = totalRevenue - totalCosts
    const bepData = calculateBEP()
    const bepAchieved = totalRevenue >= bepData.dailyBEP
    return {
      menuSales: currentMenuSales,
      otherRevenue: otherRev,
      otherCosts: otherCost,
      totalRevenue,
      totalCosts,
      netProfit,
      bepAchieved,
    }
  }

  const calculateBEP = useCallback(() => {
    const fixedCostsValue = getTotalFixedCosts()
    const variableCostsValue = getTotalVariableCosts()
    const marketingCostsValue = getCurrentMonthMarketingCosts()

    let totalProjectedRevenue = 0
    let totalProjectedMenuCost = 0
    menuItems.forEach((item) => {
      totalProjectedRevenue += item.price
      totalProjectedMenuCost += item.cost
    })

    const contributionMarginRate =
      totalProjectedRevenue > 0 ? (totalProjectedRevenue - totalProjectedMenuCost) / totalProjectedRevenue : 0

    const totalFixedLikeExpenses = fixedCostsValue + variableCostsValue + marketingCostsValue

    const monthlyBEP =
      contributionMarginRate > 0 ? totalFixedLikeExpenses / contributionMarginRate : Number.POSITIVE_INFINITY
    const dailyBEP = operatingDays > 0 ? monthlyBEP / operatingDays : Number.POSITIVE_INFINITY

    return {
      monthlyFixedCosts: fixedCostsValue,
      monthlyVariableCosts: variableCostsValue,
      averageMarginRate: contributionMarginRate * 100,
      operatingDays,
      dailyBEP,
      monthlyBEP,
    }
  }, [getTotalFixedCosts, getTotalVariableCosts, getCurrentMonthMarketingCosts, menuItems, operatingDays])

  const updateDailySales = () => {
    const dateString = format(selectedDate, "yyyy-MM-dd")
    const salesData = calculateDailySalesData()
    const newSale: DailySales = { date: dateString, ...salesData }
    const existingIndex = dailySales.findIndex((sale) => sale.date === dateString)
    if (existingIndex >= 0) {
      const updatedSales = [...dailySales]
      updatedSales[existingIndex] = newSale
      setDailySales(updatedSales)
    } else {
      setDailySales([...dailySales, newSale])
    }
    alert("매출 데이터가 저장되었습니다!")
  }

  const getMonthlyAnalysis = useCallback(() => {
    const currentMonthStr = format(currentMonth, "yyyy-MM")
    const monthSales = dailySales.filter((sale) => sale.date.startsWith(currentMonthStr))
    const totalRevenue = monthSales.reduce((sum, sale) => sum + sale.totalRevenue, 0)
    const totalMenuCostsFromSales = monthSales.reduce((sum, sale) => {
      let dailyMenuCost = 0
      sale.menuSales.forEach((ms) => {
        const menuItem = menuItems.find((mi) => mi.id === ms.menuId)
        if (menuItem) {
          dailyMenuCost += menuItem.cost * ms.quantity
        }
      })
      return sum + dailyMenuCost + sale.otherCosts
    }, 0)

    const totalFixedCostsForMonth = getTotalFixedCosts()
    const otherMonthlyVariableCosts = Object.keys(variableCosts)
      .filter((cat) => !["ingredients", "cardFees", "vatWithheld"].includes(cat))
      .reduce((total, category) => total + getVariableCategoryTotal(category), 0)
    const totalCardFees = getVariableCategoryTotal("cardFees")
    const vatPayable =
      vatSettings.enabled && vatSettings.autoCalculate ? calculateAutoVAT() : getVariableCategoryTotal("vatWithheld")

    const totalVariableExpensesForAnalysis =
      totalMenuCostsFromSales + otherMonthlyVariableCosts + totalCardFees + vatPayable

    const totalMarketingCostsForMonth = getCurrentMonthMarketingCosts()
    const operatingProfit =
      totalRevenue - totalFixedCostsForMonth - totalVariableExpensesForAnalysis - totalMarketingCostsForMonth

    const operatingProfitRate = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0
    const fixedCostRate = totalRevenue > 0 ? (totalFixedCostsForMonth / totalRevenue) * 100 : 0
    const variableCostRate = totalRevenue > 0 ? (totalVariableExpensesForAnalysis / totalRevenue) * 100 : 0
    const marketingCostRate = totalRevenue > 0 ? (totalMarketingCostsForMonth / totalRevenue) * 100 : 0
    const bepAchievedDays = monthSales.filter((sale) => sale.bepAchieved).length
    const retirementSavingsExpense = (fixedCosts.retirementFund || []).reduce((sum, item) => sum + item.amount, 0)
    const taxesExpense = (fixedCosts.tax || []).reduce((sum, item) => sum + item.amount, 0)

    return {
      totalRevenue,
      operatingProfit,
      operatingProfitRate,
      fixedCostRate,
      variableCostRate,
      marketingCostRate,
      totalFixedCosts: totalFixedCostsForMonth,
      totalVariableCosts: totalVariableExpensesForAnalysis,
      totalMenuCosts: totalMenuCostsFromSales,
      bepAchievedDays,
      totalOperatingDays: monthSales.length,
      averageDailyRevenue: monthSales.length > 0 ? totalRevenue / monthSales.length : 0,
      vatPayable,
      retirementSavingsExpense,
      taxesExpense,
    }
  }, [
    dailySales,
    currentMonth,
    fixedCosts,
    variableCosts,
    specificCardFees,
    marketingCosts,
    vatSettings,
    menuItems,
    calculateAutoVAT,
    getTotalFixedCosts,
    getVariableCategoryTotal,
    getCurrentMonthMarketingCosts,
  ])

  const getDailySaleForDate = (date: Date) => {
    const dateString = format(date, "yyyy-MM-dd")
    return dailySales.find((sale) => sale.date === dateString)
  }

  const changeMonth = (direction: "prev" | "next") => {
    setCurrentMonth(direction === "prev" ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1))
  }

  const getMenuAnalysis = (): MenuAnalysis[] => {
    const currentMonthStr = format(currentMonth, "yyyy-MM")
    const monthSales = dailySales.filter((sale) => sale.date.startsWith(currentMonthStr))
    return menuItems.map((menu) => {
      let totalSold = 0
      let totalRevenueFromMenu = 0
      let totalProfitFromMenu = 0
      monthSales.forEach((sale) => {
        const menuSale = sale.menuSales.find((ms) => ms.menuId === menu.id)
        if (menuSale) {
          const discountedPrice = getDiscountedPrice(menu, new Date(sale.date))
          totalSold += menuSale.quantity
          totalRevenueFromMenu += menuSale.quantity * discountedPrice
          totalProfitFromMenu += menuSale.quantity * (discountedPrice - menu.cost)
        }
      })
      const averageDaily = monthSales.length > 0 ? totalSold / monthSales.length : 0
      const profitMargin = totalRevenueFromMenu > 0 ? (totalProfitFromMenu / totalRevenueFromMenu) * 100 : 0
      return {
        menuId: menu.id,
        totalSold,
        totalRevenue: totalRevenueFromMenu,
        totalProfit: totalProfitFromMenu,
        averageDaily,
        profitMargin,
      }
    })
  }

  const generateAlerts = useCallback(() => {
    const newAlertsList: Alert[] = []
    const bep = calculateBEP()
    const monthlyAnalysisData = getMonthlyAnalysis()
    if (monthlyAnalysisData.totalRevenue < bep.monthlyBEP && bep.monthlyBEP !== Number.POSITIVE_INFINITY) {
      newAlertsList.push({
        id: Date.now().toString() + "bep",
        type: "warning",
        message: `이번 달 매출이 손익분기점보다 ${(bep.monthlyBEP / 1000).toLocaleString()}천원 부족합니다.`,
        date: format(new Date(), "yyyy-MM-dd"),
      })
    }
    if (monthlyAnalysisData.operatingProfitRate < 10 && monthlyAnalysisData.totalRevenue > 0) {
      newAlertsList.push({
        id: Date.now().toString() + "margin",
        type: "warning",
        message: `영업이익률이 ${monthlyAnalysisData.operatingProfitRate.toFixed(1)}%로 낮습니다. 비용 절감이나 가격 조정을 검토해보세요.`,
        date: format(new Date(), "yyyy-MM-dd"),
      })
    }
    if (targetGoals.targetProfit > 0 && monthlyAnalysisData.operatingProfit >= targetGoals.targetProfit) {
      newAlertsList.push({
        id: Date.now().toString() + "target",
        type: "success",
        message: `축하합니다! 목표 이익 ${(targetGoals.targetProfit / 1000).toLocaleString()}천원을 달성했습니다!`,
        date: format(new Date(), "yyyy-MM-dd"),
      })
    }
    setAlerts(newAlertsList)
  }, [calculateBEP, getMonthlyAnalysis, targetGoals.targetProfit])

  useEffect(() => {
    if (menuItems.length > 0 && dailySales.length > 0) {
      generateAlerts()
    }
  }, [menuItems, dailySales, targetGoals, operatingDays, currentMonth, generateAlerts])

  const getCostOptimizationSuggestions = () => {
    const suggestions = []
    const monthlyAnalysisData = getMonthlyAnalysis()
    const menuAnalysisData = getMenuAnalysis()
    if (monthlyAnalysisData.fixedCostRate > 35) {
      suggestions.push({
        category: "고정비 절감",
        priority: "높음",
        suggestion: "고정비 비율이 높습니다. 임대료 재협상, 불필요한 구독 서비스 해지, 에너지 효율 개선을 검토하세요.",
        expectedSaving: getTotalFixedCosts() * 0.1,
      })
    }
    if (monthlyAnalysisData.variableCostRate > 40) {
      suggestions.push({
        category: "변동비 절감",
        priority: "중간",
        suggestion: "변동비 비율이 높습니다. 식재료 공급업체 변경, 포장재 절약, 전력 사용량 최적화를 고려하세요.",
        expectedSaving: monthlyAnalysisData.totalVariableCosts * 0.15,
      })
    }
    const lowProfitMenus = menuAnalysisData.filter((menu) => menu.profitMargin < 50 && menu.totalSold > 0)
    if (lowProfitMenus.length > 0) {
      suggestions.push({
        category: "메뉴 최적화",
        priority: "높음",
        suggestion: `수익성이 낮은 메뉴 ${lowProfitMenus.length}개가 있습니다. 가격 조정이나 원가 절감을 검토해보세요.`,
        expectedSaving: lowProfitMenus.reduce((sum, menu) => sum + menu.totalRevenue * 0.1, 0),
      })
    }
    return suggestions
  }

  const addCustomCategory = () => {
    if (!newCategoryName.trim()) return
    const categoryKey = newCategoryName.trim().replace(/\s+/g, "_").toLowerCase()
    if (newCategoryType === "variable") {
      if (
        customVariableCategories.includes(categoryKey) ||
        DEFAULT_VARIABLE_CATEGORIES.find((c) => c.key === categoryKey)
      ) {
        alert("이미 존재하는 변동비 카테고리입니다.")
        return
      }
      setCustomVariableCategories([...customVariableCategories, categoryKey])
      setVariableCosts((prev) => ({ ...prev, [categoryKey]: [] }))
    } else {
      if (customFixedCategories.includes(categoryKey) || DEFAULT_FIXED_CATEGORIES.find((c) => c.key === categoryKey)) {
        alert("이미 존재하는 고정비 카테고리입니다.")
        return
      }
      setCustomFixedCategories([...customFixedCategories, categoryKey])
      setFixedCosts((prev) => ({ ...prev, [categoryKey]: [] }))
    }
    setNewCategoryName("")
  }

  const removeFixedCategory = (categoryKey: string) => {
    const newCosts = { ...fixedCosts }
    delete newCosts[categoryKey]
    setFixedCosts(newCosts)
    setCustomFixedCategories(customFixedCategories.filter((c) => c !== categoryKey))
  }
  const removeVariableCategory = (categoryKey: string) => {
    const newCosts = { ...variableCosts }
    delete newCosts[categoryKey]
    setVariableCosts(newCosts)
    setCustomVariableCategories(customVariableCategories.filter((c) => c !== categoryKey))
  }

  const calculatedBepData = calculateBEP()
  const calculatedMonthlyAnalysisData = getMonthlyAnalysis()
  const currentDaySalesData = calculateDailySalesData()
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })

  const downloadMenuSample = () => {
    const sampleData = `메뉴명,판매가격(천원),원가(천원),원가입력방식,원가율(%),할인적용(Y/N),할인요일(월;화),할인타입(rate/amount),할인값(숫자)\n한우 양념갈비 150g,29,14.5,amount,50,Y,"월;화",rate,10\n한우 불고기솥밥,23,11.5,amount,50,N,,,0\n희열한상,79,39.5,amount,50,Y,일,amount,5`
    const blob = new Blob(["\uFEFF" + sampleData], { type: "text/csv;charset=utf-8" })
    saveAs(blob, "메뉴_업로드_샘플.csv")
  }

  const exportToExcel = () => {
    let csvContent = `${restaurantName} - 메뉴 관리 (${format(new Date(), "yyyy-MM-dd")})\n`
    csvContent +=
      "안내: 모든 금액 단위는 '천원'입니다. 할인율은 % 단위입니다. 할인 요일은 월;화;수;목;금;토;일 형식으로 세미콜론(;)으로 구분하여 입력하세요.\n"
    csvContent +=
      "컬럼 설명: \n  - 메뉴명 (필수): 메뉴의 이름\n  - 판매가격(천원, 필수): 메뉴의 판매 가격 (천원 단위, 예: 29)\n  - 원가(천원): 원가입력방식이 'amount'일 경우 원가 (천원 단위, 예: 14.5)\n  - 원가입력방식: 'amount'(금액) 또는 'rate'(원가율%)\n  - 원가율(%): 원가입력방식이 'rate'일 경우 원가율 (예: 50)\n  - 마진율(%, 자동계산): (판매가격-원가)/판매가격 * 100\n  - 할인적용(Y/N): 요일 할인 적용 여부 (Y 또는 N)\n  - 할인요일: 할인이 적용되는 요일 (예: 월;화;금). " +
      DISCOUNT_APPLICABLE_DAYS.join(";") +
      " 중 선택.\n  - 할인타입: 'rate'(할인율) 또는 'amount'(할인액)\n  - 할인값: 할인율(%) 또는 할인액(천원)\n\n"
    csvContent +=
      "메뉴명,판매가격(천원),원가(천원),원가입력방식,원가율(%),마진율(%),할인적용(Y/N),할인요일,할인타입,할인값\n"
    menuItems.forEach((item) => {
      const costDisplay = item.costInputType === "amount" ? item.cost / 1000 : ""
      const costRateDisplay = item.costInputType === "rate" ? item.costRate.toFixed(1) : ""
      csvContent += `"${item.name}",${item.price / 1000},${costDisplay},${item.costInputType},${costRateDisplay},${item.margin.toFixed(1)},${item.discountEnabled ? "Y" : "N"},"${item.discountDays.join(";")}",${item.discountType},${item.discountType === "rate" ? item.discountRate : item.discountAmount / 1000}\n`
    })
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    saveAs(blob, `${restaurantName}_메뉴_${format(new Date(), "yyyyMMdd")}.csv`)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split(/\r?\n/)
      const newMenus: MenuItem[] = []
      let dataStartIndex = 0
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].split(",").length >= 9) {
          dataStartIndex = i
          break
        }
      }
      for (let i = dataStartIndex; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
        if (values.length < 10) {
          console.warn("Skipping line due to insufficient columns:", line, values)
          continue
        }
        const [
          name,
          priceStr,
          costAmountStr,
          costInputTypeStr,
          costRateStr,
          _marginStr,
          discountEnabledStr,
          discountDaysStr,
          discountTypeStr,
          discountValueStr,
        ] = values
        if (name && priceStr) {
          const price = parseInputAsNumber(priceStr) * 1000
          const costInputType = (costInputTypeStr === "rate" ? "rate" : "amount") as "amount" | "rate"
          let cost: number
          let actualCostRate: number
          if (costInputType === "rate") {
            actualCostRate = parseInputAsNumber(costRateStr)
            cost = price * (actualCostRate / 100)
          } else {
            cost = parseInputAsNumber(costAmountStr) * 1000
            actualCostRate = price > 0 ? (cost / price) * 100 : 0
          }
          const discountEnabled = discountEnabledStr?.toUpperCase() === "Y"
          const parsedDiscountDays = discountDaysStr
            ? discountDaysStr
                .split(";")
                .map((d) => d.trim())
                .filter((day) => DISCOUNT_APPLICABLE_DAYS.includes(day))
            : []
          const discountType = (discountTypeStr === "amount" ? "amount" : "rate") as "rate" | "amount"
          let discountRate = 0
          let discountAmount = 0
          if (discountType === "rate") {
            discountRate = parseInputAsNumber(discountValueStr)
          } else {
            discountAmount = parseInputAsNumber(discountValueStr) * 1000
          }
          const margin = price > 0 ? ((price - cost) / price) * 100 : 0
          newMenus.push({
            id: Date.now().toString() + i,
            name,
            price,
            cost,
            costInputType,
            costRate: Number.parseFloat(actualCostRate.toFixed(2)),
            margin: Number.parseFloat(margin.toFixed(2)),
            discountEnabled,
            discountDays: parsedDiscountDays,
            discountType,
            discountRate,
            discountAmount,
          })
        }
      }
      if (newMenus.length > 0) {
        setMenuItems((prev) => [...prev, ...newMenus])
        alert(`${newMenus.length}개의 메뉴가 추가되었습니다.`)
      } else {
        alert("추가할 메뉴가 없거나 파일 형식이 올바르지 않습니다. CSV 파일의 내용을 확인해주세요.")
      }
    }
    reader.readAsText(file, "UTF-8")
    event.target.value = ""
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedItemIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", index.toString())
  }
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    if (draggedItemIndex === null) return
    setDragOverItemIndex(index)
  }
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (draggedItemIndex === null || dragOverItemIndex === null) return
    const newMenuItems = [...menuItems]
    const [draggedItem] = newMenuItems.splice(draggedItemIndex, 1)
    newMenuItems.splice(dragOverItemIndex, 0, draggedItem)
    setMenuItems(newMenuItems)
    setDraggedItemIndex(null)
    setDragOverItemIndex(null)
  }
  const handleDragEnd = () => {
    setDraggedItemIndex(null)
    setDragOverItemIndex(null)
  }

  const applyBulkMargin = () => {
    const marginRate = parseInputAsNumber(bulkMarginRate)
    if (marginRate <= 0 || marginRate > 100) {
      alert("마진율은 0~100 사이의 값으로 입력해주세요.")
      return
    }
    const updatedMenuItems = menuItems.map((item) => {
      const newCost = item.price * (1 - marginRate / 100)
      return {
        ...item,
        cost: Number.parseFloat(newCost.toFixed(2)),
        costInputType: "amount" as "amount" | "rate",
        costRate: item.price > 0 ? Number.parseFloat(((newCost / item.price) * 100).toFixed(2)) : 0,
        margin: marginRate,
      }
    })
    setMenuItems(updatedMenuItems)
    setBulkMarginRate("")
  }

  const exportAllData = () => {
    const data = {
      restaurantName,
      menuItems,
      dailySales,
      operatingDays,
      fixedCosts,
      variableCosts,
      specificCardFees,
      marketingCosts,
      depreciationItems,
      targetGoals,
      customVariableCategories,
      customFixedCategories,
      vatSettings,
    }
    const json = JSON.stringify(data)
    const blob = new Blob([json], { type: "application/json" })
    saveAs(blob, `${restaurantName}_전체데이터_${format(new Date(), "yyyyMMdd")}.json`)
  }
  const importAllData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)
        setRestaurantName(json.restaurantName || restaurantName)
        setMenuItems(json.menuItems || [])
        setDailySales(json.dailySales || [])
        setOperatingDays(json.operatingDays || operatingDays)
        setFixedCosts(json.fixedCosts || initialFixedCosts())
        setVariableCosts(json.variableCosts || initialVariableCosts())
        setSpecificCardFees(json.specificCardFees || initialSpecificCardFees())
        setMarketingCosts(json.marketingCosts || [])
        setDepreciationItems(json.depreciationItems || [])
        setTargetGoals(json.targetGoals || { targetProfit: 0, targetRevenue: 0 })
        setCustomVariableCategories(json.customVariableCategories || [])
        setCustomFixedCategories(json.customFixedCategories || [])
        setVatSettings(json.vatSettings || { enabled: true, rate: 10, autoCalculate: true })
        alert("데이터를 성공적으로 가져왔습니다!")
      } catch (error) {
        console.error("데이터 가져오기 오류:", error)
        alert("데이터 가져오기 실패: 파일 형식을 확인해주세요.")
      }
    }
    reader.readAsText(file)
    event.target.value = ""
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-6 max-w-7xl">
      <Button onClick={() => saveBEPData("서초 희열", { hello: "world", time: new Date().toISOString() })}>
        Supabase 저장 테스트
      </Button>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
          {isEditingRestaurantName ? (
            <Input
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              onBlur={handleSaveRestaurantName}
              onKeyDown={(e) => e.key === "Enter" && handleSaveRestaurantName()}
              className="text-xl sm:text-2xl md:text-3xl font-bold"
              autoFocus
            />
          ) : (
            <h1
              className="text-xl sm:text-2xl md:text-3xl font-bold cursor-pointer hover:text-blue-600"
              onClick={() => setIsEditingRestaurantName(true)}
            >
              {restaurantName}
            </h1>
          )}
          <Button variant="ghost" size="sm" onClick={() => setIsEditingRestaurantName(!isEditingRestaurantName)}>
            <Edit3 className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
          <Button onClick={exportToExcel} className="flex items-center gap-2 text-[10px] xs:text-xs sm:text-sm">
            <Download className="h-4 w-4" />
            메뉴 CSV
          </Button>
          <Button
            onClick={exportAllData}
            variant="outline"
            className="flex items-center gap-2 text-[10px] xs:text-xs sm:text-sm"
          >
            <Download className="h-4 w-4" />
            전체 데이터(JSON)
          </Button>
          <div>
            <Label htmlFor="import-data-file" className="cursor-pointer">
              <Button asChild variant="outline" className="flex items-center gap-2 text-[10px] xs:text-xs sm:text-sm">
                <span>
                  <Upload className="h-4 w-4" />
                  전체 데이터 가져오기
                </span>
              </Button>
            </Label>
            <Input id="import-data-file" type="file" accept=".json" onChange={importAllData} className="hidden" />
          </div>
          <Button onClick={handleSaveAll} className="flex items-center gap-2 text-[10px] xs:text-xs sm:text-sm">
            <Save className="h-4 w-4" />
            저장
          </Button>
        </div>
      </div>

      <Tabs defaultValue="menu" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 text-[10px] xs:text-xs sm:text-sm">
          <TabsTrigger value="menu">메뉴 관리</TabsTrigger>
          <TabsTrigger value="depreciation">감가상각비</TabsTrigger>
          <TabsTrigger value="costs">비용 관리</TabsTrigger>
          <TabsTrigger value="bep">BEP 계산</TabsTrigger>
          <TabsTrigger value="daily">일일 매출</TabsTrigger>
          <TabsTrigger value="analysis">분석</TabsTrigger>
        </TabsList>

        <TabsContent value="menu">
          <Card>
            <CardHeader>
              <CardTitle>메뉴 관리</CardTitle>
              <CardDescription>
                메뉴별 가격, 원가, 할인 설정을 관리합니다. CSV 파일로 일괄 등록 가능합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 border rounded-lg bg-blue-50">
                <h4 className="font-medium mb-3 text-sm">CSV 파일로 메뉴 일괄 등록</h4>
                <div className="flex flex-col xs:flex-row gap-4 items-start sm:items-center">
                  <Button onClick={downloadMenuSample} variant="outline" size="sm">
                    샘플 CSV 다운로드
                  </Button>
                  <Input type="file" accept=".csv" onChange={handleFileUpload} className="text-xs file:text-xs" />
                </div>
                <p className="text-xs text-gray-600 mt-2">샘플 CSV의 헤더와 설명을 참고하여 작성 후 업로드하세요.</p>
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 items-end text-sm">
                <div>
                  <Label htmlFor="menu-name">메뉴명</Label>
                  <Input
                    id="menu-name"
                    value={newMenuItem.name}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                    placeholder="메뉴 이름 입력"
                  />
                </div>
                <div>
                  <Label htmlFor="menu-price">판매가(천원)</Label>
                  <Input
                    id="menu-price"
                    type="number"
                    value={newMenuItem.price === 0 ? "" : newMenuItem.price}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, price: Number(e.target.value) })}
                    placeholder="예: 29"
                    step="0.1"
                  />
                </div>
                <div>
                  <Label htmlFor="menu-cost-type">원가입력</Label>
                  <select
                    id="menu-cost-type"
                    value={newMenuItem.costInputType}
                    onChange={(e) =>
                      setNewMenuItem((prev) => ({
                        ...prev,
                        costInputType: e.target.value as "amount" | "rate",
                        cost: 0,
                        costRate: 0,
                      }))
                    }
                    className="w-full p-2 border rounded-md mt-1 text-sm h-10"
                  >
                    <option value="amount">금액(천원)</option>
                    <option value="rate">원가율(%)</option>
                  </select>
                </div>
                {newMenuItem.costInputType === "amount" ? (
                  <div>
                    <Label htmlFor="menu-cost-amount">원가(천원)</Label>
                    <Input
                      id="menu-cost-amount"
                      type="number"
                      value={newMenuItem.cost === 0 ? "" : newMenuItem.cost}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, cost: Number(e.target.value) })}
                      placeholder="예: 14.5"
                      step="0.1"
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="menu-cost-rate">원가율(%)</Label>
                    <Input
                      id="menu-cost-rate"
                      type="number"
                      value={newMenuItem.costRate === 0 ? "" : newMenuItem.costRate}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, costRate: Number(e.target.value) })}
                      placeholder="예: 50"
                    />
                  </div>
                )}
                <div className="flex items-center space-x-2 pt-5">
                  <input
                    type="checkbox"
                    id="discountEnabled"
                    checked={newMenuItem.discountEnabled}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, discountEnabled: e.target.checked })}
                  />
                  <Label htmlFor="discountEnabled" className="text-sm font-normal">
                    요일할인
                  </Label>
                </div>
                <div>
                  <Label>할인타입</Label>
                  <select
                    value={newMenuItem.discountType}
                    onChange={(e) =>
                      setNewMenuItem({ ...newMenuItem, discountType: e.target.value as "rate" | "amount" })
                    }
                    disabled={!newMenuItem.discountEnabled}
                    className="w-full p-2 border rounded-md mt-1 text-sm h-10"
                  >
                    <option value="amount">할인액(천원)</option>
                    <option value="rate">할인율(%)</option>
                  </select>
                </div>
                <div>
                  <Label>{newMenuItem.discountType === "rate" ? "할인율(%)" : "할인액(천원)"}</Label>
                  <Input
                    type="number"
                    value={newMenuItem.discountType === "rate" ? newMenuItem.discountRate : newMenuItem.discountAmount}
                    onChange={(e) =>
                      newMenuItem.discountType === "rate"
                        ? setNewMenuItem({ ...newMenuItem, discountRate: Number(e.target.value) })
                        : setNewMenuItem({ ...newMenuItem, discountAmount: Number(e.target.value) })
                    }
                    placeholder={newMenuItem.discountType === "rate" ? "예: 10" : "예: 5"}
                    disabled={!newMenuItem.discountEnabled}
                    step={newMenuItem.discountType === "amount" ? "0.1" : "1"}
                  />
                </div>
                <Button onClick={addMenuItem} className="w-full sm:w-auto mt-4 sm:mt-0">
                  <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                  추가
                </Button>
              </div>
              {newMenuItem.discountEnabled && (
                <div className="p-3 border rounded-lg bg-gray-50 text-sm">
                  <Label>할인 적용 요일 (중복 선택 가능)</Label>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {DISCOUNT_APPLICABLE_DAYS.map((day) => (
                      <label key={day} className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newMenuItem.discountDays.includes(day)}
                          onChange={(e) => {
                            if (e.target.checked)
                              setNewMenuItem((prev) => ({ ...prev, discountDays: [...prev.discountDays, day] }))
                            else
                              setNewMenuItem((prev) => ({
                                ...prev,
                                discountDays: prev.discountDays.filter((d) => d !== day),
                              }))
                          }}
                        />
                        <span className="text-sm font-normal">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="p-4 border rounded-lg bg-yellow-50 text-sm">
                <h4 className="font-medium mb-3">마진율 일괄 적용 (모든 메뉴 대상)</h4>
                <div className="flex flex-col xs:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="bulk-margin-rate">적용할 마진율 (%)</Label>
                    <Input
                      id="bulk-margin-rate"
                      type="number"
                      value={bulkMarginRate}
                      onChange={(e) => setBulkMarginRate(e.target.value)}
                      placeholder="예: 60 (0~100 사이 값)"
                      min="0"
                      max="100"
                    />
                  </div>
                  <Button onClick={applyBulkMargin} className="w-full xs:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    일괄 적용
                  </Button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  입력된 마진율을 기준으로 모든 메뉴의 원가가 재계산됩니다. (원가 입력 방식은 '금액'으로 변경됨)
                </p>
              </div>
              <div className="space-y-4">
                {menuItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex flex-col p-3 border rounded-lg gap-3 text-sm cursor-grab ${draggedItemIndex === index ? "opacity-50" : ""} ${dragOverItemIndex === index ? "border-blue-500 border-2" : ""}`}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                  >
                    {editingMenuId === item.id && editMenuItem ? (
                      <div className="w-full space-y-3">
                        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <Label>메뉴명</Label>
                            <Input
                              value={editMenuItem.name}
                              onChange={(e) =>
                                setEditMenuItem((prev) => (prev ? { ...prev, name: e.target.value } : null))
                              }
                            />
                          </div>
                          <div>
                            <Label>판매가(천원)</Label>
                            <Input
                              type="number"
                              value={editMenuItem.price / 1000}
                              onChange={(e) =>
                                setEditMenuItem((prev) =>
                                  prev ? { ...prev, price: parseInputAsNumber(e.target.value) * 1000 } : null,
                                )
                              }
                              step="0.1"
                            />
                          </div>
                          <div>
                            <Label>원가입력</Label>
                            <select
                              value={editMenuItem.costInputType}
                              onChange={(e) =>
                                setEditMenuItem((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        costInputType: e.target.value as "amount" | "rate",
                                        cost: prev.cost,
                                        costRate: prev.costRate,
                                      }
                                    : null,
                                )
                              }
                              className="w-full p-2 border rounded-md mt-1 text-sm h-10"
                            >
                              <option value="amount">금액(천원)</option>
                              <option value="rate">원가율(%)</option>
                            </select>
                          </div>
                          {editMenuItem.costInputType === "amount" ? (
                            <div>
                              <Label>원가(천원)</Label>
                              <Input
                                type="number"
                                value={editMenuItem.cost / 1000}
                                onChange={(e) =>
                                  setEditMenuItem((prev) =>
                                    prev ? { ...prev, cost: parseInputAsNumber(e.target.value) * 1000 } : null,
                                  )
                                }
                                step="0.1"
                              />
                            </div>
                          ) : (
                            <div>
                              <Label>원가율(%)</Label>
                              <Input
                                type="number"
                                value={editMenuItem.costRate}
                                onChange={(e) =>
                                  setEditMenuItem((prev) =>
                                    prev ? { ...prev, costRate: parseInputAsNumber(e.target.value) } : null,
                                  )
                                }
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                          <input
                            type="checkbox"
                            id={`editDiscountEnabled-${item.id}`}
                            checked={editMenuItem.discountEnabled}
                            onChange={(e) =>
                              setEditMenuItem((prev) => (prev ? { ...prev, discountEnabled: e.target.checked } : null))
                            }
                          />
                          <Label htmlFor={`editDiscountEnabled-${item.id}`} className="text-sm font-normal">
                            요일할인
                          </Label>
                        </div>
                        {editMenuItem.discountEnabled && (
                          <div className="p-3 border rounded-lg bg-gray-50 text-sm space-y-2">
                            <div>
                              <Label>할인타입</Label>
                              <select
                                value={editMenuItem.discountType}
                                onChange={(e) =>
                                  setEditMenuItem((prev) =>
                                    prev ? { ...prev, discountType: e.target.value as "rate" | "amount" } : null,
                                  )
                                }
                                className="w-full p-2 border rounded-md mt-1 text-sm h-10"
                              >
                                <option value="amount">할인액(천원)</option>
                                <option value="rate">할인율(%)</option>
                              </select>
                            </div>
                            <div>
                              <Label>{editMenuItem.discountType === "rate" ? "할인율(%)" : "할인액(천원)"}</Label>
                              <Input
                                type="number"
                                value={
                                  editMenuItem.discountType === "rate"
                                    ? editMenuItem.discountRate
                                    : editMenuItem.discountAmount / 1000
                                }
                                onChange={(e) => {
                                  const val = parseInputAsNumber(e.target.value)
                                  setEditMenuItem((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          ...(editMenuItem.discountType === "rate"
                                            ? { discountRate: val }
                                            : { discountAmount: val * 1000 }),
                                        }
                                      : null,
                                  )
                                }}
                                step={editMenuItem.discountType === "amount" ? "0.1" : "1"}
                              />
                            </div>
                            <div>
                              <Label>할인 적용 요일</Label>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                                {DISCOUNT_APPLICABLE_DAYS.map((day) => (
                                  <label
                                    key={`edit-${item.id}-${day}`}
                                    className="flex items-center space-x-1 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={editMenuItem.discountDays.includes(day)}
                                      onChange={(e) => {
                                        const currentDays = editMenuItem.discountDays || []
                                        if (e.target.checked) {
                                          setEditMenuItem((prev) =>
                                            prev ? { ...prev, discountDays: [...currentDays, day] } : null,
                                          )
                                        } else {
                                          setEditMenuItem((prev) =>
                                            prev
                                              ? { ...prev, discountDays: currentDays.filter((d) => d !== day) }
                                              : null,
                                          )
                                        }
                                      }}
                                    />
                                    <span className="text-sm font-normal">{day}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button onClick={saveEditMenu} size="sm">
                            저장
                          </Button>
                          <Button onClick={cancelEditMenu} variant="outline" size="sm">
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2">
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-600">
                            판매가: {formatNumberForDisplay(item.price, "천원")} / 원가:{" "}
                            {formatNumberForDisplay(item.cost, "천원")} / 마진율:{" "}
                            <Badge
                              variant={item.margin > 60 ? "default" : item.margin > 40 ? "secondary" : "destructive"}
                            >
                              {item.margin.toFixed(1)}%
                            </Badge>
                          </div>
                          {item.discountEnabled && (
                            <div className="text-xs text-blue-600 mt-1">
                              할인: {item.discountDays.join(", ")} (
                              {item.discountType === "rate"
                                ? `${item.discountRate}%`
                                : `${formatNumberForDisplay(item.discountAmount, "천원")}`}
                              )
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 self-start xs:self-center mt-2 xs:mt-0">
                          <Button variant="outline" size="sm" onClick={() => startEditMenu(item)}>
                            수정
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => removeMenuItem(item.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="depreciation">
          <Card>
            <CardHeader>
              <CardTitle>감가상각비 관리</CardTitle>
              <CardDescription>고정자산의 감가상각비를 계산하고 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <h4 className="font-medium">새 감가상각 항목 추가</h4>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="dep-date">구입일</Label>
                    <Input
                      id="dep-date"
                      type="date"
                      value={newDepreciationItem.date}
                      onChange={(e) => setNewDepreciationItem({ ...newDepreciationItem, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dep-category">자산 분류</Label>
                    <Input
                      id="dep-category"
                      value={newDepreciationItem.category}
                      onChange={(e) => setNewDepreciationItem({ ...newDepreciationItem, category: e.target.value })}
                      placeholder="예: 주방설비, 인테리어"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dep-amount">취득가액(천원)</Label>
                    <Input
                      id="dep-amount"
                      type="text"
                      value={
                        newDepreciationItem.investmentAmount
                          ? (parseInputAsNumber(newDepreciationItem.investmentAmount) / 1000).toLocaleString("ko-KR")
                          : ""
                      }
                      onChange={(e) =>
                        setNewDepreciationItem({
                          ...newDepreciationItem,
                          investmentAmount: parseInputAsNumber(e.target.value).toString(),
                        })
                      }
                      placeholder="예: 5000"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dep-life">내용연수(개월)</Label>
                    <Input
                      id="dep-life"
                      type="number"
                      value={newDepreciationItem.usefulLifeMonths}
                      onChange={(e) =>
                        setNewDepreciationItem({ ...newDepreciationItem, usefulLifeMonths: e.target.value })
                      }
                      placeholder="예: 60"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="dep-note">비고</Label>
                  <Input
                    id="dep-note"
                    value={newDepreciationItem.note}
                    onChange={(e) => setNewDepreciationItem({ ...newDepreciationItem, note: e.target.value })}
                    placeholder="추가 정보 입력"
                  />
                </div>
                <Button onClick={addDepreciationItem} className="w-full xs:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  감가상각 항목 추가
                </Button>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium">감가상각 항목 목록</h4>
                {depreciationItems.length === 0 && <p className="text-gray-500">등록된 감가상각 항목이 없습니다.</p>}
                {depreciationItems.map((item) => (
                  <div key={item.id} className="p-3 border rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{item.category}</p>
                      <p>
                        취득가: {formatNumberForDisplay(item.investmentAmount, "원")} / 내용연수:{" "}
                        {item.usefulLifeMonths}개월
                      </p>
                      <p>월 상각액: {formatNumberForDisplay(item.monthlyDepreciation, "원")}</p>
                      <p className="text-xs text-gray-500">
                        구입일: {item.date} ~ 상각종료일: {item.targetEndDate}
                      </p>
                      {item.note && <p className="text-xs text-gray-500">비고: {item.note}</p>}
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => removeDepreciationItem(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-blue-50 rounded-lg mt-4">
                <div className="text-sm text-blue-600">현재 월 감가상각비 총액 (자동계산)</div>
                <div className="text-lg font-bold text-blue-700">
                  {formatNumberForDisplay(getCurrentDepreciationTotal(), "원")}
                </div>
                <p className="text-xs text-gray-500">이 금액은 고정비의 '감가상각비' 항목으로 자동 반영됩니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>고정비 관리</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="p-3 border rounded-lg bg-gray-50 space-y-2">
                  <h4 className="font-medium text-sm">새 항목 추가 (고정비)</h4>
                  <select
                    value={newFixedCostItem.category}
                    onChange={(e) =>
                      setNewFixedCostItem((prev) => ({
                        ...prev,
                        category: e.target.value,
                        amount: "",
                        autoRetirementFundDisplay: "",
                        autoInsuranceDisplay: "",
                      }))
                    }
                    className="w-full p-2 border rounded-md h-10 text-sm"
                  >
                    <option value="">카테고리 선택</option>
                    {DEFAULT_FIXED_CATEGORIES.filter((cat) => cat.key !== "depreciation").map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.label}
                      </option>
                    ))}
                    {customFixedCategories.map((cat) => (
                      <option key={cat} value={cat}>{`${cat} (커스텀)`}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="세부 항목명 (예: 1월 임대료)"
                    value={newFixedCostItem.name}
                    onChange={(e) => setNewFixedCostItem((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    type="text"
                    placeholder="금액(천원) (예: 1500)"
                    value={
                      newFixedCostItem.amount
                        ? (parseInputAsNumber(newFixedCostItem.amount) / 1000).toLocaleString("ko-KR")
                        : ""
                    }
                    onChange={(e) => handleNewFixedCostAmountChange(parseInputAsNumber(e.target.value).toString())}
                    step="0.1"
                  />
                  {newFixedCostItem.category === "laborCost" && (
                    <div className="text-xs text-blue-600 space-y-1 mt-1">
                      {newFixedCostItem.autoRetirementFundDisplay && (
                        <div>{newFixedCostItem.autoRetirementFundDisplay}</div>
                      )}
                      {newFixedCostItem.autoInsuranceDisplay && <div>{newFixedCostItem.autoInsuranceDisplay}</div>}
                      <p>
                        위 금액은 예상치이며, 실제 납부/적립액은 '퇴직적립금', '4대보험 등' 카테고리에 별도로
                        입력해주세요.
                      </p>
                    </div>
                  )}
                  <Input
                    placeholder="담당자/대상자 (선택)"
                    value={newFixedCostItem.person}
                    onChange={(e) => setNewFixedCostItem((prev) => ({ ...prev, person: e.target.value }))}
                  />
                  <Input
                    placeholder="메모 (선택)"
                    value={newFixedCostItem.memo}
                    onChange={(e) => setNewFixedCostItem((prev) => ({ ...prev, memo: e.target.value }))}
                  />
                  <Button onClick={addFixedCostItem} size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    추가
                  </Button>
                </div>

                <div className="space-y-3">
                  {DEFAULT_FIXED_CATEGORIES.map((cat) => cat.key)
                    .concat(customFixedCategories)
                    .map((categoryKey) => {
                      const items = fixedCosts[categoryKey] || []
                      if (categoryKey === "depreciation" && items.length === 0 && getCurrentDepreciationTotal() === 0)
                        return null

                      const categoryConfig = DEFAULT_FIXED_CATEGORIES.find((c) => c.key === categoryKey)
                      const categoryLabel =
                        categoryConfig?.label || customFixedCategories.find((c) => c === categoryKey) || categoryKey
                      const isCustomRemovable = customFixedCategories.includes(categoryKey)
                      const isDefaultRemovable = categoryConfig?.removable

                      return (
                        (items.length > 0 ||
                          (categoryKey === "depreciation" && getCurrentDepreciationTotal() > 0) ||
                          categoryKey !== "depreciation") && (
                          <div key={categoryKey} className="pt-2">
                            <div className="flex justify-between items-center mb-1">
                              <h5 className="font-semibold text-gray-700">{categoryLabel}</h5>
                              {(isCustomRemovable ||
                                (categoryConfig && isDefaultRemovable && categoryConfig.key !== "depreciation")) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFixedCategory(categoryKey)}
                                  className="text-red-500 p-1 h-auto"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            {items.map((item) =>
                              editingCostId === item.id &&
                              editingCostCategory === categoryKey &&
                              editingCostType === "fixed" &&
                              editCostItem ? (
                                <div
                                  key={`${item.id}-edit`}
                                  className="p-3 border rounded-lg bg-yellow-50 space-y-2 my-1"
                                >
                                  <Input
                                    placeholder="세부 항목명"
                                    value={editCostItem.name}
                                    onChange={(e) =>
                                      setEditCostItem((prev) => (prev ? { ...prev, name: e.target.value } : null))
                                    }
                                  />
                                  <Input
                                    type="text"
                                    placeholder="금액(천원)"
                                    value={(editCostItem.amount / 1000 || 0).toLocaleString("ko-KR")}
                                    onChange={(e) =>
                                      handleEditCostAmountChange(parseInputAsNumber(e.target.value).toString())
                                    }
                                    step="0.1"
                                  />
                                  {categoryKey === "laborCost" && (
                                    <div className="text-xs text-blue-600 space-y-1 mt-1">
                                      {editCostItem.autoRetirementFundDisplay && (
                                        <div>{editCostItem.autoRetirementFundDisplay}</div>
                                      )}
                                      {editCostItem.autoInsuranceDisplay && (
                                        <div>{editCostItem.autoInsuranceDisplay}</div>
                                      )}
                                    </div>
                                  )}
                                  <Input
                                    placeholder="담당자/대상자"
                                    value={editCostItem.person || ""}
                                    onChange={(e) =>
                                      setEditCostItem((prev) => (prev ? { ...prev, name: e.target.value } : null))
                                    }
                                  />
                                  <Input
                                    placeholder="메모"
                                    value={editCostItem.memo || ""}
                                    onChange={(e) =>
                                      setEditCostItem((prev) => (prev ? { ...prev, memo: e.target.value } : null))
                                    }
                                  />
                                  <div className="flex gap-2">
                                    <Button onClick={saveEditCost} size="sm">
                                      저장
                                    </Button>
                                    <Button onClick={cancelEditCost} variant="outline" size="sm">
                                      취소
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  key={item.id}
                                  className="p-2 border rounded-md flex justify-between items-start my-1"
                                >
                                  <div>
                                    <p className="font-medium">
                                      {item.name} - {formatNumberForDisplay(item.amount, "원")}
                                    </p>
                                    {item.person && <p className="text-xs text-gray-500">담당: {item.person}</p>}
                                    {item.memo && <p className="text-xs text-gray-500">메모: {item.memo}</p>}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => startEditCost(item, categoryKey, "fixed")}
                                    >
                                      <Edit3 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removeFixedCostItem(categoryKey, item.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ),
                            )}
                            {categoryKey === "depreciation" && (
                              <div className="p-2 border rounded-md bg-gray-100 text-xs mt-1">
                                자동반영 감가상각비: {formatNumberForDisplay(getCurrentDepreciationTotal(), "원")}
                              </div>
                            )}
                          </div>
                        )
                      )
                    })}
                </div>
                <div className="p-3 bg-blue-50 rounded-lg mt-4">
                  <div className="text-sm text-blue-600">고정비 총합계</div>
                  <div className="text-lg font-bold text-blue-700">
                    {formatNumberForDisplay(getTotalFixedCosts(), "원")}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>변동비 관리</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="p-3 border rounded-lg bg-gray-50 space-y-2\">
                  <h4 className="font-medium text-sm">새 항목 추가 (변동비)</h4>
                  <select
                    value={newVariableCostItem.category}
                    onChange={(e) =>
                      setNewVariableCostItem((prev) => ({
                        ...prev,
                        category: e.target.value,
                        amount: "",
                        dailyWage: "",
                        workDays: "",
                      }))
                    }
                    className="w-full p-2 border rounded-md h-10 text-sm"
                  >
                    <option value="">카테고리 선택</option>
                    {DEFAULT_VARIABLE_CATEGORIES.filter(
                      (cat) =>
                        (!cat.isCalculated || (cat.key === "vatWithheld" && !vatSettings.autoCalculate)) &&
                        !cat.isCardFee,
                    ).map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.label}
                      </option>
                    ))}
                    {customVariableCategories.map((cat) => (
                      <option key={cat} value={cat}>{`${cat} (커스텀)`}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="세부 항목명"
                    value={newVariableCostItem.name}
                    onChange={(e) => setNewVariableCostItem((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  {newVariableCostItem.category === "partTime" ? (
                    <>
                      <Input
                        type="number"
                        placeholder="일급(천원)"
                        value={newVariableCostItem.dailyWage}
                        onChange={(e) => setNewVariableCostItem((prev) => ({ ...prev, dailyWage: e.target.value }))}
                        step="0.1"
                      />
                      <Input
                        type="number"
                        placeholder="근무일수"
                        value={newVariableCostItem.workDays}
                        onChange={(e) => setNewVariableCostItem((prev) => ({ ...prev, workDays: e.target.value }))}
                      />
                    </>
                  ) : (
                    <Input
                      type="text"
                      placeholder="금액(천원)"
                      value={(parseInputAsNumber(newVariableCostItem.amount) / 1000 || 0).toLocaleString("ko-KR")}
                      onChange={(e) =>
                        setNewVariableCostItem((prev) => ({
                          ...prev,
                          amount: parseInputAsNumber(e.target.value).toString(),
                        }))
                      }
                      step="0.1"
                    />
                  )}
                  <Input
                    placeholder="담당자/대상자 (선택)"
                    value={newVariableCostItem.person}
                    onChange={(e) => setNewVariableCostItem((prev) => ({ ...prev, person: e.target.value }))}
                  />
                  <Input
                    placeholder="메모 (선택)"
                    value={newVariableCostItem.memo}
                    onChange={(e) => setNewVariableCostItem((prev) => ({ ...prev, memo: e.target.value }))}
                  />
                  <Button onClick={addVariableCostItem} size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    추가
                  </Button>
                </div>

                <div className="space-y-3">
                  {DEFAULT_VARIABLE_CATEGORIES.filter(
                    (c) => (!c.isCalculated || (c.key === "vatWithheld" && !vatSettings.autoCalculate)) && !c.isCardFee,
                  )
                    .map((cat) => cat.key)
                    .concat(customVariableCategories)
                    .map((categoryKey) => {
                      const items = variableCosts[categoryKey] || []
                      const categoryConfig = DEFAULT_VARIABLE_CATEGORIES.find((c) => c.key === categoryKey)
                      const categoryLabel =
                        categoryConfig?.label || customVariableCategories.find((c) => c === categoryKey) || categoryKey
                      const isCustomRemovable = customVariableCategories.includes(categoryKey)
                      const isDefaultRemovable = categoryConfig?.removable

                      return (
                        (items.length > 0 ||
                          (categoryKey !== "ingredients" &&
                            categoryKey !== "cardFees" &&
                            (categoryKey !== "vatWithheld" ||
                              (categoryKey === "vatWithheld" && !vatSettings.autoCalculate)))) && (
                          <div key={categoryKey} className="pt-2">
                            <div className="flex justify-between items-center mb-1">
                              <h5 className="font-semibold text-gray-700">{categoryLabel}</h5>
                              {(isCustomRemovable || (categoryConfig && isDefaultRemovable)) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeVariableCategory(categoryKey)}
                                  className="text-red-500 p-1 h-auto"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            {items.map((item) =>
                              editingCostId === item.id &&
                              editingCostCategory === categoryKey &&
                              editingCostType === "variable" &&
                              editCostItem ? (
                                <div
                                  key={`${item.id}-edit`}
                                  className="p-3 border rounded-lg bg-yellow-50 space-y-2 my-1"
                                >
                                  <Input
                                    placeholder="세부 항목명"
                                    value={editCostItem.name}
                                    onChange={(e) =>
                                      setEditCostItem((prev) => (prev ? { ...prev, name: e.target.value } : null))
                                    }
                                  />
                                  {categoryKey === "partTime" ? (
                                    <>
                                      <Input
                                        type="number"
                                        placeholder="일급(천원)"
                                        value={(editCostItem.dailyWage || 0) / 1000}
                                        onChange={(e) => handleEditCostPartTimeChange("dailyWage", e.target.value)}
                                        step="0.1"
                                      />
                                      <Input
                                        type="number"
                                        placeholder="근무일수"
                                        value={editCostItem.workDays || ""}
                                        onChange={(e) => handleEditCostPartTimeChange("workDays", e.target.value)}
                                      />
                                      <p className="text-xs text-gray-600">
                                        계산된 총액: {formatNumberForDisplay(editCostItem.amount, "원")}
                                      </p>
                                    </>
                                  ) : (
                                    <Input
                                      type="text"
                                      placeholder="금액(천원)"
                                      value={(editCostItem.amount / 1000 || 0).toLocaleString("ko-KR")}
                                      onChange={(e) =>
                                        setEditCostItem((prev) =>
                                          prev ? { ...prev, amount: parseInputAsNumber(e.target.value) * 1000 } : null,
                                        )
                                      }
                                      step="0.1"
                                    />
                                  )}
                                  <Input
                                    placeholder="담당자/대상자"
                                    value={editCostItem.person || ""}
                                    onChange={(e) =>
                                      setEditCostItem((prev) => (prev ? { ...prev, person: e.target.value } : null))
                                    }
                                  />
                                  <Input
                                    placeholder="메모"
                                    value={editCostItem.memo || ""}
                                    onChange={(e) =>
                                      setEditCostItem((prev) => (prev ? { ...prev, memo: e.target.value } : null))
                                    }
                                  />
                                  <div className="flex gap-2">
                                    <Button onClick={saveEditCost} size="sm">
                                      저장
                                    </Button>
                                    <Button onClick={cancelEditCost} variant="outline" size="sm">
                                      취소
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  key={item.id}
                                  className="p-2 border rounded-md flex justify-between items-start my-1"
                                >
                                  <div>
                                    <p className="font-medium">
                                      {item.name} - {formatNumberForDisplay(item.amount, "원")}
                                    </p>
                                    {item.person && <p className="text-xs text-gray-500">담당: {item.person}</p>}
                                    {item.memo && <p className="text-xs text-gray-500">메모: {item.memo}</p>}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => startEditCost(item, categoryKey, "variable")}
                                    >
                                      <Edit3 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removeVariableCostItem(categoryKey, item.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )
                      )
                    })}
                </div>

                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2">카드수수료 (자동계산)</h4>
                  {specificCardFees.map((card) => (
                    <div key={card.id} className="grid grid-cols-3 gap-2 items-center mb-1">
                      <Label htmlFor={`card-fee-${card.id}`} className="text-xs">
                        {card.name}
                      </Label>
                      <Input
                        id={`card-fee-${card.id}`}
                        type="number"
                        placeholder="수수료율(%)"
                        value={card.feeRate || ""}
                        onChange={(e) => handleSpecificCardFeeChange(card.id, "feeRate", e.target.value)}
                        className="text-xs h-8"
                      />
                      <Input
                        type="number"
                        placeholder="카드매출액(원)"
                        value={card.salesAmount || ""}
                        onChange={(e) => handleSpecificCardFeeChange(card.id, "salesAmount", e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                  ))}
                  <div className="text-right mt-2 font-semibold text-orange-600">
                    총 수수료: {formatNumberForDisplay(getVariableCategoryTotal("cardFees"), "원")}
                  </div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg mt-4">
                  <div className="text-sm text-orange-600">변동비 총합계 (기타 + 카드수수료)</div>
                  <div className="text-lg font-bold text-orange-700">
                    {formatNumberForDisplay(getTotalVariableCosts(), "원")}
                  </div>
                  <div className="text-xs text-gray-500">(부가세 예수금 및 식재료비는 자동계산/반영)</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>새 비용 카테고리 추가</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col xs:flex-row gap-2 xs:gap-3 items-stretch xs:items-end text-sm">
              <div className="flex-1">
                <Label htmlFor="new-cat-name">카테고리명</Label>
                <Input
                  id="new-cat-name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="예: 배달수수료"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="new-cat-type">비용 유형</Label>
                <select
                  id="new-cat-type"
                  value={newCategoryType}
                  onChange={(e) => setNewCategoryType(e.target.value as "fixed" | "variable")}
                  className="w-full p-2 border rounded-md h-10"
                >
                  <option value="variable">변동비</option>
                  <option value="fixed">고정비</option>
                </select>
              </div>
              <Button onClick={addCustomCategory} className="w-full xs:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                카테고리 추가
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>월별 마케팅 비용 관리</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="p-3 border rounded-lg bg-gray-50 space-y-2">
                <h4 className="font-medium text-sm">새 마케팅 비용 추가</h4>
                <Input
                  placeholder="항목명 (예: 인스타그램 광고)"
                  value={newMarketingCost.name}
                  onChange={(e) => setNewMarketingCost({ ...newMarketingCost, name: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="총 비용(천원)"
                  value={newMarketingCost.amount}
                  onChange={(e) => setNewMarketingCost({ ...newMarketingCost, amount: e.target.value })}
                  step="0.1"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>시작일</Label>
                    <Input
                      type="date"
                      value={newMarketingCost.startDate}
                      onChange={(e) => setNewMarketingCost({ ...newMarketingCost, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>종료일</Label>
                    <Input
                      type="date"
                      value={newMarketingCost.endDate}
                      onChange={(e) => setNewMarketingCost({ ...newMarketingCost, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <select
                  value={newMarketingCost.period}
                  onChange={(e) => setNewMarketingCost({ ...newMarketingCost, period: e.target.value as any })}
                  className="w-full p-2 border rounded-md h-10"
                >
                  <option value="monthly">월별</option>
                  <option value="quarterly">분기별</option>
                  <option value="biannual">반기별</option>
                  <option value="annual">연간</option>
                </select>
                <Input
                  placeholder="메모"
                  value={newMarketingCost.memo}
                  onChange={(e) => setNewMarketingCost({ ...newMarketingCost, memo: e.target.value })}
                />
                <Button onClick={addMarketingCost} size="sm" className="w-full xs:w-auto">
                  <Plus className="h-4 w-4 mr-1" />
                  추가
                </Button>
              </div>
              <div className="space-y-2">
                {marketingCosts.map((cost) => (
                  <div key={cost.id} className="p-2 border rounded-md flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {cost.name} - {formatNumberForDisplay(cost.amount, "원")} ({cost.period})
                      </p>
                      <p className="text-xs text-gray-500">
                        {cost.startDate} ~ {cost.endDate}
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => removeMarketingCost(cost.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-purple-50 rounded-lg mt-4">
                <div className="text-sm text-purple-600">현재 월 마케팅 비용 총액</div>
                <div className="text-lg font-bold text-purple-700">
                  {formatNumberForDisplay(getCurrentMonthMarketingCosts(), "원")}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bep">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>영업일 설정</CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="operating-days">월 영업일수</Label>
                <Input
                  id="operating-days"
                  type="number"
                  value={operatingDays}
                  onChange={(e) => setOperatingDays(parseInputAsNumber(e.target.value))}
                  placeholder="영업일수 입력"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>BEP 계산 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="p-3 bg-gray-100 rounded-lg">
                  월 고정비:{" "}
                  <span className="font-semibold">
                    {formatNumberForDisplay(calculatedBepData.monthlyFixedCosts, "원")}
                  </span>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  월 변동비 (기타+카드):{" "}
                  <span className="font-semibold">
                    {formatNumberForDisplay(calculatedBepData.monthlyVariableCosts, "원")}
                  </span>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  월 마케팅비:{" "}
                  <span className="font-semibold">{formatNumberForDisplay(getCurrentMonthMarketingCosts(), "원")}</span>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  기여 마진율 (메뉴 기준):{" "}
                  <span className="font-semibold">{calculatedBepData.averageMarginRate.toFixed(1)}%</span>
                </div>
                <Separator className="my-3" />
                <div className="p-3 bg-green-100 rounded-lg text-green-700">
                  월 손익분기점 (매출):{" "}
                  <span className="text-lg font-bold">
                    {calculatedBepData.monthlyBEP === Number.POSITIVE_INFINITY
                      ? "마진율 0% 이하"
                      : formatNumberForDisplay(calculatedBepData.monthlyBEP, "원")}
                  </span>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg text-emerald-700">
                  일 손익분기점 (매출):{" "}
                  <span className="text-lg font-bold">
                    {calculatedBepData.dailyBEP === Number.POSITIVE_INFINITY
                      ? "마진율 0% 이하"
                      : formatNumberForDisplay(calculatedBepData.dailyBEP, "원")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="daily">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>매출 캘린더</CardTitle>
                <div className="flex justify-between items-center text-sm">
                  <Button onClick={() => changeMonth("prev")} variant="outline">
                    &lt; 이전 달
                  </Button>
                  <span>{format(currentMonth, "yyyy년 MM월", { locale: ko })}</span>
                  <Button onClick={() => changeMonth("next")} variant="outline">
                    다음 달 &gt;
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center mb-1 text-xs font-medium">
                  {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {daysInMonth.map((day, i) => {
                    const dayStr = format(day, "d")
                    const isSelectedDay = isSameDay(day, selectedDate)
                    const sale = getDailySaleForDate(day)
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(day)}
                        className={`p-1 xs:p-1.5 min-h-[5rem] xs:min-h-[6rem] sm:min-h-[6.5rem] border rounded-md flex flex-col items-center justify-between text-[10px] xs:text-xs transition-colors ${isSelectedDay ? "bg-blue-100 border-blue-300 ring-2 ring-blue-400" : sale ? (sale.bepAchieved ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200") : "hover:bg-gray-100"}`}
                      >
                        <span className="font-medium text-xs sm:text-sm">{dayStr}</span>
                        {sale && (
                          <div className="mt-1 text-center leading-tight">
                            <div className="font-semibold">
                              {formatNumberForDisplay(sale.totalRevenue, "만원", 1, 1)}
                            </div>
                            <div className={`${sale.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {sale.netProfit >= 0 ? "+" : ""}
                              {formatNumberForDisplay(sale.netProfit, "만원", 1, 1)}
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="flex justify-around mt-2 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-50 border border-green-200 mr-1"></div>BEP 달성
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-50 border border-red-200 mr-1"></div>BEP 미달성
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-100 border-blue-300 mr-1"></div>선택일
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>일일 매출 입력</CardTitle>
                <CardDescription>{format(selectedDate, "PPP", { locale: ko })}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  <h4 className="font-medium">메뉴별 판매량</h4>
                  {menuItems.length === 0 && (
                    <p className="text-gray-500">등록된 메뉴가 없습니다. 메뉴 관리 탭에서 메뉴를 추가해주세요.</p>
                  )}
                  {menuItems.map((menu) => (
                    <div key={menu.id} className="grid grid-cols-1 xs:grid-cols-2 items-center gap-2">
                      <Label htmlFor={`menu-sale-${menu.id}`} className="truncate" title={menu.name}>
                        {menu.name}
                      </Label>
                      <Input
                        id={`menu-sale-${menu.id}`}
                        type="number"
                        placeholder="0"
                        value={dailyMenuSales[menu.id] || ""}
                        onChange={(e) => setDailyMenuSales((prev) => ({ ...prev, [menu.id]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="other-revenue">기타 매출(원)</Label>
                    <Input
                      id="other-revenue"
                      type="text"
                      placeholder="0"
                      value={otherRevenue ? (parseInputAsNumber(otherRevenue) || 0).toLocaleString("ko-KR") : ""}
                      onChange={(e) => setOtherRevenue(parseInputAsNumber(e.target.value).toString())}
                      step="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="other-costs">기타 비용(일일, 원)</Label>
                    <Input
                      id="other-costs"
                      type="text"
                      placeholder="0"
                      value={otherCosts ? (parseInputAsNumber(otherCosts) || 0).toLocaleString("ko-KR") : ""}
                      onChange={(e) => setOtherCosts(parseInputAsNumber(e.target.value).toString())}
                      step="100"
                    />
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  총 매출:{" "}
                  <span className="font-bold">{formatNumberForDisplay(currentDaySalesData.totalRevenue, "원")}</span>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  총 원가 (메뉴+기타):{" "}
                  <span className="font-bold">{formatNumberForDisplay(currentDaySalesData.totalCosts, "원")}</span>
                </div>
                <div
                  className={`p-3 rounded-lg ${currentDaySalesData.netProfit >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                >
                  순이익:{" "}
                  <span className="font-bold">
                    {currentDaySalesData.netProfit >= 0 ? "+" : ""}
                    {formatNumberForDisplay(currentDaySalesData.netProfit, "원")}
                  </span>
                </div>
                <Button onClick={updateDailySales} className="w-full">
                  매출 데이터 저장
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>월별 분석 ({format(currentMonth, "yyyy년 MM월", { locale: ko })})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    총 매출:{" "}
                    <span className="font-bold">
                      {formatNumberForDisplay(calculatedMonthlyAnalysisData.totalRevenue, "원")}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-lg ${calculatedMonthlyAnalysisData.operatingProfit >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    영업이익:{" "}
                    <span className="font-bold">
                      {calculatedMonthlyAnalysisData.operatingProfit >= 0 ? "+" : ""}
                      {formatNumberForDisplay(calculatedMonthlyAnalysisData.operatingProfit, "원")}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-lg">
                    영업이익률:{" "}
                    <span className="font-bold">{calculatedMonthlyAnalysisData.operatingProfitRate.toFixed(1)}%</span>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    총 고정비:{" "}
                    <span className="font-bold">
                      {formatNumberForDisplay(calculatedMonthlyAnalysisData.totalFixedCosts, "원")}
                    </span>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    총 변동비 (COGS+기타+카드+VAT):{" "}
                    <span className="font-bold">
                      {formatNumberForDisplay(calculatedMonthlyAnalysisData.totalVariableCosts, "원")}
                    </span>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    총 마케팅비:{" "}
                    <span className="font-bold">
                      {formatNumberForDisplay(getCurrentMonthMarketingCosts(), "원")}
                    </span>
                  </div>
                </div>
                <Separator />
                <h4 className="font-medium mt-3">주요 재무 유출 항목 (참고)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    예상 부가가치세:{" "}
                    <span className="font-semibold">
                      {formatNumberForDisplay(calculatedMonthlyAnalysisData.vatPayable, "원")}
                    </span>
                  </div>
                  <div className="p-3 bg-cyan-50 rounded-lg">
                    퇴직적립금 지출(고정비):{" "}
                    <span className="font-semibold">
                      {formatNumberForDisplay(calculatedMonthlyAnalysisData.retirementSavingsExpense, "원")}
                    </span>
                  </div>
                  <div className="p-3 bg-pink-50 rounded-lg">
                    세금 및 공과금(고정비):{" "}
                    <span className="font-semibold">
                      {formatNumberForDisplay(calculatedMonthlyAnalysisData.taxesExpense, "원")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>메뉴별 분석 ({format(currentMonth, "yyyy년 MM월", { locale: ko })})</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse border border-gray-300 text-[10px] xs:text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-1 xs:p-1.5 border text-left">메뉴명</th>
                      <th className="p-1 xs:p-1.5 border">총 판매량</th>
                      <th className="p-1 xs:p-1.5 border">총 매출액</th>
                      <th className="p-1 xs:p-1.5 border">총 이익액</th>
                      <th className="p-1 xs:p-1.5 border">일평균 판매량</th>
                      <th className="p-1 xs:p-1.5 border">이익률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getMenuAnalysis()
                      .sort((a, b) => b.totalRevenue - a.totalRevenue)
                      .map((analysis) => {
                        const menu = menuItems.find((m) => m.id === analysis.menuId)
                        if (!menu) return null
                        return (
                          <tr key={analysis.menuId} className="text-center hover:bg-gray-50">
                            <td className="p-1 xs:p-1.5 border font-medium text-left">{menu.name}</td>
                            <td className="p-1 xs:p-1.5 border">{analysis.totalSold}</td>
                            <td className="p-1 xs:p-1.5 border">
                              {formatNumberForDisplay(analysis.totalRevenue, "원")}
                            </td>
                            <td className="p-1 xs:p-1.5 border">
                              <span className={analysis.totalProfit >= 0 ? "text-green-600" : "text-red-600"}>
                                {formatNumberForDisplay(analysis.totalProfit, "원")}
                              </span>
                            </td>
                            <td className="p-1 xs:p-1.5 border">{analysis.averageDaily.toFixed(1)}</td>
                            <td className="p-1 xs:p-1.5 border">
                              <Badge
                                variant={
                                  analysis.profitMargin > 60
                                    ? "default"
                                    : analysis.profitMargin > 40
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {analysis.profitMargin.toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {showAlerts && alerts.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>알림 및 제안</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowAlerts(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-2 rounded-md ${alert.type === "warning" ? "bg-yellow-100 text-yellow-700" : alert.type === "success" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}
                    >
                      {alert.message} <span className="text-xs text-gray-500">({alert.date})</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>비용 최적화 제안</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {getCostOptimizationSuggestions().length === 0 && <p>현재 특별한 비용 최적화 제안이 없습니다.</p>}
                {getCostOptimizationSuggestions().map((suggestion, idx) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <h5 className="font-semibold">
                      {suggestion.category}{" "}
                      <Badge
                        variant={
                          suggestion.priority === "높음"
                            ? "destructive"
                            : suggestion.priority === "중간"
                              ? "secondary"
                              : "default"
                        }
                      >
                        {suggestion.priority}
                      </Badge>
                    </h5>
                    <p>{suggestion.suggestion}</p>
                    <p className="text-xs text-green-600">
                      예상 절감액: {formatNumberForDisplay(suggestion.expectedSaving, "원")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>월별 목표 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <Label htmlFor="target-profit">목표 영업이익(원)</Label>
                  <Input
                    id="target-profit"
                    type="text"
                    value={(targetGoals.targetProfit || 0).toLocaleString("ko-KR")}
                    onChange={(e) =>
                      setTargetGoals({ ...targetGoals, targetProfit: parseInputAsNumber(e.target.value) })
                    }
                    placeholder="월 목표 영업이익 입력"
                  />
                </div>
                <Button onClick={handleSaveAll} size="sm">
                  목표 저장
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>부가가치세 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="vat-enabled"
                    checked={vatSettings.enabled}
                    onChange={(e) => setVatSettings({ ...vatSettings, enabled: e.target.checked })}
                  />
                  <Label htmlFor="vat-enabled">부가가치세 계산 활성화</Label>
                </div>
                {vatSettings.enabled && (
                  <>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="vat-auto"
                        checked={vatSettings.autoCalculate}
                        onChange={(e) => setVatSettings({ ...vatSettings, autoCalculate: e.target.checked })}
                      />
                      <Label htmlFor="vat-auto">매출 기반 자동 계산 (월별 분석에 반영)</Label>
                    </div>
                    <div>
                      <Label htmlFor="vat-rate">세율 (%)</Label>
                      <Input
                        id="vat-rate"
                        type="number"
                        value={vatSettings.rate}
                        onChange={(e) => setVatSettings({ ...vatSettings, rate: parseInputAsNumber(e.target.value) })}
                        placeholder="예: 10"
                        disabled={!vatSettings.autoCalculate}
                      />
                    </div>
                    {!vatSettings.autoCalculate && (
                      <p className="text-xs text-gray-500">
                        자동계산을 비활성화하면, 변동비의 '부가세 예수금' 항목에 직접 입력한 금액이 사용됩니다.
                      </p>
                    )}
                  </>
                )}
                <Button onClick={handleSaveAll} size="sm">
                  VAT 설정 저장
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">📜 저장 내역</h3>
        <ul className="text-sm">
          {savedList.map((row: any) => (
            <li key={row.id}>
              ✅ <b>{row.name}</b> - {new Date(row.created_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
