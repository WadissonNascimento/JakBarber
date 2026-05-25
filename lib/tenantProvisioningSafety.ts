const PRODUCTION_HOST_PATTERNS = [
  /jakbarbercompany\.com/i,
  /wrtechsolutions\.tech/i,
];

export type TenantProvisioningSafetyInput = {
  env: NodeJS.ProcessEnv;
  cwd: string;
  execute: boolean;
  confirmedDevDb: boolean;
};

function envValueIncludesProductionHost(value: string | undefined) {
  return PRODUCTION_HOST_PATTERNS.some((pattern) => pattern.test(value || ""));
}

export function assertSafeDevTenantProvisioningEnvironment({
  env,
  cwd,
  execute,
  confirmedDevDb,
}: TenantProvisioningSafetyInput) {
  const productionUrlValue = [
    env.NEXTAUTH_URL,
    env.AUTH_URL,
    env.APP_URL,
    env.NEXT_PUBLIC_APP_URL,
  ].find(envValueIncludesProductionHost);

  if (env.NODE_ENV === "production") {
    throw new Error("Provisionamento de tenant bloqueado em NODE_ENV=production.");
  }

  if (productionUrlValue) {
    throw new Error(
      "Provisionamento de tenant bloqueado porque o ambiente aponta para dominio de producao."
    );
  }

  if (/[\\/]var[\\/]www[\\/]/i.test(cwd)) {
    throw new Error("Provisionamento de tenant bloqueado dentro de /var/www.");
  }

  if (!execute) {
    return;
  }

  if (env.TENANT_PROVISIONING_TARGET !== "dev") {
    throw new Error(
      "Para executar, defina TENANT_PROVISIONING_TARGET=dev no comando atual."
    );
  }

  if (!confirmedDevDb) {
    throw new Error("Para executar, passe --confirm-dev-db explicitamente.");
  }
}
