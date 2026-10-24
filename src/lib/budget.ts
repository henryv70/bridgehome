// The 50/30/20 framework is conventional; this category split is an editable starting point.
export const STARTER_BUDGET = [
  { category: 'Housing', percent: 20, bucket: 'Needs' },
  { category: 'Groceries', percent: 15, bucket: 'Needs' },
  { category: 'Utilities', percent: 5, bucket: 'Needs' },
  { category: 'Transport', percent: 5, bucket: 'Needs' },
  { category: 'Health', percent: 5, bucket: 'Needs' },
  { category: 'Personal', percent: 20, bucket: 'Wants' },
  { category: 'Celebration', percent: 10, bucket: 'Wants' },
  { category: 'Savings', percent: 20, bucket: 'Savings & debt' },
] as const;

export const INCOME_CATEGORIES = ['Salary', 'Family support', 'Benefits', 'Business', 'Other income'];

export function suggestBudget(income: bigint) {
  if (income < 0n) throw Error('Income must not be negative.');
  let remaining = income;
  return STARTER_BUDGET.map((item, i) => {
    // Keep every minor unit, including for zero-decimal currencies such as VND.
    const amount = i === STARTER_BUDGET.length - 1 ? remaining : income * BigInt(item.percent) / 100n;
    remaining -= amount;
    return { ...item, amount };
  });
}
