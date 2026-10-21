import { ConvexError } from "convex/values";

interface SaleLine<T extends string> {
  productId: T;
  quantity: number;
  expectedUnitPriceCents: number;
}

interface SaleProduct<T extends string> {
  productId: T;
  name: string;
  price: number;
  stock: number;
}

export const positiveInteger = (value: number) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ConvexError("Cantitatea trebuie sa fie un numar intreg pozitiv.");
  }
};

export const toCents = (price: number) => {
  const cents = Math.round(price * 100);
  if (!Number.isFinite(price) || price < 0 || !Number.isSafeInteger(cents)) {
    throw new ConvexError("Pret invalid.");
  }
  return cents;
};

export const businessDate = (timestamp: number) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(timestamp);
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export const buildSale = <T extends string>(
  lines: SaleLine<T>[],
  products: SaleProduct<T>[],
  discountCents: number,
  discountReason: string,
) => {
  if (lines.length === 0 || lines.length > 200) {
    throw new ConvexError("Selecteaza intre 1 si 200 de produse.");
  }
  const seen = new Set<T>();
  const byId = new Map(products.map((product) => [product.productId, product]));
  const items = lines.map((line) => {
    positiveInteger(line.quantity);
    if (seen.has(line.productId))
      throw new ConvexError("Produs duplicat in comanda.");
    seen.add(line.productId);
    const product = byId.get(line.productId);
    if (!product) throw new ConvexError("Un produs nu mai exista.");
    const unitPriceCents = toCents(product.price);
    if (unitPriceCents !== line.expectedUnitPriceCents) {
      throw new ConvexError(
        `Pretul pentru ${product.name} s-a schimbat. Verifica plata inainte de a continua.`,
      );
    }
    if (!Number.isSafeInteger(product.stock) || product.stock < line.quantity) {
      throw new ConvexError(
        `Stoc insuficient la targ pentru ${product.name}: ${product.stock} buc.`,
      );
    }
    return {
      productId: line.productId,
      name: product.name,
      quantity: line.quantity,
      unitPriceCents,
    };
  });
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );
  if (
    !Number.isSafeInteger(subtotalCents) ||
    !Number.isSafeInteger(discountCents) ||
    discountCents < 0 ||
    discountCents > subtotalCents
  ) {
    throw new ConvexError("Reducere sau total invalid.");
  }
  if (discountCents > 0 && !discountReason.trim()) {
    throw new ConvexError("Introdu motivul reducerii.");
  }
  if (discountReason.length > 500)
    throw new ConvexError("Motivul reducerii este prea lung.");
  return {
    items,
    subtotalCents,
    discountCents,
    discountReason: discountReason.trim(),
    totalCents: subtotalCents - discountCents,
  };
};
