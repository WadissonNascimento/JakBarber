import assert from "node:assert/strict";
import test from "node:test";
import { getFortnightRange, getMonthRange, getWeekRange } from "@/lib/financials";
import { resolveFinanceRange } from "@/lib/financeReports";

test("week range uses the current Monday through Sunday", () => {
  const { start, end } = getWeekRange(new Date("2026-04-10T12:00:00-03:00"));

  assert.equal(start.toLocaleDateString("pt-BR"), "06/04/2026");
  assert.equal(end.toLocaleDateString("pt-BR"), "12/04/2026");
});

test("month range keeps the full current month", () => {
  const { start, end } = getMonthRange(new Date("2026-04-10T12:00:00-03:00"));

  assert.equal(start.toLocaleDateString("pt-BR"), "01/04/2026");
  assert.equal(end.toLocaleDateString("pt-BR"), "30/04/2026");
});

test("fortnight range uses the first or second half of the current month", () => {
  const first = getFortnightRange(new Date("2026-06-10T12:00:00-03:00"));
  const secondThirty = getFortnightRange(new Date("2026-06-28T12:00:00-03:00"));
  const secondThirtyOne = getFortnightRange(new Date("2026-07-28T12:00:00-03:00"));

  assert.equal(first.start.toLocaleDateString("pt-BR"), "01/06/2026");
  assert.equal(first.end.toLocaleDateString("pt-BR"), "15/06/2026");
  assert.equal(secondThirty.start.toLocaleDateString("pt-BR"), "16/06/2026");
  assert.equal(secondThirty.end.toLocaleDateString("pt-BR"), "30/06/2026");
  assert.equal(secondThirtyOne.start.toLocaleDateString("pt-BR"), "16/07/2026");
  assert.equal(secondThirtyOne.end.toLocaleDateString("pt-BR"), "31/07/2026");
});

test("finance range defaults to fortnight when period is omitted", () => {
  const range = resolveFinanceRange({});
  const daysInRange =
    (range.end.getTime() - range.start.getTime() + 1) / (1000 * 60 * 60 * 24);

  assert.equal(range.period, "fortnight");
  assert.ok(daysInRange >= 13 && daysInRange <= 16);
});
