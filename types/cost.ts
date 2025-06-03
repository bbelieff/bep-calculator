export interface DepreciationItem {
  id: string;
  name: string;
  amount: number;
  months: number;
  startDate: string;
}

export interface MarketingCost {
  id: string;
  name: string;
  amount: number;
  months: number;
  startDate: string;
}

export interface CostState {
  depreciationItems: DepreciationItem[];
  marketingCosts: MarketingCost[];
  newDepreciationItem: DepreciationItem;
  newMarketingCost: MarketingCost;
  isAddingDepreciation: boolean;
  isAddingMarketing: boolean;
  editingDepreciation: DepreciationItem | null;
  editingMarketing: MarketingCost | null;
} 