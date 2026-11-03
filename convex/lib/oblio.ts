type Address = {
  street: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;
};

export type OrderWithCustomer = {
  _id: string;
  items: { productId: string; name: string; price: number; quantity: number }[];
  total: number;
  invoiceId?: string;
  invoicePdfUrl?: string;
  shipping?: { firstName: string; lastName: string; phone?: string; address: Address };
  billing?: { firstName: string; lastName: string; phone?: string; address: Address };
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    shippingAddress: Address;
    billingAddress: Address;
  };
};

type OblioInvoiceResponse = {
  seriesName: string;
  number: string;
  link: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readJson = async (response: Response): Promise<unknown> => {
  if (!response.ok) throw new Error("Oblio request rejected");
  try {
    return await response.json();
  } catch {
    throw new Error("Invalid Oblio response");
  }
};

export const createOblioInvoice = async (
  order: OrderWithCustomer,
  apiEmail: string,
  apiSecret: string,
  cif: string,
): Promise<OblioInvoiceResponse> => {
  const tokenResult = await readJson(await fetch("https://www.oblio.eu/api/authorize/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: apiEmail,
      client_secret: apiSecret,
    }).toString(),
  }));
  if (
    !isRecord(tokenResult) ||
    typeof tokenResult.access_token !== "string" ||
    !tokenResult.access_token.trim() ||
    /[\r\n]/.test(tokenResult.access_token) ||
    typeof tokenResult.token_type !== "string" ||
    tokenResult.token_type.toLowerCase() !== "bearer"
  ) {
    throw new Error("Invalid Oblio authorization response");
  }

  const billing = order.billing ?? {
    firstName: order.customer.firstName,
    lastName: order.customer.lastName,
    phone: order.customer.phone,
    address: order.customer.billingAddress,
  };
  const payload = {
    cif,
    client: {
      cif: "",
      name: `${billing.firstName} ${billing.lastName}`,
      address: billing.address.street,
      city: billing.address.city,
      state: billing.address.county,
      country: billing.address.country,
      email: order.customer.email,
      phone: billing.phone ?? order.shipping?.phone ?? order.customer.phone ?? "",
      vatPayer: 0,
    },
    issueDate: new Date().toISOString().split("T")[0],
    currency: "RON",
    language: "RO",
    products: order.items.map((item) => ({
      name: item.name,
      price: item.price,
      measuringUnit: "buc",
      currency: "RON",
      vatIncluded: 1,
      quantity: item.quantity,
      productType: "Produs",
    })),
    workStation: "Sediu",
  };
  const result = await readJson(await fetch("https://www.oblio.eu/api/docs/invoice", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenResult.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }));
  if (
    !isRecord(result) || result.status !== 200 || !isRecord(result.data) ||
    typeof result.data.seriesName !== "string" || !result.data.seriesName.trim() ||
    (typeof result.data.number !== "string" && typeof result.data.number !== "number") ||
    !String(result.data.number).trim() ||
    (typeof result.data.number === "number" && !Number.isFinite(result.data.number)) ||
    typeof result.data.link !== "string"
  ) {
    throw new Error("Invalid Oblio invoice response");
  }
  let link: URL;
  try {
    link = new URL(result.data.link);
  } catch {
    throw new Error("Invalid Oblio invoice link");
  }
  if (link.protocol !== "https:" || link.username || link.password) {
    throw new Error("Invalid Oblio invoice link");
  }
  return {
    seriesName: result.data.seriesName,
    number: String(result.data.number),
    link: link.href,
  };
};
