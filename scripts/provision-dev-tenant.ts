import "dotenv/config";
import { basePrisma } from "@/lib/prisma-core";
import {
  createTenantShop,
  normalizeCreateTenantShopInput,
  type CreateTenantShopInput,
} from "@/lib/tenantProvisioning";
import { assertSafeDevTenantProvisioningEnvironment } from "@/lib/tenantProvisioningSafety";

type CliArgs = Record<string, string | true>;

function parseArgs(argv: string[]) {
  const parsed: CliArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const nextValue = argv[index + 1];

    if (inlineValue !== undefined) {
      parsed[rawKey] = inlineValue;
    } else if (nextValue && !nextValue.startsWith("--")) {
      parsed[rawKey] = nextValue;
      index += 1;
    } else {
      parsed[rawKey] = true;
    }
  }

  return parsed;
}

function requiredString(args: CliArgs, key: string) {
  const value = args[key];

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Argumento obrigatorio ausente: --${key}`);
  }

  return value.trim();
}

function optionalString(args: CliArgs, key: string) {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberArg(args: CliArgs, key: string, fallback: number) {
  const value = args[key];

  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Argumento numerico invalido: --${key}`);
  }

  return parsed;
}

function buildInput(args: CliArgs): CreateTenantShopInput {
  const adminPassword =
    optionalString(args, "admin-password") || process.env.TENANT_ADMIN_PASSWORD || "";

  return {
    name: requiredString(args, "name"),
    slug: optionalString(args, "slug"),
    primaryDomain: optionalString(args, "domain"),
    metadataTitle: optionalString(args, "metadata-title"),
    metadataDescription: optionalString(args, "metadata-description"),
    whatsappNumber: optionalString(args, "whatsapp"),
    instagramUrl: optionalString(args, "instagram"),
    addressLine: optionalString(args, "address"),
    businessHours: optionalString(args, "business-hours"),
    admin: {
      name: requiredString(args, "admin-name"),
      email: requiredString(args, "admin-email"),
      password: adminPassword,
      phone: optionalString(args, "admin-phone"),
    },
    defaultServices:
      args["with-default-service"] === true
        ? [
            {
              name: "Corte",
              price: numberArg(args, "default-service-price", 45),
              duration: numberArg(args, "default-service-duration", 40),
              commissionType: "PERCENT",
              commissionValue: numberArg(args, "default-service-commission", 40),
            },
          ]
        : [],
  };
}

function printDryRunSummary(input: CreateTenantShopInput) {
  const normalized = normalizeCreateTenantShopInput(input);

  console.info(
    JSON.stringify(
      {
        mode: "dry-run",
        shopId: normalized.shopId,
        slug: normalized.shop.slug,
        primaryDomain: normalized.shop.primaryDomain,
        adminRole: "SHOP_ADMIN",
        defaultServiceCount: normalized.defaultServices.length,
      },
      null,
      2
    )
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const execute = args.execute === true;
  const confirmedDevDb = args["confirm-dev-db"] === true;
  const input = buildInput(args);

  assertSafeDevTenantProvisioningEnvironment({
    env: process.env,
    cwd: process.cwd(),
    execute,
    confirmedDevDb,
  });

  if (!execute) {
    printDryRunSummary(input);
    return;
  }

  const actorUserId = requiredString(args, "actor-user-id");
  const result = await createTenantShop(input, actorUserId);

  console.info(
    JSON.stringify(
      {
        mode: "execute",
        shopId: result.shopId,
        slug: result.shopSlug,
        primaryDomain: result.primaryDomain,
        adminUserId: result.adminUserId,
        defaultServiceCount: result.defaultServiceIds.length,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await basePrisma.$disconnect();
  });
