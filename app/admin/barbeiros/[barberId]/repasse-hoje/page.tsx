import PayoutReport from "../PayoutReport";

function getDayRange(baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export default function BarberTodayPayoutPage({
  params,
}: {
  params: { barberId: string };
}) {
  return (
    <PayoutReport
      barberId={params.barberId}
      title="Repasse de hoje"
      description="Serviços e produtos concluídos hoje, com comissão individual."
      range={getDayRange()}
    />
  );
}
