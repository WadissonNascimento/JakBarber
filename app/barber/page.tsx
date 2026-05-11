import BarberTodayDashboard from "./_components/BarberTodayDashboard";
import BarberProfileSettings from "./_components/BarberProfileSettings";
import AccountPasswordForm from "@/components/AccountPasswordForm";
import { updateOwnAccountPasswordAction } from "@/app/accountPasswordActions";
import { getBarberTodayDashboardData } from "./data";
import { requireActiveBarber } from "./guard";
import {
  updateOwnBarberContactAction,
  updateOwnBarberPhotoAction,
} from "./actions";

export default async function BarberPage() {
  const { barber } = await requireActiveBarber();
  const dashboard = await getBarberTodayDashboardData(barber.id);
  const barberName = barber.name || "Barbeiro";

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-5 text-white sm:px-6 sm:py-8">
        <div className="mb-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-strong)]">
              Painel do barbeiro
            </p>
            <p className="mt-1 truncate text-sm text-zinc-400">
              {barberName}
            </p>
          </div>
        </div>

        <div className="mb-4 max-w-xl">
          <BarberProfileSettings
            photoAction={updateOwnBarberPhotoAction}
            contactAction={updateOwnBarberContactAction}
            currentImage={barber.image}
            name={barberName}
            email={barber.email}
            phone={barber.phone}
          />
        </div>

        <div className="mb-4 max-w-xl">
          <AccountPasswordForm
            action={updateOwnAccountPasswordAction}
            title="Senha do painel"
            description="Atualize a senha usada para entrar no painel do barbeiro."
          />
        </div>

        <BarberTodayDashboard
          barberName={barberName}
          summary={dashboard.summary}
          walkInServices={dashboard.walkInServices}
          walkInExtras={dashboard.walkInExtras}
          clients={dashboard.clients}
        />
      </div>
    </div>
  );
}
