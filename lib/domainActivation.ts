import "server-only";

import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  getDomainReadiness,
  isLocalOrReservedDomain,
  normalizeDomainInput,
  type DomainReadiness,
} from "@/lib/domainReadiness";

const execFileAsync = promisify(execFile);

const NGINX_ENABLED_DIR = "/etc/nginx/sites-enabled";

export type DomainActivationStatus = {
  status: "missing" | "local" | "waiting_dns" | "ready" | "active";
  label: string;
  tone: "muted" | "warning" | "success";
  domain: string | null;
  canActivate: boolean;
  certificateExists: boolean;
  nginxConfigPath: string | null;
  message: string;
};

export class DomainActivationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainActivationError";
  }
}

export function isWrDomainActivationEnabled() {
  return process.env.WR_DOMAIN_ACTIVATION_ENABLED === "1";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findExistingNginxConfigForDomain(domain: string) {
  if (!existsSync(NGINX_ENABLED_DIR)) {
    return null;
  }

  const serverNamePattern = new RegExp(
    String.raw`server_name\s+[^;]*\b${escapeRegExp(domain)}\b[^;]*;`,
  );

  for (const entry of readdirSync(NGINX_ENABLED_DIR)) {
    const enabledPath = join(NGINX_ENABLED_DIR, entry);

    try {
      const content = readFileSync(enabledPath, "utf8");

      if (serverNamePattern.test(content)) {
        return enabledPath;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function certificateExistsForDomain(domain: string) {
  return existsSync(`/etc/letsencrypt/live/${domain}/fullchain.pem`);
}

export function getDomainActivationCommand(domain: string) {
  return `DOMAIN_ACTIVATION_ENABLED=1 npm run domain:activate -- --domain ${domain} --execute`;
}

export async function getDomainActivationStatus(
  value: string | null | undefined,
  readiness?: DomainReadiness,
): Promise<DomainActivationStatus> {
  const domain = normalizeDomainInput(value);

  if (!domain) {
    return {
      status: "missing",
      label: "Sem dominio",
      tone: "muted",
      domain: null,
      canActivate: false,
      certificateExists: false,
      nginxConfigPath: null,
      message: "Nenhum dominio principal cadastrado.",
    };
  }

  if (isLocalOrReservedDomain(domain)) {
    return {
      status: "local",
      label: "SSL local",
      tone: "muted",
      domain,
      canActivate: false,
      certificateExists: false,
      nginxConfigPath: null,
      message: "Dominio local ou reservado nao recebe SSL em producao.",
    };
  }

  const certificateExists = certificateExistsForDomain(domain);
  const nginxConfigPath = findExistingNginxConfigForDomain(domain);

  if (certificateExists && nginxConfigPath) {
    return {
      status: "active",
      label: "SSL ativo",
      tone: "success",
      domain,
      canActivate: false,
      certificateExists,
      nginxConfigPath,
      message: "Certificado e Nginx ativos para este dominio.",
    };
  }

  const domainReadiness = readiness ?? (await getDomainReadiness(domain));

  if (domainReadiness.status !== "ready") {
    return {
      status: "waiting_dns",
      label: "Aguardando DNS",
      tone: "warning",
      domain,
      canActivate: false,
      certificateExists,
      nginxConfigPath,
      message: domainReadiness.message,
    };
  }

  return {
    status: "ready",
    label: "Pronto SSL",
    tone: "warning",
    domain,
    canActivate: true,
    certificateExists,
    nginxConfigPath,
    message: "DNS pronto; o dominio pode receber certificado e Nginx.",
  };
}

export async function activateCustomDomainFromPanel(domain: string) {
  const normalizedDomain = normalizeDomainInput(domain);

  if (!normalizedDomain || isLocalOrReservedDomain(normalizedDomain)) {
    throw new DomainActivationError("Dominio invalido para ativacao SSL.");
  }

  if (!isWrDomainActivationEnabled()) {
    throw new DomainActivationError("Ativacao via painel bloqueada neste ambiente.");
  }

  const readiness = await getDomainReadiness(normalizedDomain);

  if (readiness.status !== "ready") {
    throw new DomainActivationError(`DNS ainda nao esta pronto: ${readiness.label}.`);
  }

  let result: Awaited<ReturnType<typeof execFileAsync>>;

  try {
    result = await execFileAsync(
      "npm",
      ["run", "domain:activate", "--", "--domain", normalizedDomain, "--execute"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          DOMAIN_ACTIVATION_ENABLED: "1",
        },
        maxBuffer: 1024 * 1024 * 4,
        timeout: 180_000,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro desconhecido";

    throw new DomainActivationError(`Falha ao ativar SSL: ${message}`);
  }

  return {
    domain: normalizedDomain,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}
