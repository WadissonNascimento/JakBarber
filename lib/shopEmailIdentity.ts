import "server-only";

export type ShopEmailIdentity = {
  fromName?: string;
  replyTo?: string;
  smtp?: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    from?: string;
  };
};

function optionalNumber(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const RODRIGO_STYLE_REPLY_TO =
  process.env.RODRIGO_STYLE_REPLY_TO || "rodrigostylebarbearia@gmail.com";

const SHOP_EMAIL_IDENTITIES: Record<string, ShopEmailIdentity> = {
  shop_jak_barber: {
    fromName: process.env.JAKBARBER_EMAIL_FROM_NAME || "Jak Barber",
    replyTo: process.env.JAKBARBER_REPLY_TO || "jakcompanybarbearia@gmail.com",
  },
  shop_rodrigo_style: {
    fromName: process.env.RODRIGO_STYLE_EMAIL_FROM_NAME || "Rodrigo Style",
    replyTo: RODRIGO_STYLE_REPLY_TO,
    smtp: {
      host: process.env.RODRIGO_STYLE_EMAIL_SERVER_HOST,
      port: optionalNumber(process.env.RODRIGO_STYLE_EMAIL_SERVER_PORT),
      user: process.env.RODRIGO_STYLE_EMAIL_SERVER_USER,
      pass: process.env.RODRIGO_STYLE_EMAIL_SERVER_PASS,
      from:
        process.env.RODRIGO_STYLE_EMAIL_FROM ||
        (process.env.RODRIGO_STYLE_EMAIL_SERVER_USER
          ? `${process.env.RODRIGO_STYLE_EMAIL_FROM_NAME || "Rodrigo Style"} <${process.env.RODRIGO_STYLE_EMAIL_SERVER_USER}>`
          : undefined),
    },
  },
};

export function getShopEmailIdentity(shopId: string | null | undefined) {
  if (!shopId) {
    return {};
  }

  return SHOP_EMAIL_IDENTITIES[shopId] || {};
}
