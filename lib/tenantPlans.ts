export type TenantPlanCode = "basic" | "professional" | "premium" | "custom";

export type TenantPlan = {
  code: TenantPlanCode;
  name: string;
  barberLimit: number | null;
  description: string;
};

export const TENANT_PLANS: TenantPlan[] = [
  {
    code: "basic",
    name: "Basico",
    barberLimit: 2,
    description: "Entrada para barbearias pequenas.",
  },
  {
    code: "professional",
    name: "Profissional",
    barberLimit: 5,
    description: "Plano padrao para operacao em crescimento.",
  },
  {
    code: "premium",
    name: "Premium",
    barberLimit: 10,
    description: "Mais folga para equipes maiores.",
  },
  {
    code: "custom",
    name: "Personalizado",
    barberLimit: null,
    description: "Limite definido manualmente pela WR.",
  },
];

export function getTenantPlan(code: string | null | undefined) {
  return TENANT_PLANS.find((plan) => plan.code === code) || TENANT_PLANS[3];
}

export function isTenantPlanCode(value: string): value is TenantPlanCode {
  return TENANT_PLANS.some((plan) => plan.code === value);
}
