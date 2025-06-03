export interface MenuItem {
  id: string;
  name: string;
  price: number;
  cost: number;
  quantity: number;
  category: string;
  isNew: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface MenuState {
  categories: MenuCategory[];
  newMenuItem: MenuItem;
  isAddingNewItem: boolean;
  selectedCategory: string;
  editingItem: MenuItem | null;
} 