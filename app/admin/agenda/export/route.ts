import { auth } from "@/auth";
import {
  buildAgendaCsv,
  getAdminAgendaReport,
  type AdminAgendaFilters,
} from "@/lib/adminReports";
import { enforceRateLimit, logSecurityEvent } from "@/lib/security";

function getFilename() {
  const today = new Date().toISOString().slice(0, 10);
  return `agenda-relatorio-${today}.csv`;
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    logSecurityEvent("access_denied", { route: "/admin/agenda/export" });
    return new Response("Nao autenticado.", { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    logSecurityEvent("access_denied", {
      route: "/admin/agenda/export",
      role: session.user.role,
    });
    return new Response("Nao autorizado.", { status: 403 });
  }

  if (!session.user.shopId) {
    logSecurityEvent("access_denied", {
      route: "/admin/agenda/export",
      reason: "missing_shop",
    });
    return new Response("Barbearia nao vinculada.", { status: 403 });
  }

  const rateLimit = await enforceRateLimit({
    scope: "admin:agenda_export",
    identifier: session.user.id,
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return new Response("Muitas exportacoes. Aguarde e tente novamente.", {
      status: 429,
    });
  }

  const { searchParams } = new URL(request.url);

  const filters: AdminAgendaFilters = {
    shopId: session.user.shopId,
    barberId: searchParams.get("barberId") || "",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
    status: searchParams.get("status") || "",
  };

  const { appointments } = await getAdminAgendaReport(filters);
  const csv = `\uFEFF${buildAgendaCsv(appointments)}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${getFilename()}"`,
    },
  });
}
