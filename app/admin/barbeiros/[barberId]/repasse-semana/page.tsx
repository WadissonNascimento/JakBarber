import { getWeekRange } from "@/lib/financials";
import PayoutReport from "../PayoutReport";

export const dynamic = "force-dynamic";

type AdminBarberRouteParams = {
  params: Promise<{ barberId: string }>;
};

export default async function BarberWeekPayoutPage({ params }: AdminBarberRouteParams) {
  const { barberId } = await params;

  return (
    <PayoutReport
      barberId={barberId}
      title="Repasse da semana atual"
      description="Serviços e produtos concluídos nesta semana, com comissão individual."
      range={getWeekRange()}
    />
  );
}
