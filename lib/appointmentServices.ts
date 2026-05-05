import { formatCurrency } from "@/lib/utils";
import {
  getAppointmentItemsBarberPayoutTotal,
  getAppointmentItemsShopRevenueTotal,
  getAppointmentItemsTotal,
} from "@/lib/appointmentItems";

export type AppointmentServiceSummary = {
  id: string;
  serviceId: string;
  name: string;
  price: number;
  duration: number;
  bufferAfter: number;
  orderIndex: number;
};

export function getAppointmentServicesSummary(
  services: Array<{
    id: string;
    orderIndex: number;
    nameSnapshot: string;
    priceSnapshot: number;
    durationSnapshot: number;
    bufferAfter: number;
    serviceId: string;
  }>
): AppointmentServiceSummary[] {
  return [...services]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((service) => ({
      id: service.id,
      serviceId: service.serviceId,
      name: service.nameSnapshot,
      price: service.priceSnapshot,
      duration: service.durationSnapshot,
      bufferAfter: service.bufferAfter,
      orderIndex: service.orderIndex,
    }));
}

export function getAppointmentDisplayName(
  services: Array<{
    nameSnapshot: string;
    orderIndex: number;
  }>
) {
  const sorted = [...services].sort((a, b) => a.orderIndex - b.orderIndex);
  return sorted.map((service) => service.nameSnapshot).join(" + ");
}

export function getAppointmentTotalPrice(
  services: Array<{
    priceSnapshot: number;
  }>
) {
  return services.reduce((sum, service) => sum + service.priceSnapshot, 0);
}

export function getAppointmentServiceRevenue(
  services: Array<{
    priceSnapshot: number;
  }>
) {
  return getAppointmentTotalPrice(services);
}

export function getAppointmentBarberPayoutTotal(
  services: Array<{
    barberPayoutSnapshot: number;
  }>
) {
  return services.reduce((sum, service) => sum + service.barberPayoutSnapshot, 0);
}

export function getAppointmentShopRevenueTotal(
  services: Array<{
    shopRevenueSnapshot: number;
  }>
) {
  return services.reduce((sum, service) => sum + service.shopRevenueSnapshot, 0);
}

export function getAppointmentTotalBarberPayout(
  services: Array<{
    barberPayoutSnapshot: number;
  }>,
  items: Array<{
    barberPayoutSnapshot: number;
    isDelivered?: boolean;
  }> = []
) {
  return getAppointmentBarberPayoutTotal(services) + getAppointmentItemsBarberPayoutTotal(items);
}

export function getAppointmentTotalShopRevenue(
  services: Array<{
    shopRevenueSnapshot: number;
  }>,
  items: Array<{
    shopRevenueSnapshot: number;
    isDelivered?: boolean;
  }> = []
) {
  return getAppointmentShopRevenueTotal(services) + getAppointmentItemsShopRevenueTotal(items);
}

export function getAppointmentGrandTotal(
  services: Array<{
    priceSnapshot: number;
  }>,
  items: Array<{
    subtotal: number;
  }> = []
) {
  return getAppointmentTotalPrice(services) + getAppointmentItemsTotal(items);
}

export function getAppointmentTotalDuration(
  services: Array<{
    durationSnapshot: number;
    bufferAfter: number;
  }>
) {
  return services.reduce(
    (sum, service) => sum + service.durationSnapshot + Math.max(0, service.bufferAfter || 0),
    0
  );
}

export function getAppointmentServiceMetaLine(
  services: Array<{
    durationSnapshot: number;
    priceSnapshot: number;
  }>
) {
  const totalDuration = services.reduce(
    (sum, service) => sum + service.durationSnapshot,
    0
  );
  const totalPrice = services.reduce((sum, service) => sum + service.priceSnapshot, 0);

  return `${totalDuration} min - ${formatCurrency(totalPrice)}`;
}

