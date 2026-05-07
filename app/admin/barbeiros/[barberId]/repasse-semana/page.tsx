import { getWeekRange } from "@/lib/financials";
import PayoutReport from "../PayoutReport";

export default function BarberWeekPayoutPage({
  params,
}: {
  params: { barberId: string };
}) {
  return (
    <PayoutReport
      barberId={params.barberId}
      title="Repasse da semana atual"
      description="Serviços e produtos concluídos nesta semana, com comissão individual."
      range={getWeekRange()}
    />
  );
}
