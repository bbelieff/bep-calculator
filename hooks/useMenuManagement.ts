import { useState, useCallback } from 'react';
import { MenuItem, MenuCategory, MenuState } from '../types/menu';

const initialNewMenuItem: MenuItem = {
  id: '',
  name: '',
  price: 0,
  cost: 0,
  quantity: 0,
  category: '',
  isNew: true,
};

export const useMenuManagement = (initialCategories: MenuCategory[] = []) => {
  const [state, setState] = useState<MenuState>({
    categories: initialCategories,
    newMenuItem: initialNewMenuItem,
    isAddingNewItem: false,
    selectedCategory: '',
    editingItem: null,
  });

  const addMenuItem = useCallback((item: MenuItem) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(category =>
        category.id === item.category
          ? { ...category, items: [...category.items, item] }
          : category
      ),
      isAddingNewItem: false,
      newMenuItem: initialNewMenuItem,
    }));
  }, []);

  const updateMenuItem = useCallback((item: MenuItem) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(category =>
        category.id === item.category
          ? {
              ...category,
              items: category.items.map(i =>
                i.id === item.id ? item : i
              ),
            }
          : category
      ),
      editingItem: null,
    }));
  }, []);

  const deleteMenuItem = useCallback((itemId: string, categoryId: string) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(category =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.filter(item => item.id !== itemId),
            }
          : category
      ),
    }));
  }, []);

  const setEditingItem = useCallback((item: MenuItem | null) => {
    setState(prev => ({ ...prev, editingItem: item }));
  }, []);

  const setAddingNewItem = useCallback((isAdding: boolean) => {
    setState(prev => ({ ...prev, isAddingNewItem: isAdding }));
  }, []);

  const setSelectedCategory = useCallback((categoryId: string) => {
    setState(prev => ({ ...prev, selectedCategory: categoryId }));
  }, []);

  const updateNewMenuItem = useCallback((updates: Partial<MenuItem>) => {
    setState(prev => ({
      ...prev,
      newMenuItem: { ...prev.newMenuItem, ...updates },
    }));
  }, []);

  return {
    ...state,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    setEditingItem,
    setAddingNewItem,
    setSelectedCategory,
    updateNewMenuItem,
  };
}; 