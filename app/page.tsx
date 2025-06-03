"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Save, Edit3, X } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay } from "date-fns"
import { ko } from "date-fns/locale"
import { MenuManagement } from "@/components/restaurant/MenuManagement"
import { CostManagement } from "@/components/restaurant/CostManagement"
import { MenuCategory, MenuItem } from "@/types/menu"
import { DepreciationItem, MarketingCost } from "@/types/cost"
import { Alert } from "@/types/restaurant"
import { calculateTotalSales, calculateTotalCosts, calculateMonthlyDepreciation, calculateMonthlyMarketingCosts, calculateBreakEvenPoint } from "@/utils/calculations"
import { formatCurrency, formatNumber, formatPercentage } from "@/utils/formatters"
import { loadLatestBEPData, saveBEPData } from "@/lib/db"

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export default function RestaurantBEPCalculator() {
  const [restaurantName, setRestaurantName] = useState<string>("식당 BEP 계산기")
  const [isEditingRestaurantName, setIsEditingRestaurantName] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [newMenuItem, setNewMenuItemState] = useState<MenuItem>({
    id: '',
    name: '',
    price: 0,
    cost: 0,
    quantity: 0,
    category: '',
    isNew: true,
  })
  const [isAddingNewItem, setIsAddingNewItem] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [depreciationItems, setDepreciationItems] = useState<DepreciationItem[]>([])
  const [marketingCosts, setMarketingCosts] = useState<MarketingCost[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showAlerts, setShowAlerts] = useState<boolean>(true)
  const [newDepreciationItem, setNewDepreciationItemState] = useState<DepreciationItem>({
    id: '',
    name: '',
    amount: 0,
    months: 0,
    startDate: new Date().toISOString().split('T')[0],
  })
  const [newMarketingCost, setNewMarketingCostState] = useState<MarketingCost>({
    id: '',
    name: '',
    amount: 0,
    months: 0,
    startDate: new Date().toISOString().split('T')[0],
  })
  const [isAddingDepreciation, setIsAddingDepreciation] = useState(false)
  const [isAddingMarketing, setIsAddingMarketing] = useState(false)
  const [editingDepreciation, setEditingDepreciation] = useState<DepreciationItem | null>(null)
  const [editingMarketing, setEditingMarketing] = useState<MarketingCost | null>(null)

  const setNewMenuItem = (updates: Partial<MenuItem>) => {
    setNewMenuItemState(prev => ({ ...prev, ...updates }))
  }
  const setNewDepreciationItem = (updates: Partial<DepreciationItem>) => {
    setNewDepreciationItemState(prev => ({ ...prev, ...updates }))
  }
  const setNewMarketingCost = (updates: Partial<MarketingCost>) => {
    setNewMarketingCostState(prev => ({ ...prev, ...updates }))
  }

  const handleSaveAll = useCallback(async () => {
    try {
      await saveBEPData(
        restaurantName,
        {
          categories,
          depreciationItems,
          marketingCosts,
        }
      )
      setLastSavedAt(new Date())
      setAlerts(prev => [
        {
          id: crypto.randomUUID(),
          type: "success",
          message: "저장되었습니다.",
          date: new Date().toISOString(),
        },
        ...prev,
      ])
    } catch (error) {
      setAlerts(prev => [
        {
          id: crypto.randomUUID(),
          type: "warning",
          message: "저장 중 오류가 발생했습니다.",
          date: new Date().toISOString(),
        },
        ...prev,
      ])
    }
  }, [restaurantName, categories, depreciationItems, marketingCosts])

  const debouncedSave = useCallback(debounce(handleSaveAll, 60000), [handleSaveAll])

  useEffect(() => {
    async function fetchLatest() {
      try {
        const data = await loadLatestBEPData()
        console.log("Supabase data:", data)
        if (data) {
          setRestaurantName(
            (data.data && (data.data.restaurantName || data.data.name)) ||
            data.restaurantName ||
            data.name ||
            "식당 BEP 계산기"
          )
          setCategories(
            Array.isArray(data.data?.categories)
              ? data.data.categories
              : Array.isArray(data.categories)
              ? data.categories
              : []
          )
          setDepreciationItems(
            Array.isArray(data.data?.depreciationItems)
              ? data.data.depreciationItems
              : Array.isArray(data.depreciationItems)
              ? data.depreciationItems
              : []
          )
          setMarketingCosts(
            Array.isArray(data.data?.marketingCosts)
              ? data.data.marketingCosts
              : Array.isArray(data.marketingCosts)
              ? data.marketingCosts
              : []
          )
          let lastSaved = null;
          const innerData = data.data || {};
          if (innerData.savedAt && !isNaN(Date.parse(innerData.savedAt))) {
            lastSaved = new Date(innerData.savedAt);
          } else if (innerData.updatedAt && !isNaN(Date.parse(innerData.updatedAt))) {
            lastSaved = new Date(innerData.updatedAt);
          } else if (data.savedAt && !isNaN(Date.parse(data.savedAt))) {
            lastSaved = new Date(data.savedAt);
          } else if (data.updatedAt && !isNaN(Date.parse(data.updatedAt))) {
            lastSaved = new Date(data.updatedAt);
          } else if (data.created_at && !isNaN(Date.parse(data.created_at))) {
            lastSaved = new Date(data.created_at);
          } else {
            lastSaved = null;
          }
          setLastSavedAt(lastSaved)
        }
      } catch (error) {
        setAlerts(prev => [
          {
            id: crypto.randomUUID(),
            type: "warning",
            message: "데이터 로드 중 오류가 발생했습니다.",
            date: new Date().toISOString(),
          },
          ...prev,
        ])
      }
    }
    fetchLatest()
  }, [])

  useEffect(() => {
    debouncedSave()
  }, [debouncedSave, restaurantName, categories, depreciationItems, marketingCosts])

  const handleRestaurantNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestaurantName(e.target.value)
  }

  const handleSaveRestaurantName = () => {
    setIsEditingRestaurantName(false)
  }

  const totalSales = calculateTotalSales(categories ?? [])
  const totalCosts = calculateTotalCosts(categories ?? [])
  const monthlyDepreciation = calculateMonthlyDepreciation(depreciationItems ?? [])
  const monthlyMarketingCosts = calculateMonthlyMarketingCosts(marketingCosts ?? [])
  const breakEvenPoint = calculateBreakEvenPoint(
    totalSales,
    totalCosts,
    monthlyDepreciation,
    monthlyMarketingCosts
  )

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        {isEditingRestaurantName ? (
          <div className="flex items-center gap-2">
            <Input
              value={restaurantName}
              onChange={handleRestaurantNameChange}
              onBlur={handleSaveRestaurantName}
              autoFocus
            />
            <Button size="sm" onClick={handleSaveRestaurantName}>
              저장
            </Button>
          </div>
        ) : (
          <h1
            className="text-2xl font-bold cursor-pointer"
            onClick={() => setIsEditingRestaurantName(true)}
          >
            {restaurantName}
          </h1>
        )}
        {lastSavedAt && !isNaN(lastSavedAt.getTime()) && (
          <span className="text-sm text-gray-500">
            마지막 저장: {format(lastSavedAt, "yyyy-MM-dd HH:mm:ss")}
          </span>
        )}
      </div>

      {showAlerts && alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-2 rounded ${
                alert.type === "warning"
                  ? "bg-yellow-100 text-yellow-800"
                  : alert.type === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {alert.message}
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="menu" className="space-y-4">
        <TabsList>
          <TabsTrigger value="menu">메뉴 관리</TabsTrigger>
          <TabsTrigger value="costs">비용 관리</TabsTrigger>
          <TabsTrigger value="analysis">분석</TabsTrigger>
        </TabsList>

        <TabsContent value="menu">
          <MenuManagement
            categories={categories}
            onCategoriesChange={setCategories}
            newMenuItem={newMenuItem}
            isAddingNewItem={isAddingNewItem}
            editingItem={editingItem}
            setNewMenuItem={setNewMenuItem}
            setIsAddingNewItem={setIsAddingNewItem}
            setEditingItem={setEditingItem}
          />
        </TabsContent>

        <TabsContent value="costs">
          <CostManagement
            depreciationItems={depreciationItems}
            marketingCosts={marketingCosts}
            onDepreciationItemsChange={setDepreciationItems}
            onMarketingCostsChange={setMarketingCosts}
            newDepreciationItem={newDepreciationItem}
            newMarketingCost={newMarketingCost}
            isAddingDepreciation={isAddingDepreciation}
            isAddingMarketing={isAddingMarketing}
            editingDepreciation={editingDepreciation}
            editingMarketing={editingMarketing}
            setNewDepreciationItem={setNewDepreciationItem}
            setNewMarketingCost={setNewMarketingCost}
            setIsAddingDepreciation={setIsAddingDepreciation}
            setIsAddingMarketing={setIsAddingMarketing}
            setEditingDepreciation={setEditingDepreciation}
            setEditingMarketing={setEditingMarketing}
          />
        </TabsContent>

        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>BEP 분석</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>총 매출</Label>
                    <div className="text-2xl font-bold">
                      {formatCurrency(totalSales)}
                    </div>
                  </div>
                  <div>
                    <Label>총 원가</Label>
                    <div className="text-2xl font-bold">
                      {formatCurrency(totalCosts)}
                    </div>
                  </div>
                  <div>
                    <Label>월 감가상각비</Label>
                    <div className="text-2xl font-bold">
                      {formatCurrency(monthlyDepreciation)}
                    </div>
                  </div>
                  <div>
                    <Label>월 마케팅 비용</Label>
                    <div className="text-2xl font-bold">
                      {formatCurrency(monthlyMarketingCosts)}
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label>손익분기점</Label>
                  <div className="text-2xl font-bold">
                    {formatNumber(breakEvenPoint, "개월")}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
