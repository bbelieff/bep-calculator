import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DepreciationItem, MarketingCost } from '@/types/cost';
import { formatCurrency } from '@/utils/formatters';

interface CostManagementProps {
  depreciationItems: DepreciationItem[];
  marketingCosts: MarketingCost[];
  onDepreciationItemsChange: (items: DepreciationItem[]) => void;
  onMarketingCostsChange: (costs: MarketingCost[]) => void;
  newDepreciationItem: DepreciationItem;
  newMarketingCost: MarketingCost;
  isAddingDepreciation: boolean;
  isAddingMarketing: boolean;
  editingDepreciation: DepreciationItem | null;
  editingMarketing: MarketingCost | null;
  setNewDepreciationItem: (item: Partial<DepreciationItem>) => void;
  setNewMarketingCost: (item: Partial<MarketingCost>) => void;
  setIsAddingDepreciation: (isAdding: boolean) => void;
  setIsAddingMarketing: (isAdding: boolean) => void;
  setEditingDepreciation: (item: DepreciationItem | null) => void;
  setEditingMarketing: (item: MarketingCost | null) => void;
}

export const CostManagement: React.FC<CostManagementProps> = ({
  depreciationItems,
  marketingCosts,
  onDepreciationItemsChange,
  onMarketingCostsChange,
  newDepreciationItem,
  newMarketingCost,
  isAddingDepreciation,
  isAddingMarketing,
  editingDepreciation,
  editingMarketing,
  setNewDepreciationItem,
  setNewMarketingCost,
  setIsAddingDepreciation,
  setIsAddingMarketing,
  setEditingDepreciation,
  setEditingMarketing,
}) => {
  const handleAddDepreciation = () => {
    if (!newDepreciationItem.name) return;
    const item: DepreciationItem = {
      ...newDepreciationItem,
      id: crypto.randomUUID(),
    };
    onDepreciationItemsChange([...depreciationItems, item]);
    setIsAddingDepreciation(false);
    setNewDepreciationItem({ name: '', amount: 0, months: 0, startDate: new Date().toISOString().split('T')[0] });
  };

  const handleDeleteDepreciation = (id: string) => {
    onDepreciationItemsChange(depreciationItems.filter(item => item.id !== id));
  };

  const handleAddMarketing = () => {
    if (!newMarketingCost.name) return;
    const item: MarketingCost = {
      ...newMarketingCost,
      id: crypto.randomUUID(),
    };
    onMarketingCostsChange([...marketingCosts, item]);
    setIsAddingMarketing(false);
    setNewMarketingCost({ name: '', amount: 0, months: 0, startDate: new Date().toISOString().split('T')[0] });
  };

  const handleDeleteMarketing = (id: string) => {
    onMarketingCostsChange(marketingCosts.filter(item => item.id !== id));
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
                  onChange={e => setNewDepreciationItem({ name: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="금액"
                  value={newDepreciationItem.amount}
                  onChange={e => setNewDepreciationItem({ amount: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  placeholder="기간 (개월)"
                  value={newDepreciationItem.months}
                  onChange={e => setNewDepreciationItem({ months: Number(e.target.value) })}
                />
                <Input
                  type="date"
                  value={newDepreciationItem.startDate}
                  onChange={e => setNewDepreciationItem({ startDate: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddDepreciation}>추가</Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddingDepreciation(false)}
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}

            {!isAddingDepreciation && (
              <Button onClick={() => setIsAddingDepreciation(true)}>
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
                  onChange={e => setNewMarketingCost({ name: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="금액"
                  value={newMarketingCost.amount}
                  onChange={e => setNewMarketingCost({ amount: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  placeholder="기간 (개월)"
                  value={newMarketingCost.months}
                  onChange={e => setNewMarketingCost({ months: Number(e.target.value) })}
                />
                <Input
                  type="date"
                  value={newMarketingCost.startDate}
                  onChange={e => setNewMarketingCost({ startDate: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddMarketing}>추가</Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddingMarketing(false)}
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}

            {!isAddingMarketing && (
              <Button onClick={() => setIsAddingMarketing(true)}>
                새 마케팅 비용 추가
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 