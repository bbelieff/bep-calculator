import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMenuManagement } from '@/hooks/useMenuManagement';
import { MenuItem, MenuCategory } from '@/types/menu';
import { formatCurrency } from '@/utils/formatters';

interface MenuManagementProps {
  categories: MenuCategory[];
  onCategoriesChange: (categories: MenuCategory[]) => void;
}

export const MenuManagement: React.FC<MenuManagementProps> = ({
  categories,
  onCategoriesChange,
}) => {
  const {
    newMenuItem,
    isAddingNewItem,
    selectedCategory,
    editingItem,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    setEditingItem,
    setAddingNewItem,
    setSelectedCategory,
    updateNewMenuItem,
  } = useMenuManagement(categories);

  const handleAddItem = () => {
    if (!newMenuItem.name || !newMenuItem.category) return;
    const item: MenuItem = {
      ...newMenuItem,
      id: crypto.randomUUID(),
    };
    addMenuItem(item);
    onCategoriesChange(categories);
  };

  const handleUpdateItem = (item: MenuItem) => {
    updateMenuItem(item);
    onCategoriesChange(categories);
  };

  const handleDeleteItem = (itemId: string, categoryId: string) => {
    deleteMenuItem(itemId, categoryId);
    onCategoriesChange(categories);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>메뉴 관리</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map(category => (
            <div key={category.id} className="space-y-2">
              <h3 className="text-lg font-semibold">{category.name}</h3>
              <div className="grid gap-2">
                {category.items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500">
                        가격: {formatCurrency(item.price)} | 원가:{' '}
                        {formatCurrency(item.cost)} | 수량: {item.quantity}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingItem(item)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id, category.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {isAddingNewItem && (
            <div className="space-y-2 p-4 border rounded">
              <Input
                placeholder="메뉴 이름"
                value={newMenuItem.name}
                onChange={e =>
                  updateNewMenuItem({ name: e.target.value })
                }
              />
              <Input
                type="number"
                placeholder="가격"
                value={newMenuItem.price}
                onChange={e =>
                  updateNewMenuItem({ price: Number(e.target.value) })
                }
              />
              <Input
                type="number"
                placeholder="원가"
                value={newMenuItem.cost}
                onChange={e =>
                  updateNewMenuItem({ cost: Number(e.target.value) })
                }
              />
              <Input
                type="number"
                placeholder="수량"
                value={newMenuItem.quantity}
                onChange={e =>
                  updateNewMenuItem({ quantity: Number(e.target.value) })
                }
              />
              <select
                value={newMenuItem.category}
                onChange={e =>
                  updateNewMenuItem({ category: e.target.value })
                }
                className="w-full p-2 border rounded"
              >
                <option value="">카테고리 선택</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button onClick={handleAddItem}>추가</Button>
                <Button
                  variant="outline"
                  onClick={() => setAddingNewItem(false)}
                >
                  취소
                </Button>
              </div>
            </div>
          )}

          {!isAddingNewItem && (
            <Button onClick={() => setAddingNewItem(true)}>
              새 메뉴 추가
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 