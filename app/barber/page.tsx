import BarberTodayDashboard from "./_components/BarberTodayDashboard";
import { getBarberDashboardData } from "./data";
import { requireActiveBarber } from "./guard";
import BarberPhotoUploader from "@/components/BarberPhotoUploader";
import { updateOwnBarberPhotoAction } from "./actions";

export default async function BarberPage() {
  const { session, barber } = await requireActiveBarber();
  const dashboard = await getBarberDashboardData(session.user.id, {
    view: "day",
    status: "ALL",
  });

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-5 text-white sm:px-6 sm:py-8">
        <div className="mb-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-strong)]">
              Painel do barbeiro
            </p>
            <p className="mt-1 truncate text-sm text-zinc-400">
              {session.user.name || "Barbeiro"}
            </p>
          </div>
        </div>

        <div className="mb-4 max-w-xl">
          <BarberPhotoUploader
            action={updateOwnBarberPhotoAction}
            currentImage={barber.image}
            name={barber.name || "Barbeiro"}
          />
        </div>

        <BarberTodayDashboard
          barberName={session.user.name || "Barbeiro"}
          summary={dashboard.summary}
          walkInServices={dashboard.walkInServices}
          clients={dashboard.clients}
        />
      </div>
    </div>
  );
}
