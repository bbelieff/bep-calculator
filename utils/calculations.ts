import { MenuItem, MenuCategory } from '@/types/menu';
import { DepreciationItem, MarketingCost } from '@/types/cost';

export const calculateTotalSales = (categories: MenuCategory[]): number => {
  return categories.reduce((total, category) => {
    return (
      total +
      category.items.reduce((categoryTotal, item) => {
        return categoryTotal + item.price * item.quantity;
      }, 0)
    );
  }, 0);
};

export const calculateTotalCosts = (categories: MenuCategory[]): number => {
  return categories.reduce((total, category) => {
    return (
      total +
      category.items.reduce((categoryTotal, item) => {
        return categoryTotal + item.cost * item.quantity;
      }, 0)
    );
  }, 0);
};

export const calculateMonthlyDepreciation = (
  items: DepreciationItem[]
): number => {
  return items.reduce((total, item) => {
    return total + item.amount / item.months;
  }, 0);
};

export const calculateMonthlyMarketingCosts = (
  items: MarketingCost[]
): number => {
  return items.reduce((total, item) => {
    return total + item.amount / item.months;
  }, 0);
};

export const calculateBreakEvenPoint = (
  totalSales: number,
  totalCosts: number,
  monthlyDepreciation: number,
  monthlyMarketingCosts: number
): number => {
  const contributionMargin = totalSales - totalCosts;
  if (contributionMargin <= 0) return 0;

  const fixedCosts = monthlyDepreciation + monthlyMarketingCosts;
  return fixedCosts / contributionMargin;
}; 