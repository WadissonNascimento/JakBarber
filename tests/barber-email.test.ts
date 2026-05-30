import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("barber notification orchestration wires existing business events without email", () => {
  const barberEmails = read("lib/barberEmails.ts");
  const bookingRoute = read("app/api/booking/appointments/route.ts");
  const bookingAction = read("app/agendar/actions.ts");
  const customerActions = read("app/customer/agendamentos/actions.ts");
  const barberActions = read("app/barber/actions.ts");

  for (const notifyName of [
    "notifyBarberNewAppointment",
    "notifyBarberAppointmentCancelled",
    "notifyBarberAppointmentRescheduled",
    "sendDailyBarberAgendaNotifications",
    "notifyBarberNoShow",
    "notifyBarberNewReview",
  ]) {
    assert.match(barberEmails, new RegExp(`export async function ${notifyName}`));
  }

  assert.match(barberEmails, /createAppNotificationSafely/);
  assert.doesNotMatch(barberEmails, /sendEmailMessage/);
  assert.doesNotMatch(barberEmails, /getShopEmailIdentity/);
  assert.doesNotMatch(barberEmails, /recipientEmail/);
  assert.match(bookingRoute, /notifyBarberNewAppointment\(appointmentId\)/);
  assert.match(bookingRoute, /notifyBarberAppointmentRescheduled\(\{/);
  assert.match(bookingAction, /notifyBarberNewAppointment\(appointmentId\)/);
  assert.match(customerActions, /notifyBarberAppointmentCancelled\(appointmentId/);
  assert.match(customerActions, /notifyBarberNewReview\(review\.id\)/);
  assert.match(barberActions, /notifyBarberNoShow\(appointmentId\)/);
});

test("barber daily agenda cron is protected and only creates notifications", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read(
    "prisma/migrations/20260509110000_add_email_delivery_logs/migration.sql"
  );
  const route = read("app/api/cron/barber-daily-agenda/route.ts");

  assert.match(schema, /model EmailDeliveryLog/);
  assert.match(schema, /@@unique\(\[shopId, template, eventKey, recipientEmail\]\)/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /EmailDeliveryLog admin select/);
  assert.match(route, /process\.env\.CRON_SECRET/);
  assert.match(route, /sendDailyBarberAgendaNotifications/);
  assert.doesNotMatch(route, /sent:/);
});
