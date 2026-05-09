import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260508170000_enable_supabase_rls",
  "migration.sql"
);

const migrationSql = readFileSync(migrationPath, "utf8");

const protectedTables = [
  "Shop",
  "User",
  "Account",
  "Session",
  "VerificationToken",
  "PendingRegistration",
  "PasswordResetRequest",
  "Service",
  "Appointment",
  "AppointmentService",
  "Review",
  "BarberAvailability",
  "BarberBlock",
  "RecurringBarberBlock",
  "ClientNote",
  "CustomerProfile",
  "Product",
  "BarberServiceCommission",
  "ExtraProduct",
  "AppointmentItem",
  "Order",
  "OrderItem",
  "Coupon",
  "StockMovement",
  "ExtraStockMovement",
  "BarberPayout",
];

test("RLS migration enables row security for every application table", () => {
  for (const table of protectedTables) {
    assert.match(migrationSql, new RegExp(`'${table}'`));
  }

  assert.match(migrationSql, /ENABLE ROW LEVEL SECURITY/);
});

test("RLS migration denies anonymous table access and does not expose password hashes", () => {
  assert.match(migrationSql, /REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon/);
  assert.doesNotMatch(migrationSql, /GRANT SELECT[\s\S]*passwordHash/);
});

test("RLS migration defines tenant, customer, barber, and admin policies", () => {
  assert.match(migrationSql, /app_is_admin/);
  assert.match(migrationSql, /app_is_barber/);
  assert.match(migrationSql, /"customerId" = public\.app_user_id\(\)/);
  assert.match(migrationSql, /"barberId" = public\.app_user_id\(\)/);
  assert.match(migrationSql, /"shopId" = public\.app_shop_id\(\)/);
});
