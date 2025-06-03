import { useState, useCallback } from 'react';
import { DepreciationItem, MarketingCost, CostState } from '../types/cost';

const initialNewDepreciationItem: DepreciationItem = {
  id: '',
  name: '',
  amount: 0,
  months: 0,
  startDate: new Date().toISOString().split('T')[0],
};

const initialNewMarketingCost: MarketingCost = {
  id: '',
  name: '',
  amount: 0,
  months: 0,
  startDate: new Date().toISOString().split('T')[0],
};

export const useCostManagement = (
  initialDepreciationItems: DepreciationItem[] = [],
  initialMarketingCosts: MarketingCost[] = []
) => {
  const [state, setState] = useState<CostState>({
    depreciationItems: initialDepreciationItems,
    marketingCosts: initialMarketingCosts,
    newDepreciationItem: initialNewDepreciationItem,
    newMarketingCost: initialNewMarketingCost,
    isAddingDepreciation: false,
    isAddingMarketing: false,
    editingDepreciation: null,
    editingMarketing: null,
  });

  const addDepreciationItem = useCallback((item: DepreciationItem) => {
    setState(prev => ({
      ...prev,
      depreciationItems: [...prev.depreciationItems, item],
      isAddingDepreciation: false,
      newDepreciationItem: initialNewDepreciationItem,
    }));
  }, []);

  const updateDepreciationItem = useCallback((item: DepreciationItem) => {
    setState(prev => ({
      ...prev,
      depreciationItems: prev.depreciationItems.map(i =>
        i.id === item.id ? item : i
      ),
      editingDepreciation: null,
    }));
  }, []);

  const deleteDepreciationItem = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      depreciationItems: prev.depreciationItems.filter(item => item.id !== id),
    }));
  }, []);

  const addMarketingCost = useCallback((item: MarketingCost) => {
    setState(prev => ({
      ...prev,
      marketingCosts: [...prev.marketingCosts, item],
      isAddingMarketing: false,
      newMarketingCost: initialNewMarketingCost,
    }));
  }, []);

  const updateMarketingCost = useCallback((item: MarketingCost) => {
    setState(prev => ({
      ...prev,
      marketingCosts: prev.marketingCosts.map(i =>
        i.id === item.id ? item : i
      ),
      editingMarketing: null,
    }));
  }, []);

  const deleteMarketingCost = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      marketingCosts: prev.marketingCosts.filter(item => item.id !== id),
    }));
  }, []);

  const setEditingDepreciation = useCallback((item: DepreciationItem | null) => {
    setState(prev => ({ ...prev, editingDepreciation: item }));
  }, []);

  const setEditingMarketing = useCallback((item: MarketingCost | null) => {
    setState(prev => ({ ...prev, editingMarketing: item }));
  }, []);

  const setAddingDepreciation = useCallback((isAdding: boolean) => {
    setState(prev => ({ ...prev, isAddingDepreciation: isAdding }));
  }, []);

  const setAddingMarketing = useCallback((isAdding: boolean) => {
    setState(prev => ({ ...prev, isAddingMarketing: isAdding }));
  }, []);

  const updateNewDepreciationItem = useCallback(
    (updates: Partial<DepreciationItem>) => {
      setState(prev => ({
        ...prev,
        newDepreciationItem: { ...prev.newDepreciationItem, ...updates },
      }));
    },
    []
  );

  const updateNewMarketingCost = useCallback(
    (updates: Partial<MarketingCost>) => {
      setState(prev => ({
        ...prev,
        newMarketingCost: { ...prev.newMarketingCost, ...updates },
      }));
    },
    []
  );

  return {
    ...state,
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
  };
}; 