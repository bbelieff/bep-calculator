"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  const [isSaving, setIsSaving] = useState(false)
  const [showSavedMessage, setShowSavedMessage] = useState(false)

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

  const [fixedCosts, setFixedCosts] = useState<any>({})
  const [variableCosts, setVariableCosts] = useState<any>({})
  const [dailySales, setDailySales] = useState<any[]>([])
  const [operatingDays, setOperatingDays] = useState<number>(26)
  const [targetGoals, setTargetGoals] = useState<any>({ targetProfit: 0, targetRevenue: 0 })
  const [customVariableCategories, setCustomVariableCategories] = useState<string[]>([])
  const [customFixedCategories, setCustomFixedCategories] = useState<string[]>([])
  const [vatSettings, setVatSettings] = useState<any>({ enabled: true, rate: 10, autoCalculate: true })

  const [menuItems, setMenuItems] = useState<any[]>([])
  const [bulkMarginRate, setBulkMarginRate] = useState("")

  const isSavingRef = useRef(false)
  const debouncedSaveRef = useRef<ReturnType<typeof debounce> | null>(null)

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
    if (isSavingRef.current) return
    setIsSaving(true)
    isSavingRef.current = true
    try {
      await saveBEPData(
    restaurantName,
        {
          categories,
          depreciationItems,
          marketingCosts,
    fixedCosts,
    variableCosts,
          dailySales,
          operatingDays,
    targetGoals,
    customVariableCategories,
    customFixedCategories,
    vatSettings,
        }
      )
      setLastSavedAt(new Date())
      setShowSavedMessage(true)
      setTimeout(() => setShowSavedMessage(false), 1000)
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
    } finally {
      setIsSaving(false)
      isSavingRef.current = false
    }
  }, [restaurantName, categories, depreciationItems, marketingCosts, fixedCosts, variableCosts, dailySales, operatingDays, targetGoals, customVariableCategories, customFixedCategories, vatSettings])

  useEffect(() => {
    debouncedSaveRef.current = debounce(() => {
      if (!isSavingRef.current) handleSaveAll()
    }, 60000)
  }, [handleSaveAll])

  useEffect(() => {
    if (debouncedSaveRef.current) debouncedSaveRef.current()
  }, [restaurantName, categories, depreciationItems, marketingCosts, fixedCosts, variableCosts, dailySales, operatingDays, targetGoals, customVariableCategories, customFixedCategories, vatSettings])

  useEffect(() => {
    async function fetchLatest() {
      try {
        const data = await loadLatestBEPData()
        console.log("Supabase data:", data)
        if (data) {
          const categories = Array.isArray(data.data?.categories) ? data.data.categories : Array.isArray(data.categories) ? data.categories : []
          const depreciationItems = Array.isArray(data.data?.depreciationItems) ? data.data.depreciationItems : Array.isArray(data.depreciationItems) ? data.depreciationItems : []
          const marketingCosts = Array.isArray(data.data?.marketingCosts) ? data.data.marketingCosts : Array.isArray(data.marketingCosts) ? data.marketingCosts : []
          setCategories(categories)
          setDepreciationItems(depreciationItems)
          setMarketingCosts(marketingCosts)
          setFixedCosts(data.data?.fixedCosts || {})
          setVariableCosts(data.data?.variableCosts || {})
          setDailySales(data.data?.dailySales || [])
          setOperatingDays(data.data?.operatingDays || 26)
          setTargetGoals(data.data?.targetGoals || { targetProfit: 0, targetRevenue: 0 })
          setCustomVariableCategories(data.data?.customVariableCategories || [])
          setCustomFixedCategories(data.data?.customFixedCategories || [])
          setVatSettings(data.data?.vatSettings || { enabled: true, rate: 10, autoCalculate: true })
          setRestaurantName(
            (data.data && (data.data.restaurantName || data.data.name)) ||
            data.restaurantName ||
            data.name ||
            "식당 BEP 계산기"
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

  const downloadMenuSample = () => {
    const sample = `메뉴명,판매가(천원),원가(천원),원가입력방식,원가율(%),할인적용(Y/N),할인타입,할인값\n한우 양념갈비 150g,29,14.5,amount,50,N,amount,0\n한우 불고기솥밥,23,11.5,amount,50,N,amount,0`;
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu_sample.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/);
      const newMenus: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [name, price, cost, costInputType, costRate, discountEnabled, discountType, discountValue] = line.split(",");
          newMenus.push({
            id: Date.now().toString() + i,
            name,
          price: price || "",
          costInputType: costInputType || "amount",
          cost: cost || "",
          costRate: costRate || "",
          discountEnabled: discountEnabled === "Y",
          discountDays: [],
          discountType: discountType || "amount",
          discountRate: discountType === "rate" ? discountValue : "",
          discountAmount: discountType === "amount" ? discountValue : "",
          margin: 0,
        });
      }
      setMenuItems((prev) => [...prev, ...newMenus]);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const addMenuItem = () => {
    if (!newMenuItem.name || !newMenuItem.price) return;
    setMenuItems((prev) => [
      ...prev,
      {
        ...newMenuItem,
        id: Date.now().toString(),
        margin: 0,
      },
    ]);
    setNewMenuItem({
      name: "",
      price: "",
      costInputType: "amount",
      cost: "",
      costRate: "",
      discountEnabled: false,
      discountDays: [],
      discountType: "amount",
      discountRate: "",
      discountAmount: "",
    });
  };

  const removeMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
  };

  const applyBulkMargin = () => {
    const margin = parseFloat(bulkMarginRate);
    if (isNaN(margin) || margin < 0 || margin > 100) return;
    setMenuItems((prev) => prev.map((item) => {
      const price = parseFloat(item.price);
      const cost = price * (1 - margin / 100);
      return {
        ...item,
        cost: cost.toFixed(2),
        margin,
      };
    }));
    setBulkMarginRate("");
  };

  const startEditMenu = (item: any) => {
    // 실제 구현 시 인라인 수정 폼 등 추가 가능
    alert("수정 기능은 추후 구현 예정");
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
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
        </div>
        <div className="flex justify-end items-start mt-2 relative">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              {lastSavedAt && !isNaN(lastSavedAt.getTime()) && (
                <span className="text-sm text-gray-500">마지막 저장: {format(lastSavedAt, "yyyy-MM-dd HH:mm:ss")}</span>
              )}
              <Button size="sm" onClick={handleSaveAll} disabled={isSaving}>
                {isSaving ? "저장 중..." : "저장"}
          </Button>
            </div>
            {showSavedMessage && (
              <span className="text-xs text-green-600 absolute top-full right-0 mt-2 bg-white px-3 py-1 rounded shadow z-10">
                저장되었습니다.
                </span>
            )}
          </div>
        </div>
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
          <TabsTrigger value="fixed">고정비 관리</TabsTrigger>
          <TabsTrigger value="variable">변동비 관리</TabsTrigger>
          <TabsTrigger value="daily">일일 매출</TabsTrigger>
          <TabsTrigger value="bep">BEP 계산</TabsTrigger>
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
              {/* CSV 업로드/다운로드 */}
              <div className="p-4 border rounded-lg bg-blue-50">
                <h4 className="font-medium mb-3 text-sm">CSV 파일로 메뉴 일괄 등록</h4>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <Button onClick={downloadMenuSample} variant="outline" size="sm">
                    샘플 CSV 다운로드
                  </Button>
                  <Input type="file" accept=".csv" onChange={handleFileUpload} className="text-xs file:text-xs" />
                </div>
                <p className="text-xs text-gray-600 mt-2">샘플 CSV의 헤더와 설명을 참고하여 작성 후 업로드하세요.</p>
              </div>
              {/* 메뉴 추가 폼 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 items-end text-sm">
                <div>
                  <Label htmlFor="menu-name">메뉴명</Label>
                  <Input id="menu-name" value={newMenuItem.name} onChange={e => setNewMenuItem({ ...newMenuItem, name: e.target.value })} placeholder="메뉴 이름 입력" />
                </div>
                <div>
                  <Label htmlFor="menu-price">판매가(천원)</Label>
                  <Input id="menu-price" type="number" value={newMenuItem.price} onChange={e => setNewMenuItem({ ...newMenuItem, price: e.target.value })} placeholder="예: 29" step="0.1" />
                </div>
                <div>
                  <Label htmlFor="menu-cost-type">원가입력</Label>
                  <select id="menu-cost-type" value={newMenuItem.costInputType} onChange={e => setNewMenuItem(prev => ({ ...prev, costInputType: e.target.value as "amount" | "rate", cost: "", costRate: "" }))} className="w-full p-2 border rounded-md mt-1 text-sm h-10">
                    <option value="amount">금액(천원)</option>
                    <option value="rate">원가율(%)</option>
                  </select>
                </div>
                {newMenuItem.costInputType === "amount" ? (
                  <div>
                    <Label htmlFor="menu-cost-amount">원가(천원)</Label>
                    <Input id="menu-cost-amount" type="number" value={newMenuItem.cost} onChange={e => setNewMenuItem({ ...newMenuItem, cost: e.target.value })} placeholder="예: 14.5" step="0.1" />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="menu-cost-rate">원가율(%)</Label>
                    <Input id="menu-cost-rate" type="number" value={newMenuItem.costRate} onChange={e => setNewMenuItem({ ...newMenuItem, costRate: e.target.value })} placeholder="예: 50" />
                  </div>
                )}
                <div className="flex items-center space-x-2 pt-5">
                  <input type="checkbox" id="discountEnabled" checked={newMenuItem.discountEnabled} onChange={e => setNewMenuItem({ ...newMenuItem, discountEnabled: e.target.checked })} />
                  <Label htmlFor="discountEnabled" className="text-sm font-normal">요일할인</Label>
                </div>
                <div>
                  <Label>할인타입</Label>
                  <select value={newMenuItem.discountType} onChange={e => setNewMenuItem({ ...newMenuItem, discountType: e.target.value as "rate" | "amount" })} disabled={!newMenuItem.discountEnabled} className="w-full p-2 border rounded-md mt-1 text-sm h-10">
                    <option value="amount">할인액(천원)</option>
                    <option value="rate">할인율(%)</option>
                  </select>
                </div>
                <div>
                  <Label>{newMenuItem.discountType === "rate" ? "할인율(%)" : "할인액(천원)"}</Label>
                  <Input type="number" value={newMenuItem.discountType === "rate" ? newMenuItem.discountRate : newMenuItem.discountAmount} onChange={e => newMenuItem.discountType === "rate" ? setNewMenuItem({ ...newMenuItem, discountRate: e.target.value }) : setNewMenuItem({ ...newMenuItem, discountAmount: e.target.value })} placeholder={newMenuItem.discountType === "rate" ? "예: 10" : "예: 5"} disabled={!newMenuItem.discountEnabled} step={newMenuItem.discountType === "amount" ? "0.1" : "1"} />
                </div>
                <Button onClick={addMenuItem} className="w-full xl:w-auto mt-4 xl:mt-0">
                  <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                  추가
                </Button>
              </div>
              {/* 마진율 일괄 적용 */}
              <div className="p-4 border rounded-lg bg-yellow-50 text-sm">
                <h4 className="font-medium mb-3">마진율 일괄 적용 (모든 메뉴 대상)</h4>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="bulk-margin-rate">적용할 마진율 (%)</Label>
                    <Input id="bulk-margin-rate" type="number" value={bulkMarginRate} onChange={e => setBulkMarginRate(e.target.value)} placeholder="예: 60 (0~100 사이 값)" min="0" max="100" />
                  </div>
                  <Button onClick={applyBulkMargin} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    일괄 적용
                  </Button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  입력된 마진율을 기준으로 모든 메뉴의 원가가 재계산됩니다. (원가 입력 방식은 '금액'으로 변경됨)
                </p>
              </div>
              {/* 메뉴 리스트 */}
              <div className="space-y-4">
                {menuItems.map((item, index) => (
                  <div key={item.id} className="flex flex-col p-3 border rounded-lg gap-3 text-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-600">
                          판매가: {formatCurrency(item.price)} / 원가: {formatCurrency(item.cost)} / 마진율: <Badge variant={item.margin > 60 ? "default" : item.margin > 40 ? "secondary" : "destructive"}>{item.margin.toFixed(1)}%</Badge>
                          </div>
                          {item.discountEnabled && (
                            <div className="text-xs text-blue-600 mt-1">
                            할인: {item.discountDays.join(", ")} ({item.discountType === "rate" ? `${item.discountRate}%` : `${formatCurrency(item.discountAmount)}`})
                            </div>
                          )}
                        </div>
                      <div className="flex gap-2 self-start sm:self-center mt-2 sm:mt-0">
                        <Button variant="outline" size="sm" onClick={() => startEditMenu(item)}>수정</Button>
                        <Button variant="destructive" size="sm" onClick={() => removeMenuItem(item.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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

        <TabsContent value="fixed">
          <div>고정비 관리 UI (예전 구조 참고, 입력/수정/삭제/합계 등)</div>
        </TabsContent>

        <TabsContent value="variable">
          <div>변동비 관리 UI (예전 구조 참고, 입력/수정/삭제/합계 등)</div>
        </TabsContent>

        <TabsContent value="daily">
          <div>일일 매출 UI (예전 구조 참고, 입력/수정/분석 등)</div>
        </TabsContent>

        <TabsContent value="bep">
          <div>BEP 계산 UI (예전 구조 참고, 계산/분석 등)</div>
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
