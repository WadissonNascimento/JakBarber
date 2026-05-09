import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("customer booking endpoint binds created appointments to the authenticated user", () => {
  const route = read("app/api/booking/appointments/route.ts");

  assert.match(route, /session\.user\.role !== "CUSTOMER"/);
  assert.match(route, /scope:\s*"booking:create"/);
  assert.match(route, /customerId:\s*session\.user\.id/);
  assert.doesNotMatch(route, /customerId:\s*body\.customerId/);
});

test("customer appointment actions reject manipulated appointment ids", () => {
  const actions = read("app/customer/agendamentos/actions.ts");

  assert.match(actions, /appointment\.customerId !== session\.user\.id/);
  assert.match(actions, /idor_blocked/);
  assert.match(actions, /scope:\s*"review:create"/);
});

test("barber actions use the authenticated barber id instead of trusting form ids", () => {
  const actions = read("app/barber/actions.ts");

  assert.match(actions, /const barber = await requireBarber\(\)/);
  assert.match(actions, /barberId:\s*barber\.id/);
  assert.match(actions, /Cliente selecionado nao pertence a sua base/);
  assert.match(actions, /Cliente nao vinculado a este barbeiro/);
});

test("admin-only pages and export routes enforce admin role", () => {
  for (const file of [
    "app/admin/page.tsx",
    "app/admin/financeiro/page.tsx",
    "app/admin/agenda/export/route.ts",
    "app/admin/pedidos/export/route.ts",
  ]) {
    assert.match(read(file), /role !== "ADMIN"/, file);
  }
});

test("service role storage helpers are server-only and not imported from client components", () => {
  assert.match(read("lib/productImages.ts"), /import "server-only"/);
  assert.match(read("lib/extraProductImages.ts"), /import "server-only"/);

  const clientFiles = [
    "app/admin/produtos/ProductCardClient.tsx",
    "app/admin/produtos/novo/NewProductForm.tsx",
    "app/admin/extras/AdminExtrasClient.tsx",
    "app/admin/extras/ExtraProductCardClient.tsx",
  ];

  for (const file of clientFiles) {
    const contents = read(file);
    assert.doesNotMatch(contents, /SUPABASE_SERVICE_ROLE_KEY/, file);
    assert.doesNotMatch(contents, /@\/lib\/productImages|@\/lib\/extraProductImages/, file);
  }
});

test("rate limit can use a persistent hashed database bucket in production", () => {
  const security = read("lib/security.ts");
  const schema = read("prisma/schema.prisma");

  assert.match(security, /RATE_LIMIT_STORE/);
  assert.match(security, /createHash\("sha256"\)/);
  assert.match(security, /RateLimitBucket/);
  assert.doesNotMatch(security, /identifier.*RateLimitBucket/);
  assert.match(schema, /model RateLimitBucket/);
  assert.match(schema, /keyHash\s+String\s+@unique/);
});

test("shop scoped prisma queries do not continue unscoped when shop lookup fails", () => {
  const prisma = read("lib/prisma.ts");

  assert.match(prisma, /DEFAULT_SHOP_ID/);
  assert.doesNotMatch(prisma, /if \(!shopId\) {\s*return query\(args\);/);
});
