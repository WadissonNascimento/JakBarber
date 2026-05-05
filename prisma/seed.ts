import { PrismaClient, type Coupon, type Product, type Service } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calculateServiceFinancials } from "@/lib/financials";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "123456";
const SHOP_START = 9 * 60;
const SHOP_END = 20 * 60;
const LUNCH_START = 13 * 60;
const LUNCH_END = 14 * 60;
const SLOT_STEP = 10;
const HISTORICAL_DAYS = 90;
const UPCOMING_DAYS = 7;

type SeedCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferredBarberId: string | null;
  returnCycleDays: number | null;
  lastCompletedAt: Date | null;
};

type SeedBarber = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

type ServiceCombo = {
  label: string;
  serviceIds: string[];
  barberId?: string;
  weight: number;
};

function createRng(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createRng(20260410);

function randomInt(min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[]) {
  const array = [...items];

  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }

  return array;
}

function pickOne<T>(items: T[]) {
  return items[Math.floor(rng() * items.length)];
}

function pickWeighted<T extends { weight: number }>(items: T[]) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = rng() * total;

  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function differenceInDays(a: Date, b: Date) {
  return Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

function setMinutesForDate(value: Date, totalMinutes: number) {
  const date = new Date(value);
  date.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return date;
}

function buildIntervals(
  occupied: Array<{ start: number; end: number }>,
  duration: number
) {
  const candidates: number[] = [];

  for (let start = SHOP_START; start + duration <= SHOP_END; start += SLOT_STEP) {
    const end = start + duration;
    const conflictsLunch = start < LUNCH_END && end > LUNCH_START;
    const conflictsExisting = occupied.some(
      (interval) => start < interval.end && end > interval.start
    );

    if (!conflictsLunch && !conflictsExisting) {
      candidates.push(start);
    }
  }

  const weighted = candidates
    .map((start) => {
      const hour = Math.floor(start / 60);
      const boost =
        hour >= 10 && hour <= 12
          ? 4
          : hour >= 14 && hour <= 18
          ? 5
          : hour === 9 || hour === 19
          ? 2
          : 1;

      return {
        start,
        weight: boost + rng(),
      };
    })
    .sort((a, b) => b.weight - a.weight);

  return weighted.map((entry) => entry.start);
}

async function upsertAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@barbearia.com";
  const adminPassword = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
  const adminHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Administrador",
      phone: "11940000000",
      passwordHash: adminHash,
      role: "ADMIN",
      isActive: true,
    },
    create: {
      name: "Administrador",
      email: adminEmail,
      phone: "11940000000",
      passwordHash: adminHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  return { adminEmail, adminPassword };
}

