import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("customer booking endpoint binds created appointments to the authenticated user", () => {
  const route = read("app/api/booking/appointments/route.ts");

  assert.match(route, /getTenantSession\(\{\s*roles:\s*CUSTOMER_ROLES/s);
  assert.match(route, /scope:\s*"booking:create"/);
  assert.match(route, /customerId:\s*session\.user\.id/);
  assert.doesNotMatch(route, /customerId:\s*body\.customerId/);
});

test("customer reschedule flow validates ownership before freeing the old slot", () => {
  const appointmentsRoute = read("app/api/booking/appointments/route.ts");
  const availabilityRoute = read("app/api/booking/availability/route.ts");

  assert.match(appointmentsRoute, /rescheduleAppointmentId/);
  assert.match(appointmentsRoute, /customerId:\s*session\.user\.id/);
  assert.match(availabilityRoute, /appointment\.customerId !== session\.user\.id/);
  assert.match(availabilityRoute, /idor_blocked/);
  assert.match(availabilityRoute, /excludeAppointmentId:\s*rescheduleAppointmentId/);
});

test("customer appointment actions reject manipulated appointment ids", () => {
  const actions = read("app/customer/agendamentos/actions.ts");

  assert.match(actions, /appointment\.customerId !== session\.user\.id/);
  assert.match(actions, /idor_blocked/);
  assert.match(actions, /scope:\s*"review:create"/);
});

test("customer profile email changes require code verification and do not verify phones", () => {
  const actions = read("app/meu-perfil/actions.ts");
  const form = read("app/meu-perfil/ProfileForm.tsx");
  const schema = read("prisma/schema.prisma");

  assert.match(actions, /isValidCustomerFullName\(name\)/);
  assert.match(actions, /emailChangeRequest\.create/);
  assert.match(actions, /sendVerificationCodeEmail/);
  assert.match(actions, /verifyCustomerEmailChangeAction/);
  assert.match(actions, /emailVerified:\s*new Date\(\)/);
  assert.doesNotMatch(actions, /emailVerified:\s*null/);
  assert.match(form, /verifyCustomerEmailChangeAction/);
  assert.match(form, /nao precisa de verificacao por SMS/);
  assert.match(schema, /model EmailChangeRequest/);
});

test("barber actions use the authenticated barber id instead of trusting form ids", () => {
  const actions = read("app/barber/actions.ts");

  assert.match(actions, /const barber = await requireBarber\(\)/);
  assert.match(actions, /barberId:\s*barber\.id/);
  assert.match(actions, /Cliente selecionado nao pertence a sua base/);
  assert.match(actions, /Cliente nao vinculado a este barbeiro/);
});

test("barber tip action stores tips only for the authenticated barber", () => {
  const actions = read("app/barber/caixinhas/actions.ts");
  const schema = read("prisma/schema.prisma");
  const adminActions = read("app/admin/caixinhas/actions.ts");

  assert.match(actions, /const \{ session, barber \} = await requireActiveBarber\(\)/);
  assert.match(actions, /barberId:\s*barber\.id/);
  assert.doesNotMatch(actions, /barberId:\s*formData\.get/);
  assert.match(actions, /scope:\s*"barber_tip:create"/);
  assert.match(schema, /model BarberTip/);
  assert.match(schema, /amount\s+Decimal\s+@db\.Decimal\(12, 2\)/);
  assert.match(adminActions, /groupBy\(\{/);
  assert.match(adminActions, /skip:\s*\(safePage - 1\) \* DETAIL_PAGE_SIZE/);
});

test("admin-only pages and export routes enforce admin role", () => {
  const proxy = read("proxy.ts");
  const layout = read("app/layout.tsx");
  const header = read("components/Header.tsx");

  assert.match(proxy, /SHOP_ADMIN_ROLES = \["ADMIN", "SHOP_ADMIN"\]/);
  assert.match(proxy, /isShopAdminRole\(role\)/);
  assert.match(layout, /session\?\.user\?\.role === "SHOP_ADMIN"/);
  assert.match(header, /role === "ADMIN" \|\| role === "SHOP_ADMIN"/);

  for (const file of [
    "app/admin/page.tsx",
    "app/admin/financeiro/page.tsx",
    "app/admin/agenda/export/route.ts",
    "app/admin/caixinhas/page.tsx",
  ]) {
    assert.match(read(file), /roles:\s*SHOP_ADMIN_ROLES/, file);
  }
});

test("wr platform pages require WR_ADMIN and use safe tenant provisioning", () => {
  const auth = read("auth.ts");
  const proxy = read("proxy.ts");
  const redirect = read("lib/authRedirect.ts");
  const wrSession = read("lib/wrSession.ts");
  const createRoute = read("app/wr/tenants/novo/submit/route.ts");
  const createPage = read("app/wr/tenants/novo/page.tsx");
  const createForm = read("app/wr/tenants/novo/NewTenantForm.tsx");
  const appChrome = read("components/AppChrome.tsx");
  const loginSubmit = read("app/login/submit/route.ts");
  const adminLoginSubmit = read("app/admin/login/submit/route.ts");

  assert.match(auth, /isWrTechAppHost\(host\)/);
  assert.match(auth, /isExplicitWrCredentials/);
  assert.match(auth, /basePrisma\.user\.findFirst/);
  assert.match(auth, /path === "\/wr\/login\/submit"/);
  assert.match(auth, /role:\s*"WR_ADMIN"/);
  assert.match(auth, /scope:\s*"wr_auth:credentials"/);
  assert.match(auth, /user\.role === "WR_ADMIN"/);
  assert.match(proxy, /isWrTechAppHostRequest && !pathname\.startsWith\("\/wr"\)/);
  assert.match(proxy, /pathname\.startsWith\("\/wr"\).*role !== "WR_ADMIN"/s);
  assert.match(proxy, /"\/wr\/:path\*"/);
  assert.match(redirect, /role === "WR_ADMIN"[\s\S]*return "\/wr"/);
  assert.match(wrSession, /WR_ADMIN_ROLES = \["WR_ADMIN"\]/);
  assert.match(wrSession, /WR_TENANT_CREATION_ENABLED === "1"/);
  assert.match(createRoute, /requireWrAdminSession\(\)/);
  assert.match(createRoute, /isWrTenantCreationEnabled\(\)/);
  assert.match(createRoute, /createTenantShop\(/);
  assert.match(createRoute, /logoPath:\s*getOptionalString\(formData, "logoPath"\)/);
  assert.match(createRoute, /brandColor:\s*getOptionalString\(formData, "brandColor"\)/);
  assert.match(createRoute, /x-wr-fetch/);
  assert.match(createRoute, /redirectTo:\s*"\/wr\/tenants"/);
  assert.doesNotMatch(createRoute, /basePrisma\.shop\.create/);
  assert.doesNotMatch(createRoute, /role:\s*"ADMIN"/);
  assert.match(createPage, /<NewTenantForm/);
  assert.match(createForm, /"use client"/);
  assert.match(createForm, /router\.replace\(body\.redirectTo/);
  assert.match(createForm, /setIsSubmitting\(true\)/);
  assert.match(createForm, /Criando\.\.\./);
  assert.match(createForm, /name="logoPath"/);
  assert.match(createForm, /name="brandColor"/);
  assert.match(createForm, /Preview/);

  const wrLoginSubmit = read("app/wr/login/submit/route.ts");
  assert.match(wrLoginSubmit, /wrLogin:\s*"1"/);
  assert.match(wrLoginSubmit, /NextResponse\.json\(\{ ok: true, redirectTo: "\/wr" \}/);
  assert.match(appChrome, /pathname === "\/wr" \|\| pathname\.startsWith\("\/wr\/"\)/);
  assert.match(loginSubmit, /isWrTechAppRequest\(\)/);
  assert.match(loginSubmit, /role:\s*"WR_ADMIN"/);
  assert.match(adminLoginSubmit, /isWrTechAppRequest\(\)/);
});

test("custom domain readiness is read-only and visible only in WR tenant tooling", () => {
  const domainReadiness = read("lib/domainReadiness.ts");
  const tenantsPage = read("app/wr/tenants/page.tsx");
  const domainAllow = read("app/api/domain-allow/route.ts");
  const domainScript = read("scripts/check-domain-readiness.ts");
  const domainActivateScript = read("scripts/activate-custom-domain.ts");
  const domainActivation = read("lib/domainActivation.ts");
  const domainActivationRoute = read("app/wr/tenants/[shopId]/domain/activate/route.ts");
  const customDomainDocs = read("docs/custom-domains.md");
  const packageJson = read("package.json");
  const shop = read("lib/shop.ts");

  assert.match(domainReadiness, /resolve4/);
  assert.match(domainReadiness, /DOMAIN_EXPECTED_IPV4S/);
  assert.match(domainReadiness, /DEFAULT_EXPECTED_IPV4S = \["2\.24\.65\.212"\]/);
  assert.match(domainReadiness, /isLocalOrReservedDomain/);
  assert.match(domainReadiness, /DNS aponta fora/);
  assert.doesNotMatch(domainReadiness, /basePrisma\./);
  assert.doesNotMatch(domainReadiness, /shop\.update|shop\.create|user\.create/);

  assert.match(tenantsPage, /getDomainReadiness/);
  assert.match(tenantsPage, /getDomainActivationStatus/);
  assert.match(tenantsPage, /domainReadiness\.label/);
  assert.match(tenantsPage, /domainActivation\.label/);
  assert.match(tenantsPage, /Ativar SSL/);

  assert.match(shop, /export function getDomainCandidates/);
  assert.match(domainAllow, /basePrisma\.shop\.findFirst/);
  assert.match(domainAllow, /isActive:\s*true/);
  assert.match(domainAllow, /getDomainCandidates\(domain\)/);
  assert.match(domainAllow, /isLocalOrReservedDomain\(domain\)/);
  assert.match(domainAllow, /isWrTechAppHost\(domain\)/);
  assert.doesNotMatch(domainAllow, /basePrisma\.[a-zA-Z]+\.(create|update|delete|upsert)/);

  assert.match(domainScript, /mode:\s*"read_only"/);
  assert.match(domainScript, /basePrisma\.shop\.findFirst/);
  assert.doesNotMatch(domainScript, /basePrisma\.shop\.(create|update|delete)/);
  assert.doesNotMatch(domainScript, /certbot|nginx|systemctl|pm2 restart/);
  assert.match(domainActivateScript, /DOMAIN_ACTIVATION_ENABLED !== "1"/);
  assert.match(domainActivateScript, /args\.execute === true/);
  assert.match(domainActivateScript, /assertDomainAllowed\(domain\)/);
  assert.match(domainActivateScript, /getDomainReadiness\(domain\)/);
  assert.match(domainActivateScript, /readiness\.status !== "ready"/);
  assert.match(domainActivateScript, /certbot/);
  assert.match(domainActivateScript, /nginx/);
  assert.match(domainActivateScript, /systemctl/);
  assert.doesNotMatch(domainActivateScript, /basePrisma\.[a-zA-Z]+\.(create|update|delete|upsert)/);
  assert.match(domainActivation, /import "server-only"/);
  assert.match(domainActivation, /WR_DOMAIN_ACTIVATION_ENABLED === "1"/);
  assert.match(domainActivation, /DOMAIN_ACTIVATION_ENABLED: "1"/);
  assert.match(domainActivation, /npm/);
  assert.match(domainActivation, /domain:activate/);
  assert.match(domainActivation, /getDomainReadiness\(normalizedDomain\)/);
  assert.match(domainActivation, /findExistingNginxConfigForDomain/);
  assert.doesNotMatch(domainActivation, /basePrisma\./);
  assert.match(domainActivationRoute, /requireWrAdminSession\(\)/);
  assert.match(domainActivationRoute, /basePrisma\.shop\.findFirst/);
  assert.match(domainActivationRoute, /isActive:\s*true/);
  assert.match(domainActivationRoute, /activateCustomDomainFromPanel\(shop\.primaryDomain\)/);
  assert.doesNotMatch(domainActivationRoute, /basePrisma\.[a-zA-Z]+\.(create|update|delete|upsert)/);
  assert.match(customDomainDocs, /\/api\/domain-allow/);
  assert.match(customDomainDocs, /server_name _/);
  assert.match(customDomainDocs, /proxy_set_header Host \$host/);
  assert.match(customDomainDocs, /domain:activate/);
  assert.match(customDomainDocs, /WR_DOMAIN_ACTIVATION_ENABLED=1/);
  assert.match(packageJson, /"domain:check"/);
  assert.match(packageJson, /"domain:activate"/);
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
