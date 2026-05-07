import { auth } from "@/auth";
import { getActiveBarberForSession } from "@/lib/barberAccess";
import { redirect } from "next/navigation";

export async function requireActiveBarber() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const activeBarber = await getActiveBarberForSession(session.user);

  if (!activeBarber) {
    redirect("/login");
  }

  return {
    session,
    barber: activeBarber,
  };
}