async function clearDevelopmentData() {
  await prisma.$transaction([
    prisma.stockMovement.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.product.deleteMany(),
    prisma.barberPayout.deleteMany(),
    prisma.appointmentService.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.service.deleteMany(),
    prisma.recurringBarberBlock.deleteMany(),
    prisma.barberBlock.deleteMany(),
    prisma.barberAvailability.deleteMany(),
    prisma.clientNote.deleteMany(),
    prisma.customerProfile.deleteMany(),
    prisma.passwordResetRequest.deleteMany(),
    prisma.pendingRegistration.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function createBarbers(passwordHash: string): Promise<SeedBarber[]> {
  const barbers = [
    {
      name: "Jak Barber",
      email: "jak@seed.jakbarber.local",
      phone: "11950000001",
      image: "/uploads/barbers/jak.jpg",
    },
    {
      name: "Lipe Barber",
      email: "lipe@seed.jakbarber.local",
      phone: "11950000002",
      image: "/uploads/barbers/lipe.jpg",
    },
    {
      name: "Vitao Barber",
      email: "vitao@seed.jakbarber.local",
      phone: "11950000003",
      image: "/uploads/barbers/vitao.jpg",
    },
    {
      name: "Vini Barber",
      email: "vini@seed.jakbarber.local",
      phone: "11950000004",
      image: "/uploads/barbers/vini.jpg",
    },
  ];

  const created: SeedBarber[] = [];

  for (const barber of barbers) {
    const user = await prisma.user.create({
      data: {
        ...barber,
        role: "BARBER",
        passwordHash,
        isActive: true,
      },
    });

    created.push({
      id: user.id,
      name: user.name || "Barbeiro",
      email: user.email || barber.email,
      image: user.image,
    });

    for (const weekDay of [0, 2, 3, 4, 5, 6]) {
      await prisma.barberAvailability.upsert({
        where: {
          barberId_weekDay: {
            barberId: user.id,
            weekDay,
          },
        },
        update: {
          startTime: "09:00",
          endTime: "20:00",
          isActive: true,
        },
        create: {
          barberId: user.id,
          weekDay,
          startTime: "09:00",
          endTime: "20:00",
          isActive: true,
        },
      });

      await prisma.recurringBarberBlock.create({
        data: {
          barberId: user.id,
          weekDay,
          startTime: "13:00",
          endTime: "14:00",
          reason: "Pausa de almoco",
          isActive: true,
        },
      });
    }
  }

  return created;
}

async function createCustomers(passwordHash: string, barbers: SeedBarber[]) {
  const names = [
    "Andre Nogueira",
    "Carlos Eduardo",
    "Diego Lima",
    "Felipe Araujo",
    "Gabriel Souza",
    "Henrique Melo",
    "Igor Batista",
    "Joao Pedro",
    "Kleber Santos",
    "Leandro Rocha",
    "Marcos Vinicius",
    "Natan Ferreira",
    "Otavio Ribeiro",
    "Paulo Cesar",
    "Rafael Moreira",
    "Samuel Oliveira",
    "Tiago Barbosa",
    "Victor Hugo",
    "Wellington Dias",
    "Yuri Farias",
    "Alan Pires",
    "Brayan Lopes",
    "Caue Teixeira",
    "Daniel Prado",
    "Erick Silva",
    "Fernando Rios",
    "Guilherme Alves",
    "Helio Borges",
    "Italo Prado",
    "Jefferson Cruz",
    "Kauan Rezende",
    "Luis Gustavo",
    "Mateus Campos",
    "Nathan Costa",
    "Pietro Mendes",
    "Renan Azevedo",
    "Sergio Teles",
    "Thomas Vieira",
    "Vitor Dantas",
    "William Nunes",
    "Alex Santana",
    "Breno Moura",
    "Cristiano Porto",
    "Douglas Vieira",
    "Eduardo Sampaio",
    "Fabio Tavares",
    "Geovane Lopes",
    "Heitor Maciel",
  ];

  const recurringOptions = [7, 15, 21, 30];
  const seedCustomers: SeedCustomer[] = [];

  for (let index = 0; index < names.length; index += 1) {
    const preferredBarber =
      index % 3 === 0 ? barbers[index % barbers.length] : index % 5 === 0 ? barbers[(index + 1) % barbers.length] : null;
    const returnCycle =
      index < 20 ? recurringOptions[index % recurringOptions.length] : null;
    const email = `cliente${String(index + 1).padStart(2, "0")}@seed.jakbarber.local`;
    const phone = `1196${String(100000 + index).slice(-6)}`;

    const user = await prisma.user.create({
      data: {
        name: names[index],
        email,
        phone,
        role: "CUSTOMER",
        isActive: true,
        passwordHash: index === 0 ? passwordHash : null,
        customerProfile: {
          create: {
            preferredBarberId: preferredBarber?.id || null,
            allergies: index % 9 === 0 ? "Sensibilidade a loes com alcool." : null,
            preferences:
              index % 4 === 0
                ? "Prefere acabamento baixo e atendimento no fim da tarde."
                : index % 7 === 0
                ? "Gosta de corte com tesoura nas laterais."
                : null,
          },
        },
      },
    });

    seedCustomers.push({
      id: user.id,
      name: user.name || names[index],
      email,
      phone,
      preferredBarberId: preferredBarber?.id || null,
      returnCycleDays: returnCycle,
      lastCompletedAt: null,
    });
  }

  return seedCustomers;
}

async function createServices(barbers: SeedBarber[]) {
  const globalServices = [
    {
      name: "Alisante",
      description: "Aplicacao de alisante para alinhamento dos fios.",
      price: 25,
      duration: 20,
      bufferAfter: 0,
      commissionValue: 40,
    },
    {
      name: "Barba",
      description: "Acabamento e alinhamento da barba.",
      price: 25,
      duration: 30,
      bufferAfter: 0,
      commissionValue: 40,
    },
    {
      name: "Barboterapia na toalha quente",
      description: "Barba com toalha quente e finalizacao.",
      price: 25,
      duration: 30,
      bufferAfter: 0,
      commissionValue: 40,
    },
    {
      name: "Bigode",
      description: "Ajuste rapido do bigode.",
      price: 5,
      duration: 10,
      bufferAfter: 0,
      commissionValue: 40,
    },
    {
      name: "Botox",
      description: "Tratamento capilar para reducao de volume.",
      price: 50,
      duration: 60,
      bufferAfter: 0,
      commissionValue: 40,
    },
    {
      name: "Cavanhaque",
      description: "Desenho e acabamento do cavanhaque.",
      price: 15,
      duration: 20,
      bufferAfter: 0,
      commissionValue: 40,
    },
    {
      name: "Corte",
      description: "Corte masculino com acabamento.",
      price: 40,
      duration: 45,
      bufferAfter: 0,
      commissionValue: 40,
    },
    {
      name: "Corte e barba",
      description: "Combo de corte masculino e barba.",
      price: 65,
      duration: 60,
      bufferAfter: 0,
      commissionValue: 40,
    },
    {
      name: "Corte e sobrancelha",
      description: "Corte masculino com ajuste de sobrancelha.",
      price: 50,
      duration: 60,
      bufferAfter: 0,
      commissionValue: 40,
    },
    {
      name: "Luzes",
      description: "Servico de luzes para cabelo.",
      price: 100,
      duration: 60,
      bufferAfter: 0,
      commissionValue: 40,
    },
    {
      name: "Penteado",
      description: "Finalizacao e penteado.",
      price: 20,
      duration: 20,
      bufferAfter: 0,
      commissionValue: 40,
    },
    {
      name: "Pezinho",
      description: "Acabamento do contorno do cabelo.",
      price: 10,
      duration: 10,
      bufferAfter: 0,
      commissionValue: 40,
    },
    {
      name: "Piguimenta\u00e7\u00e3o na barba",
      description: "Piguimentacao para preenchimento da barba.",
      price: 10,
      duration: 10,
      bufferAfter: 0,
      commissionValue: 40,
    },
    {
      name: "Piguimenta\u00e7\u00e3o no cabelo",
      description: "Piguimentacao para acabamento no cabelo.",
      price: 15,
      duration: 20,
      bufferAfter: 0,
      commissionValue: 40,
    },
    {
      name: "Platinado",
      description: "Descoloracao e finalizacao para cabelo platinado.",
      price: 120,
      duration: 120,
      bufferAfter: 0,
      commissionValue: 40,
    },
    {
      name: "Progressiva",
      description: "Progressiva para alinhamento e reducao de volume.",
      price: 50,
      duration: 60,
      bufferAfter: 0,
      commissionValue: 40,
    },
    {
      name: "Sobrancelha",
      description: "Acerto rapido da sobrancelha.",
      price: 10,
      duration: 15,
      bufferAfter: 0,
      commissionValue: 40,
    },
  ];

  const exclusiveByBarber = [
    {
      barberEmail: "jak@seed.jakbarber.local",
      name: "Freestyle premium",
      description: "Degrade com desenho e acabamento detalhado.",
      price: 60,
      duration: 55,
      bufferAfter: 10,
      commissionValue: 45,
    },
    {
      barberEmail: "lipe@seed.jakbarber.local",
      name: "Navalhado premium",
      description: "Acabamento completo na navalha.",
      price: 58,
      duration: 50,
      bufferAfter: 10,
      commissionValue: 45,
    },
    {
      barberEmail: "vitao@seed.jakbarber.local",
      name: "Corte infantil",
      description: "Atendimento rapido e confortavel para criancas.",
      price: 38,
      duration: 35,
      bufferAfter: 5,
      commissionValue: 38,
    },
  ];

  const createdGlobals: Service[] = [];

  for (const service of globalServices) {
    createdGlobals.push(
      await prisma.service.create({
        data: {
          ...service,
          barberId: null,
          commissionType: "PERCENT",
          isActive: true,
        },
      })
    );
  }

  const createdExclusives: Service[] = [];

  for (const service of exclusiveByBarber) {
    const barber = barbers.find((entry) => entry.email === service.barberEmail);

    if (!barber) {
      continue;
    }

    createdExclusives.push(
      await prisma.service.create({
        data: {
          name: service.name,
          description: service.description,
          price: service.price,
          duration: service.duration,
          bufferAfter: service.bufferAfter,
          barberId: barber.id,
          commissionType: "PERCENT",
          commissionValue: service.commissionValue,
          isActive: true,
        },
      })
    );
  }

  return {
    globalServices: createdGlobals,
    exclusiveServices: createdExclusives,
  };
}

async function createProductsAndCoupons() {
  const products = [
    {
      name: "Pomada matte 120g",
      description: "Fixacao forte com acabamento seco.",
      price: 36.9,
      stock: 28,
      imageUrl: "/produtos/pomada.jpg",
    },
    {
      name: "Oleo para barba premium",
      description: "Hidratacao leve para uso diario.",
      price: 34.9,
      stock: 18,
      imageUrl: "/produtos/oleo-barba.jpg",
    },
    {
      name: "Shampoo refrescante",
      description: "Limpeza diaria para cabelo e barba.",
      price: 27.9,
      stock: 24,
      imageUrl: "/produtos/shampoo.jpg",
    },
  ];

  const createdProducts: Product[] = [];

  for (const product of products) {
    createdProducts.push(
      await prisma.product.create({
        data: product,
      })
    );
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: "BEMVINDO10",
      description: "Desconto inicial para primeira compra.",
      discountType: "PERCENT",
      discountValue: 10,
      minOrderTotal: 80,
      usageLimit: 200,
      isActive: true,
    },
  });

  return {
    products: createdProducts,
    coupon,
  };
}

async function createOrders(customers: SeedCustomer[], products: Product[], coupon: Coupon) {
  const statuses = [
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ];
  const shippingMethods = ["PAC", "SEDEX", "RETIRADA"];
  let ordersCreated = 0;

  for (let index = 0; index < 24; index += 1) {
    const customer = customers[index % customers.length];
    const firstProduct = products[index % products.length];
    const secondProduct = products[(index + 1) % products.length];
    const quantity = (index % 3) + 1;
    const includeSecondProduct = index % 2 === 0;
    const items = [
      {
        product: firstProduct,
        quantity,
      },
      ...(includeSecondProduct
        ? [
            {
              product: secondProduct,
              quantity: 1,
            },
          ]
        : []),
    ];
    const subtotal = Number(
      items
        .reduce((sum, item) => sum + item.product.price * item.quantity, 0)
        .toFixed(2)
    );
    const usesCoupon = index % 4 === 0 && subtotal >= coupon.minOrderTotal;
    const discountTotal = usesCoupon ? Number((subtotal * 0.1).toFixed(2)) : 0;
    const shippingMethod = shippingMethods[index % shippingMethods.length];
    const shippingCost = shippingMethod === "RETIRADA" ? 0 : index % 3 === 0 ? 18.9 : 12.9;
    const total = Number((subtotal + shippingCost - discountTotal).toFixed(2));
    const status = statuses[index % statuses.length];

    await prisma.order.create({
      data: {
        customerId: customer.id,
        couponId: usesCoupon ? coupon.id : null,
        status,
        trackingCode:
          status === "SHIPPED" || status === "DELIVERED"
            ? `JB${String(100000 + index)}BR`
            : null,
        adminApproved: status !== "PENDING" && status !== "CANCELLED",
        total,
        subtotal,
        shippingCost,
        discountTotal,
        shippingZipCode: "01001000",
        shippingMethod,
        shippingAddress:
          shippingMethod === "RETIRADA"
            ? "Retirada na barbearia"
            : `Rua Demo, ${100 + index} - Sao Paulo/SP`,
        notes: index % 5 === 0 ? "Pedido criado pelo seed para teste." : null,
        createdAt: addDays(new Date(), -index * 3),
        items: {
          create: items.map((item) => ({
            productId: item.product.id,
            productNameSnapshot: item.product.name,
            quantity: item.quantity,
            unitPrice: item.product.price,
          })),
        },
      },
    });

    ordersCreated += 1;
  }

  await prisma.coupon.update({
    where: {
      id: coupon.id,
    },
    data: {
      timesUsed: Math.ceil(ordersCreated / 4),
    },
  });

  return ordersCreated;
}

function buildServiceCombos(
  globalServices: Service[],
  exclusiveServices: Service[]
): ServiceCombo[] {
  const globalMap = new Map(globalServices.map((service) => [service.name, service] as const));

  const combos: ServiceCombo[] = [
    {
      label: "Corte",
      serviceIds: [globalMap.get("Corte")!.id],
      weight: 34,
    },
    {
      label: "Barba",
      serviceIds: [globalMap.get("Barba")!.id],
      weight: 10,
    },
    {
      label: "Corte + barba",
      serviceIds: [globalMap.get("Corte e barba")!.id],
      weight: 28,
    },
    {
      label: "Corte + sobrancelha",
      serviceIds: [globalMap.get("Corte e sobrancelha")!.id],
      weight: 12,
    },
    {
      label: "Pezinho",
      serviceIds: [globalMap.get("Pezinho")!.id],
      weight: 9,
    },
    {
      label: "Sobrancelha",
      serviceIds: [globalMap.get("Sobrancelha")!.id],
      weight: 7,
    },
    {
      label: "Progressiva",
      serviceIds: [globalMap.get("Progressiva")!.id],
      weight: 5,
    },
  ];

  for (const service of exclusiveServices) {
    combos.push({
      label: service.name,
      serviceIds: [service.id],
      barberId: service.barberId || undefined,
      weight: 7,
    });
  }

  return combos;
}

function chooseCustomer(customers: SeedCustomer[], currentDate: Date) {
  const dueCustomers = customers.filter((customer) => {
    if (!customer.returnCycleDays || !customer.lastCompletedAt) {
      return false;
    }

    return differenceInDays(currentDate, customer.lastCompletedAt) >= customer.returnCycleDays;
  });

  if (dueCustomers.length > 0 && rng() < 0.7) {
    return pickOne(dueCustomers);
  }

  return pickOne(customers);
}

function resolveStatus(date: Date, now: Date) {
  if (date.getTime() > now.getTime()) {
    return rng() < 0.65 ? "CONFIRMED" : "PENDING";
  }

  const roll = rng();

  if (roll < 0.78) {
    return "COMPLETED";
  }

  if (roll < 0.93) {
    return "CANCELLED";
  }

  return "NO_SHOW";
}

async function createAppointments(
  customers: SeedCustomer[],
  barbers: SeedBarber[],
  globalServices: Service[],
  exclusiveServices: Service[]
) {
  const serviceMap = new Map(
    [...globalServices, ...exclusiveServices].map((service) => [service.id, service] as const)
  );
  const combos = buildServiceCombos(globalServices, exclusiveServices);
  const today = startOfDay(new Date());
  const startDate = addDays(today, -HISTORICAL_DAYS);
  const endDate = addDays(today, UPCOMING_DAYS);
  const now = new Date();
  let appointmentsCreated = 0;

  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    const weekDay = cursor.getDay();

    if (weekDay === 1) {
      continue;
    }

    const isHistorical = cursor <= today;
    const isWeekend = weekDay === 0 || weekDay === 6;
    const targetAppointments = isHistorical
      ? randomInt(1, isWeekend ? 3 : 2)
      : randomInt(1, 2);

    const occupiedByBarber = new Map<string, Array<{ start: number; end: number }>>(
      barbers.map((barber) => [barber.id, []])
    );

    let createdForDay = 0;
    let attempts = 0;

    while (createdForDay < targetAppointments && attempts < targetAppointments * 30) {
      attempts += 1;

      const customer = chooseCustomer(customers, cursor);
      const combo = pickWeighted(combos);
      const candidateBarbers = combo.barberId
        ? barbers.filter((barber) => barber.id === combo.barberId)
        : customer.preferredBarberId && rng() < 0.72
        ? [
            ...barbers.filter((barber) => barber.id === customer.preferredBarberId),
            ...barbers.filter((barber) => barber.id !== customer.preferredBarberId),
          ]
        : shuffle(barbers);

      const services = combo.serviceIds
        .map((serviceId) => serviceMap.get(serviceId))
        .filter((service): service is Service => Boolean(service));

      if (services.length !== combo.serviceIds.length) {
        continue;
      }

      const duration = services.reduce(
        (sum, service) => sum + service.duration + Math.max(0, service.bufferAfter || 0),
        0
      );

      let selectedBarber: SeedBarber | null = null;
      let selectedStartMinutes: number | null = null;

      for (const barber of candidateBarbers) {
        const occupied = occupiedByBarber.get(barber.id) || [];
        const possibleSlots = buildIntervals(occupied, duration);

        if (possibleSlots.length === 0) {
          continue;
        }

        selectedBarber = barber;
        selectedStartMinutes = possibleSlots[0];
        break;
      }

      if (!selectedBarber || selectedStartMinutes === null) {
        continue;
      }

      const appointmentDate = setMinutesForDate(cursor, selectedStartMinutes);
      const status = resolveStatus(appointmentDate, now);
      const note =
        status === "NO_SHOW"
          ? "Cliente nao compareceu ao horario reservado."
          : status === "CANCELLED"
          ? "Cliente solicitou cancelamento antecipado."
          : rng() < 0.22
          ? "Cliente prefere acabamento mais baixo nas laterais."
          : null;

      await prisma.appointment.create({
        data: {
          publicId: appointmentsCreated + 1,
          customerId: customer.id,
          barberId: selectedBarber.id,
          date: appointmentDate,
          status,
          notes: note,
          services: {
            create: services.map((service, index) => {
              const financials = calculateServiceFinancials(service);

              return {
                serviceId: service.id,
                orderIndex: index,
                nameSnapshot: service.name,
                priceSnapshot: service.price,
                durationSnapshot: service.duration,
                bufferAfter: service.bufferAfter || 0,
                commissionTypeSnapshot: financials.commissionType,
                commissionValueSnapshot: financials.commissionValue,
                barberPayoutSnapshot: financials.barberPayout,
                shopRevenueSnapshot: financials.shopRevenue,
              };
            }),
          },
        },
      });

      occupiedByBarber.get(selectedBarber.id)?.push({
        start: selectedStartMinutes,
        end: selectedStartMinutes + duration,
      });

      if (status === "COMPLETED") {
        customer.lastCompletedAt = appointmentDate;
      }

      createdForDay += 1;
      appointmentsCreated += 1;
    }
  }

  return appointmentsCreated;
}

