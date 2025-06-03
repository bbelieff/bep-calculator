export const DEFAULT_FIXED_CATEGORIES = [
  { key: "storeRent", label: "매장월세", removable: false },
  { key: "depreciation", label: "감가상각비 (자동반영)", removable: false },
  { key: "laborCost", label: "인건비", removable: false },
  { key: "retirementFund", label: "퇴직적립금 (실제적립액)", removable: true },
  { key: "insurance", label: "4대보험 등 (실제납부액)", removable: true },
  { key: "communication", label: "통신비 (전화, 인터넷)", removable: true },
  { key: "rentalFees", label: "렌탈료 (정수기, 음식물처리기 등)", removable: true },
  { key: "professionalServices", label: "전문가 비용 (세무 등)", removable: true },
  { key: "taxes", label: "기타 세금 및 공과금", removable: true },
  { key: "welfare", label: "복리후생비", removable: true },
  { key: "posRental", label: "포스기임대료", removable: true },
  { key: "security", label: "보안업체이용료", removable: true },
  { key: "pest", label: "방역/위생", removable: true },
  { key: "loanInterest", label: "대출이자", removable: true },
  { key: "advertising", label: "월 광고비 (마케팅비용과 별도)", removable: true },
]

export const DEFAULT_VARIABLE_CATEGORIES = [
  { key: "ingredients", label: "식재료비 (일일매출 자동반영)", removable: false, isCalculated: true },
  { key: "electricity", label: "전기요금", removable: true },
  { key: "gas", label: "가스요금", removable: true },
  { key: "water", label: "수도요금", removable: true },
  { key: "cardFees", label: "카드수수료 (자동반영)", removable: false, isCardFee: true },
  { key: "employeeBonus", label: "정직원 추가수당", removable: true },
  { key: "partTime", label: "단기알바", removable: true },
  { key: "vatWithheld", label: "부가세 예수금 (매출 자동반영)", removable: false, isCalculated: true },
]

export const DISCOUNT_APPLICABLE_DAYS = ["월", "화", "수", "목", "금", "토", "일"]

export const SPECIFIC_CARD_FEES = [
  { id: "shinhan", name: "신한카드", feeRate: 0, salesAmount: 0, calculatedFee: 0 },
  { id: "kb", name: "KB국민카드", feeRate: 0, salesAmount: 0, calculatedFee: 0 },
  { id: "samsung", name: "삼성카드", feeRate: 0, salesAmount: 0, calculatedFee: 0 },
  { id: "hyundai", name: "현대카드", feeRate: 0, salesAmount: 0, calculatedFee: 0 },
  { id: "lotte", name: "롯데카드", feeRate: 0, salesAmount: 0, calculatedFee: 0 },
  { id: "woori", name: "우리카드", feeRate: 0, salesAmount: 0, calculatedFee: 0 },
  { id: "hana", name: "하나카드", feeRate: 0, salesAmount: 0, calculatedFee: 0 },
  { id: "bc", name: "BC카드", feeRate: 0, salesAmount: 0, calculatedFee: 0 },
] 