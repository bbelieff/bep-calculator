import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCostManagement } from '@/hooks/useCostManagement';
import { DepreciationItem, MarketingCost } from '@/types/cost';
import { formatCurrency } from '@/utils/formatters';

interface CostManagementProps {
  depreciationItems: DepreciationItem[];
  marketingCosts: MarketingCost[];
  onDepreciationItemsChange: (items: DepreciationItem[]) => void;
  onMarketingCostsChange: (costs: MarketingCost[]) => void;
}

export const CostManagement: React.FC<CostManagementProps> = ({
  depreciationItems,
  marketingCosts,
  onDepreciationItemsChange,
  onMarketingCostsChange,
}) => {
  const {
    newDepreciationItem,
    newMarketingCost,
    isAddingDepreciation,
    isAddingMarketing,
    editingDepreciation,
    editingMarketing,
    addDepreciationItem,
    updateDepreciationItem,
    deleteDepreciationItem,
    addMarketingCost,
    updateMarketingCost,
    deleteMarketingCost,
    setEditingDepreciation,
    setEditingMarketing,
    setAddingDepreciation,
    setAddingMarketing,
    updateNewDepreciationItem,
    updateNewMarketingCost,
  } = useCostManagement(depreciationItems, marketingCosts);

  const handleAddDepreciation = () => {
    if (!newDepreciationItem.name) return;
    const item: DepreciationItem = {
      ...newDepreciationItem,
      id: crypto.randomUUID(),
    };
    addDepreciationItem(item);
    onDepreciationItemsChange(depreciationItems);
  };

  const handleUpdateDepreciation = (item: DepreciationItem) => {
    updateDepreciationItem(item);
    onDepreciationItemsChange(depreciationItems);
  };

  const handleDeleteDepreciation = (id: string) => {
    deleteDepreciationItem(id);
    onDepreciationItemsChange(depreciationItems);
  };

  const handleAddMarketing = () => {
    if (!newMarketingCost.name) return;
    const item: MarketingCost = {
      ...newMarketingCost,
      id: crypto.randomUUID(),
    };
    addMarketingCost(item);
    onMarketingCostsChange(marketingCosts);
  };

  const handleUpdateMarketing = (item: MarketingCost) => {
    updateMarketingCost(item);
    onMarketingCostsChange(marketingCosts);
  };

  const handleDeleteMarketing = (id: string) => {
    deleteMarketingCost(id);
    onMarketingCostsChange(marketingCosts);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>감가상각 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {depreciationItems.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">
                    금액: {formatCurrency(item.amount)} | 기간: {item.months}개월
                    | 시작일: {item.startDate}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingDepreciation(item)}
                  >
                    수정
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteDepreciation(item.id)}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            ))}

            {isAddingDepreciation && (
              <div className="space-y-2 p-4 border rounded">
                <Input
                  placeholder="항목 이름"
                  value={newDepreciationItem.name}
                  onChange={e =>
                    updateNewDepreciationItem({ name: e.target.value })
                  }
                />
                <Input
                  type="number"
                  placeholder="금액"
                  value={newDepreciationItem.amount}
                  onChange={e =>
                    updateNewDepreciationItem({
                      amount: Number(e.target.value),
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="기간 (개월)"
                  value={newDepreciationItem.months}
                  onChange={e =>
                    updateNewDepreciationItem({
                      months: Number(e.target.value),
                    })
                  }
                />
                <Input
                  type="date"
                  value={newDepreciationItem.startDate}
                  onChange={e =>
                    updateNewDepreciationItem({
                      startDate: e.target.value,
                    })
                  }
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddDepreciation}>추가</Button>
                  <Button
                    variant="outline"
                    onClick={() => setAddingDepreciation(false)}
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}

            {!isAddingDepreciation && (
              <Button onClick={() => setAddingDepreciation(true)}>
                새 감가상각 항목 추가
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>마케팅 비용 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {marketingCosts.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">
                    금액: {formatCurrency(item.amount)} | 기간: {item.months}개월
                    | 시작일: {item.startDate}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingMarketing(item)}
                  >
                    수정
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteMarketing(item.id)}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            ))}

            {isAddingMarketing && (
              <div className="space-y-2 p-4 border rounded">
                <Input
                  placeholder="항목 이름"
                  value={newMarketingCost.name}
                  onChange={e =>
                    updateNewMarketingCost({ name: e.target.value })
                  }
                />
                <Input
                  type="number"
                  placeholder="금액"
                  value={newMarketingCost.amount}
                  onChange={e =>
                    updateNewMarketingCost({
                      amount: Number(e.target.value),
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="기간 (개월)"
                  value={newMarketingCost.months}
                  onChange={e =>
                    updateNewMarketingCost({
                      months: Number(e.target.value),
                    })
                  }
                />
                <Input
                  type="date"
                  value={newMarketingCost.startDate}
                  onChange={e =>
                    updateNewMarketingCost({
                      startDate: e.target.value,
                    })
                  }
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddMarketing}>추가</Button>
                  <Button
                    variant="outline"
                    onClick={() => setAddingMarketing(false)}
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}

            {!isAddingMarketing && (
              <Button onClick={() => setAddingMarketing(true)}>
                새 마케팅 비용 추가
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 