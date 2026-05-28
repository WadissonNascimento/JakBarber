import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeCreateTenantShopInput,
  normalizeTenantDomain,
  normalizeTenantSlug,
  SHOP_ADMIN_ROLE,
  WR_ADMIN_ROLE,
} from "@/lib/tenantProvisioning";
import { assertSafeDevTenantProvisioningEnvironment } from "@/lib/tenantProvisioningSafety";

test("tenant provisioning normalizes slug and domain safely", () => {
  assert.equal(normalizeTenantSlug("Barbearia Sao Joao!"), "barbearia-sao-joao");
  assert.equal(
    normalizeTenantDomain("https://www.nova-barbearia.com.br/admin?x=1"),
    "nova-barbearia.com.br"
  );
});

test("tenant provisioning rejects invalid domains", () => {
  assert.throws(() => normalizeTenantDomain("localhost:3000"));
  assert.throws(() => normalizeTenantDomain("https://bad_domain"));
});

test("tenant provisioning prepares an isolated SHOP_ADMIN tenant payload", () => {
  const normalized = normalizeCreateTenantShopInput({
    name: "Black Zone",
    primaryDomain: "www.blackzone.example.com",
    logoPath: "/uploads/black-zone/logo.webp",
    brandColor: "#22c55e",
    backgroundColor: "#050505",
    fontFamily: "serif",
    homeContent: {
      heroTitle: "Visual Black Zone",
      primaryButtonHref: "/agendar",
      showProducts: true,
      footerText: "Black Zone online.",
    },
    admin: {
      name: "Admin Black Zone",
      email: "ADMIN@BLACKZONE.EXAMPLE.COM",
      password: "Admin2026",
    },
    defaultServices: [
      {
        name: "Corte",
        price: 45,
        duration: 40,
      },
    ],
  });

  assert.equal(normalized.shopId, "shop_black_zone");
  assert.equal(normalized.shop.slug, "black-zone");
  assert.equal(normalized.shop.primaryDomain, "blackzone.example.com");
  assert.equal(normalized.shop.logoPath, "/uploads/black-zone/logo.webp");
  assert.equal(normalized.shop.brandColor, "#22c55e");
  assert.equal(normalized.shop.backgroundColor, "#050505");
  assert.equal(normalized.shop.fontFamily, "serif");
  assert.match(normalized.shop.brandColorStrong, /^#[0-9a-f]{6}$/);
  assert.equal(normalized.shop.brandColorMuted, "rgba(34, 197, 94, 0.18)");
  assert.equal(normalized.homeContent?.heroTitle, "Visual Black Zone");
  assert.equal(normalized.homeContent?.primaryButtonHref, "/agendar");
  assert.equal(normalized.homeContent?.showProducts, true);
  assert.equal(normalized.homeContent?.footerText, "Black Zone online.");
  assert.equal(normalized.admin.email, "admin@blackzone.example.com");
  assert.equal(normalized.defaultServices.length, 1);
  assert.equal(SHOP_ADMIN_ROLE, "SHOP_ADMIN");
  assert.equal(WR_ADMIN_ROLE, "WR_ADMIN");
});

test("tenant provisioning rejects unsafe branding assets and colors", () => {
  assert.throws(() =>
    normalizeCreateTenantShopInput({
      name: "Unsafe Brand",
      logoPath: "http://unsafe.example.com/logo.png",
      admin: {
        name: "Admin Unsafe",
        email: "admin@unsafe.example.com",
        password: "Admin2026",
      },
    })
  );

  assert.throws(() =>
    normalizeCreateTenantShopInput({
      name: "Bad Color",
      brandColor: "blue",
      admin: {
        name: "Admin Color",
        email: "admin@color.example.com",
        password: "Admin2026",
      },
    })
  );
});

test("tenant provisioning dev script blocks production-like environments", () => {
  assert.throws(() =>
    assertSafeDevTenantProvisioningEnvironment({
      env: {
        NODE_ENV: "production",
        TENANT_PROVISIONING_TARGET: "dev",
      },
      cwd: "C:\\Users\\wadis\\barbearia-app",
      execute: true,
      confirmedDevDb: true,
    })
  );

  assert.throws(() =>
    assertSafeDevTenantProvisioningEnvironment({
      env: {
        APP_URL: "https://jakbarbercompany.com",
        TENANT_PROVISIONING_TARGET: "dev",
      },
      cwd: "C:\\Users\\wadis\\barbearia-app",
      execute: true,
      confirmedDevDb: true,
    })
  );

  assert.throws(() =>
    assertSafeDevTenantProvisioningEnvironment({
      env: {
        TENANT_PROVISIONING_TARGET: "dev",
      },
      cwd: "/var/www/jakbarber",
      execute: true,
      confirmedDevDb: true,
    })
  );
});

test("tenant provisioning dev script requires explicit execution confirmation", () => {
  assert.doesNotThrow(() =>
    assertSafeDevTenantProvisioningEnvironment({
      env: {},
      cwd: "C:\\Users\\wadis\\barbearia-app",
      execute: false,
      confirmedDevDb: false,
    })
  );

  assert.throws(() =>
    assertSafeDevTenantProvisioningEnvironment({
      env: {},
      cwd: "C:\\Users\\wadis\\barbearia-app",
      execute: true,
      confirmedDevDb: true,
    })
  );

  assert.throws(() =>
    assertSafeDevTenantProvisioningEnvironment({
      env: {
        TENANT_PROVISIONING_TARGET: "dev",
      },
      cwd: "C:\\Users\\wadis\\barbearia-app",
      execute: true,
      confirmedDevDb: false,
    })
  );

  assert.doesNotThrow(() =>
    assertSafeDevTenantProvisioningEnvironment({
      env: {
        TENANT_PROVISIONING_TARGET: "dev",
      },
      cwd: "C:\\Users\\wadis\\barbearia-app",
      execute: true,
      confirmedDevDb: true,
    })
  );
});
