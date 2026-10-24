import assert from 'node:assert/strict';
import { STARTER_BUDGET, suggestBudget } from '../src/lib/budget';
import { toMinor } from '../src/lib/money';

assert.equal(STARTER_BUDGET.reduce((sum, p) => sum + p.percent, 0), 100);
const plan = suggestBudget(toMinor('2000', 'USD'));
for (const [bucket, expected] of [['Needs', 100000n], ['Wants', 60000n], ['Savings & debt', 40000n]] as const) {
  assert.equal(plan.filter(p => p.bucket === bucket).reduce((s, p) => s + p.amount, 0n), expected);
}
for (const total of [0n, 1n, 99n, toMinor('100.01', 'USD'), toMinor('15000001', 'VND')]) {
  const result = suggestBudget(total);
  assert.equal(result.reduce((s, p) => s + p.amount, 0n), total, 'no money is lost to rounding');
  assert.ok(result.every(p => p.amount >= 0n));
}
assert.throws(() => suggestBudget(-1n));
console.log('PASS: starter budget percentages, exact allocations, zero income and VND rounding.');