async function main() {
  await clearDevelopmentData();

  const { adminEmail, adminPassword } = await upsertAdmin();
  const defaultPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const barbers = await createBarbers(defaultPasswordHash);
  const customers = await createCustomers(defaultPasswordHash, barbers);
  const { globalServices, exclusiveServices } = await createServices(barbers);
  const { products, coupon } = await createProductsAndCoupons();
  const appointmentsCreated = await createAppointments(
    customers,
    barbers,
    globalServices,
    exclusiveServices
  );
  const ordersCreated = await createOrders(customers, products, coupon);

  const stats = await prisma.$transaction([
    prisma.user.count({
      where: {
        role: "CUSTOMER",
        email: {
          contains: "@seed.jakbarber.local",
        },
      },
    }),
    prisma.user.count({
      where: {
        role: "BARBER",
        email: {
          contains: "@seed.jakbarber.local",
        },
      },
    }),
    prisma.appointment.count({
      where: {
        OR: [
          {
            customer: {
              email: {
                contains: "@seed.jakbarber.local",
              },
            },
          },
          {
            barber: {
              email: {
                contains: "@seed.jakbarber.local",
              },
            },
          },
        ],
      },
    }),
    prisma.order.count(),
  ]);

  console.log("Seed executado com sucesso.");
  console.log(`Admin: ${adminEmail} / senha: ${adminPassword}`);
  console.log(`Barbeiros seed: 4 / senha padrao: ${DEFAULT_PASSWORD}`);
  console.log(`Clientes seed: ${stats[0]}`);
  console.log(`Barbeiros ativos seed: ${stats[1]}`);
  console.log(`Agendamentos seed: ${stats[2]}`);
  console.log(`Agendamentos gerados nesta execucao: ${appointmentsCreated}`);
  console.log(`Pedidos seed: ${stats[3]}`);
  console.log(`Pedidos gerados nesta execucao: ${ordersCreated}`);
  console.log("Conta demo cliente: cliente01@seed.jakbarber.local / senha: 123456");
}

main()
  .catch((error) => {
    console.error("Erro no seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
