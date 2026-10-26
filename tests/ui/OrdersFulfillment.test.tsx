import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getFunctionName } from "convex/server";
import { Toaster } from "../../src/components/ui/sonner";
import assert from "node:assert/strict";
import { it, mock } from "node:test";
import type { Id } from "../../convex/_generated/dataModel";

const staffAdmin = { role: "admin", userId: "admin-1", homePath: "/admin" };
const staffAtelier = {
  role: "atelier",
  userId: "user_at",
  homePath: "/admin",
};
const staffSeller = { role: "seller", userId: "seller-1", homePath: "/admin" };

let staff = staffAdmin;
let listAdminRows: unknown[] = [];
let adminDetail: unknown = null;

const queryMock = mock.fn<(reference: unknown, args?: unknown) => unknown>(
  () => undefined,
);
const mutation = mock.fn<
  (reference: unknown, args: unknown) => Promise<unknown>
>(async () => ({}));
const convexQuery = mock.fn<(reference: unknown, args: unknown) => unknown>(
  async () => null,
);
const convexClient = { query: convexQuery, mutation };
const adminQuery = mock.fn<(query: unknown, args: unknown) => unknown>(
  (query) => {
    const name = getFunctionName(query as never);
    if (name === "orders:listAdmin")
      return { data: listAdminRows, error: null };
    if (name === "orders:getAdmin") return { data: adminDetail, error: null };
    if (name === "staff:directory") return { data: directoryRows, error: null };
    return { data: null, error: null };
  },
);

mock.module("@clerk/clerk-react", {
  namedExports: {
    useUser: () => ({ user: { id: "user_1" } }),
    UserButton: () => null,
  },
});
mock.module("convex/react", {
  namedExports: {
    useQuery: queryMock,
    useMutation: () => mutation,
    useConvex: () => convexClient,
    usePaginatedQuery: () => ({
      results: [],
      status: "Exhausted",
      loadMore: () => {},
    }),
    useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
    useConvexConnectionState: () => ({ isWebSocketConnected: true }),
  },
});
mock.module(new URL("../../src/hooks/useAdminQuery.ts", import.meta.url).href, {
  namedExports: { useAdminQuery: adminQuery },
});
mock.module(
  new URL(
    "../../src/pages/Admin/Orders/InventoryReviewSummary.tsx",
    import.meta.url,
  ).href,
  { namedExports: { InventoryReviewSummary: () => null } },
);
mock.module(
  new URL(
    "../../src/pages/Admin/Orders/OrderInventoryReview.tsx",
    import.meta.url,
  ).href,
  { namedExports: { OrderInventoryReview: () => null } },
);

const { AdminOrders } =
  await import("../../src/pages/Admin/Orders/AdminOrders.tsx");
const { OrderDetail } =
  await import("../../src/pages/Admin/Orders/OrderDetail.tsx");
const { FulfillmentQueue } =
  await import("../../src/pages/Admin/Fulfillment/FulfillmentQueue.tsx");
const { FulfillmentDetail } =
  await import("../../src/pages/Admin/Fulfillment/FulfillmentDetail.tsx");
const { AdminLayout } = await import("../../src/pages/Admin/AdminLayout.tsx");

const orderId = "order-00000001" as Id<"orders">;

const eventDoc = (kind = "claimed") => ({
  _id: "ev-1" as never,
  _creationTime: 1,
  orderId,
  requestId: "req-1",
  actorId: "user_at",
  kind,
  createdAt: 1,
});

const queueRow = (overrides = {}) => ({
  _id: orderId,
  shortNumber: "00000001",
  createdAt: 1,
  state: "ready",
  assignedTo: undefined,
  assignedAt: undefined,
  assignedToMe: false,
  itemCount: 1,
  units: 2,
  checklistTotal: 0,
  checkedCount: 0,
  recipientName: "Ion Popescu",
  packedAt: undefined,
  shippedAt: undefined,
  awb: undefined,
  carrier: undefined,
  ...overrides,
});

const fulfillmentDetail = (overrides = {}) => ({
  _id: orderId,
  shortNumber: "00000001",
  createdAt: 1,
  state: "preparing",
  assignedTo: "user_at",
  assignedAt: 2,
  assignedToMe: true,
  packedAt: undefined,
  shippedAt: undefined,
  deliveredAt: undefined,
  items: [
    {
      productId: "magnet" as Id<"products">,
      name: "Magnet Sibiu",
      price: 25,
      quantity: 2,
    },
  ],
  total: 50,
  checklist: [{ productId: "magnet" as Id<"products">, checked: false }],
  recipient: {
    firstName: "Prenume",
    lastName: "Nume",
    address: {
      street: "Str. Florilor 1",
      city: "Sibiu",
      county: "SB",
      postalCode: "550001",
      country: "RO",
    },
  },
  awb: undefined,
  carrier: undefined,
  events: [],
  invoicePdfUrl: undefined,
  ...overrides,
});

const adminRow = (index: number, overrides = {}) => ({
  _id: `order-${String(index).padStart(8, "0")}` as Id<"orders">,
  _creationTime: 1,
  shortNumber: `NUM${String(index).padStart(5, "0")}`,
  createdAt: index,
  total: 50,
  status: "paid",
  stripeSessionId: `sess-${index}`,
  items: [],
  customerId: "cust-1",
  paymentStatus: "paid",
  fulfillmentState: "ready",
  itemCount: 2,
  customer: {
    firstName: "Ion",
    lastName: `Popescu${index}`,
    email: `client${index}@exemplu.ro`,
  },
  ...overrides,
});

const adminOrderDetail = () => ({
  _id: orderId,
  _creationTime: 1,
  shortNumber: "00000001",
  createdAt: 1,
  total: 50,
  status: "paid",
  paymentStatus: "paid",
  fulfillmentState: "preparing",
  stripeSessionId: "sess-1",
  assignedTo: "user_at",
  items: [
    {
      productId: "magnet" as Id<"products">,
      name: "Magnet Sibiu",
      price: 25,
      quantity: 2,
    },
  ],
  inventoryStatus: "applied",
  customerId: "cust-1" as Id<"customers">,
  customer: {
    _id: "cust-1",
    firstName: "Ion",
    lastName: "Popescu",
    email: "client@exemplu.ro",
    billingAddress: null,
  },
  shipping: {
    firstName: "Ion",
    lastName: "Popescu",
    address: {
      street: "Str. Florilor 1",
      city: "Sibiu",
      county: "SB",
      postalCode: "550001",
      country: "RO",
    },
  },
  shippingSource: "snapshot",
  events: [],
  invoicePdfUrl: undefined,
});

const setup = () => {
  directoryRows = [];
  queryMock.mock.resetCalls();
  mutation.mock.resetCalls();
  mutation.mock.mockImplementation(async () => ({}));
  convexQuery.mock.resetCalls();
  convexQuery.mock.mockImplementation(async (reference) => {
    if (getFunctionName(reference as never) === "fulfillment:getEvent")
      return eventDoc();
    return null;
  });
  adminQuery.mock.resetCalls();
  queryMock.mock.mockImplementation((reference) => {
    switch (getFunctionName(reference as never)) {
      case "staff:me":
        return staff;
      case "fulfillment:queue":
        return queueData;
      case "transfers:list":
        return restockData;
      case "fulfillment:get":
        return detailData;
      default:
        return undefined;
    }
  });
};

let queueData: unknown[] = [];
let restockData: unknown[] = [];
let detailData: unknown = null;
let directoryRows: unknown[] = [];

const navTree = (
  <Routes>
    <Route element={<AdminLayout />}>
      <Route index element={<p>conținut</p>} />
    </Route>
  </Routes>
);

it("AdminOrders filtrează după căutare, stare plată și paginează", async () => {
  const user = userEvent.setup();
  staff = staffAdmin;
  listAdminRows = Array.from({ length: 30 }, (_, index) =>
    adminRow(index, index === 7 ? { paymentStatus: "pending" } : {}),
  );
  setup();
  render(
    <MemoryRouter>
      <AdminOrders />
    </MemoryRouter>,
  );
  // 25 rows on page 1 of 2.
  await screen.findByText("#NUM00000");
  assert.ok(screen.getByText("Pagina 1 din 2"));
  await user.click(screen.getByRole("button", { name: "Înainte" }));
  await screen.findByText("#NUM00025");
  assert.ok(screen.getByText("Pagina 2 din 2"));

  // Payment filter narrows to the single unpaid order.
  await user.selectOptions(screen.getByLabelText("Stare plată"), "pending");
  await screen.findByText("#NUM00007");
  assert.equal(screen.queryByText("#NUM00025"), null);

  // Search by customer name.
  await user.selectOptions(screen.getByLabelText("Stare plată"), "all");
  await user.type(screen.getByLabelText("Caută"), "Popescu12");
  await screen.findByText("#NUM00012");
  assert.equal(screen.queryByText("#NUM00011"), null);
});

it('OrderDetail nu are select de stare sau „marchează plătită"; anularea cere motiv', async () => {
  const user = userEvent.setup();
  staff = staffAdmin;
  adminDetail = adminOrderDetail();
  setup();
  render(
    <MemoryRouter initialEntries={[`/admin/orders/${orderId}`]}>
      <Routes>
        <Route path="/admin/orders/:id" element={<OrderDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText("Comanda #00000001");
  assert.equal(screen.queryByRole("combobox"), null);
  assert.equal(
    screen.queryByRole("button", { name: /marchează plătită/i }),
    null,
  );
  assert.ok(screen.getAllByText("50.00 RON").length >= 1);

  await user.click(screen.getByRole("button", { name: "Anulează comanda" }));
  const dialog = await screen.findByRole("dialog");
  const submit = within(dialog).getByRole("button", {
    name: "Anulează comanda",
  });
  assert.ok((submit as HTMLButtonElement).disabled);
  await user.type(
    within(dialog).getByLabelText(/Motivul anulării/),
    "Clientul a renunțat.",
  );
  assert.ok(!(submit as HTMLButtonElement).disabled);
  await user.click(submit);
  await waitFor(() => assert.equal(mutation.mock.callCount(), 1));
  assert.equal(
    getFunctionName(mutation.mock.calls[0].arguments[0] as never),
    "orders:cancel",
  );
});

it("FulfillmentQueue afișează taburile și secțiunea de reaprovizionare", async () => {
  staff = staffAtelier;
  queueData = [queueRow()];
  restockData = [
    {
      _id: "tr-1",
      lines: [],
      fromName: "Atelier",
      toName: "Târg Crăciun",
      lineCount: 2,
      totalUnits: 5,
    },
  ];
  setup();
  render(
    <MemoryRouter>
      <FulfillmentQueue />
    </MemoryRouter>,
  );
  for (const tab of [
    "De pregătit",
    "În pregătire",
    "Ambalate",
    "Expediate recent",
  ]) {
    assert.ok(screen.getByRole("tab", { name: tab }));
  }
  await screen.findByText("Solicitări de reaprovizionare");
  assert.ok(screen.getByRole("link", { name: /Transfer #/ }));
});

it("FulfillmentDetail blochează ambalarea până bifăm checklistul", async () => {
  const user = userEvent.setup();
  staff = staffAtelier;
  queueData = [];
  restockData = [];
  detailData = fulfillmentDetail();
  setup();
  render(
    <MemoryRouter initialEntries={[`/admin/fulfillment/${orderId}`]}>
      <Routes>
        <Route path="/admin/fulfillment/:id" element={<FulfillmentDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  const pack = await screen.findByRole("button", {
    name: "Marchează ambalată",
  });
  assert.ok((pack as HTMLButtonElement).disabled);
  await user.click(screen.getByRole("checkbox"));
  await waitFor(() => assert.equal(mutation.mock.callCount(), 1));
  assert.equal(
    getFunctionName(mutation.mock.calls[0].arguments[0] as never),
    "fulfillment:setChecked",
  );
});

it("operatorul care nu a preluat comanda vede acțiunile dezactivate", async () => {
  staff = staffAtelier;
  detailData = fulfillmentDetail({
    assignedTo: "user_b",
    assignedToMe: false,
  });
  setup();
  render(
    <MemoryRouter initialEntries={[`/admin/fulfillment/${orderId}`]}>
      <Routes>
        <Route path="/admin/fulfillment/:id" element={<FulfillmentDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText(/preluată de user_b/);
  assert.ok(
    (screen.getByRole("button", { name: "Eliberează" }) as HTMLButtonElement)
      .disabled,
  );
  assert.ok(
    (
      screen.getByRole("button", {
        name: "Marchează ambalată",
      }) as HTMLButtonElement
    ).disabled,
  );
});

it("dublu click pe Preia declanșează o singură mutație", async () => {
  const user = userEvent.setup();
  staff = staffAtelier;
  queueData = [queueRow()];
  restockData = [];
  setup();
  let resolveMutation: ((value: unknown) => void) | undefined;
  mutation.mock.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveMutation = resolve;
      }),
  );
  render(
    <MemoryRouter>
      <FulfillmentQueue />
    </MemoryRouter>,
  );
  const claim = await screen.findByRole("button", { name: "Preia" });
  await user.dblClick(claim);
  await waitFor(() => assert.equal(mutation.mock.callCount(), 1));
  assert.equal(
    getFunctionName(mutation.mock.calls[0].arguments[0] as never),
    "fulfillment:claim",
  );
  resolveMutation?.(queueRow({ state: "preparing", assignedToMe: true }));
});

it("eroare de rețea → Reîncearcă refolosește același requestId", async () => {
  const user = userEvent.setup();
  staff = staffAtelier;
  queueData = [queueRow()];
  restockData = [];
  setup();
  mutation.mock.mockImplementationOnce(async () => {
    throw new Error("network down");
  });
  render(
    <MemoryRouter>
      <FulfillmentQueue />
    </MemoryRouter>,
  );
  await user.click(await screen.findByRole("button", { name: "Preia" }));
  const retry = await screen.findByRole("button", { name: /Reîncearcă/ });
  const firstRequestId = (
    mutation.mock.calls[0].arguments[1] as { requestId: string }
  ).requestId;
  await user.click(retry);
  await waitFor(() => assert.equal(mutation.mock.callCount(), 2));
  const secondRequestId = (
    mutation.mock.calls[1].arguments[1] as { requestId: string }
  ).requestId;
  assert.equal(secondRequestId, firstRequestId);
});

it('după Preia comanda trece vizibil la „În pregătire" cu toast de confirmare', async () => {
  const user = userEvent.setup();
  staff = staffAtelier;
  queueData = [queueRow()];
  restockData = [];
  setup();
  render(
    <MemoryRouter>
      <Toaster />
      <FulfillmentQueue />
    </MemoryRouter>,
  );
  await user.click(await screen.findByRole("button", { name: "Preia" }));
  // Tab switches so the claimed order's new home is visible, not silent.
  await waitFor(() =>
    assert.equal(
      screen
        .getByRole("tab", { name: "În pregătire" })
        .getAttribute("aria-selected"),
      "true",
    ),
  );
  await screen.findByText(/a fost preluată/);
  assert.ok(screen.getByRole("link", { name: "Deschide comanda" }));
});

it("coada anunță când alt operator preia o comandă", async () => {
  staff = staffAtelier;
  queueData = [queueRow()];
  restockData = [];
  setup();
  const { rerender } = render(
    <MemoryRouter>
      <Toaster />
      <FulfillmentQueue />
    </MemoryRouter>,
  );
  await screen.findByRole("button", { name: "Preia" });
  // Someone else claims the order while we watch the queue.
  queueData = [
    queueRow({
      state: "preparing",
      assignedTo: "user_b",
      assignedToMe: false,
    }),
  ];
  rerender(
    <MemoryRouter>
      <Toaster />
      <FulfillmentQueue />
    </MemoryRouter>,
  );
  await screen.findByText(/a preluat comanda #00000001/);
});

it('stripul „Cine lucrează acum" arată operatorii cu comenzi', async () => {
  staff = staffAdmin;
  queueData = [
    queueRow({
      state: "preparing",
      assignedTo: "user_at",
      assignedToMe: false,
      assignedAt: 5,
    }),
    queueRow({
      _id: "order-00000002" as Id<"orders">,
      shortNumber: "00000002",
      state: "packed",
      assignedTo: "user_at",
      assignedAt: 4,
      assignedToMe: false,
    }),
  ];
  restockData = [];
  setup();
  render(
    <MemoryRouter>
      <FulfillmentQueue />
    </MemoryRouter>,
  );
  await screen.findByText("Cine lucrează acum");
  const strip = screen.getByLabelText("Operatori activi");
  assert.ok(within(strip).getByText(/user_at/));
  assert.ok(within(strip).getByText(/2 comenzi/));
});

it("adminul poate realoca comanda din pagina de detalii", async () => {
  const user = userEvent.setup();
  staff = staffAdmin;
  detailData = fulfillmentDetail({
    assignedTo: "user_at",
    assignedToMe: false,
  });
  setup();
  directoryRows = [
    {
      userId: "user_b",
      email: "maria@exemplu.ro",
      name: "Maria",
      role: "atelier",
    },
  ];
  render(
    <MemoryRouter initialEntries={[`/admin/fulfillment/${orderId}`]}>
      <Routes>
        <Route path="/admin/fulfillment/:id" element={<FulfillmentDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  await user.click(await screen.findByRole("button", { name: "Realocă" }));
  const dialog = await screen.findByRole("dialog");
  await user.selectOptions(within(dialog).getByLabelText("Operator"), "user_b");
  await user.click(within(dialog).getByRole("button", { name: "Realocă" }));
  await waitFor(() => assert.equal(mutation.mock.callCount(), 1));
  assert.equal(
    getFunctionName(mutation.mock.calls[0].arguments[0] as never),
    "fulfillment:reassign",
  );
  assert.equal(
    (mutation.mock.calls[0].arguments[1] as { userId: string }).userId,
    "user_b",
  );
});

it("pagina de detalii conține foaia de ambalare pentru print", async () => {
  staff = staffAtelier;
  detailData = fulfillmentDetail();
  setup();
  render(
    <MemoryRouter initialEntries={[`/admin/fulfillment/${orderId}`]}>
      <Routes>
        <Route path="/admin/fulfillment/:id" element={<FulfillmentDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText("Lista de verificare");
  // The slip is portaled to document.body so print CSS can isolate it.
  const slip = document.querySelector(".packing-slip");
  assert.ok(slip);
  const text = slip.textContent ?? "";
  assert.ok(text.includes("Foaie de ambalare"));
  assert.ok(text.includes("#00000001"));
  assert.ok(text.includes("Magnet Sibiu"));
  assert.ok(text.includes("25.00 RON"));
  assert.ok(text.includes("50.00 RON"));
  assert.ok(text.includes("Prenume"));
  assert.ok(text.includes("Str. Florilor 1"));
  assert.ok(text.includes("Pregătită de"));
  assert.ok(text.includes("user_at"));
});

it("atelier vede Pregătire comenzi, nu Comenzi; seller nu vede niciuna", async () => {
  staff = staffAtelier;
  setup();
  const { unmount } = render(<MemoryRouter>{navTree}</MemoryRouter>);
  const labels = screen
    .getAllByRole("link")
    .map((link) => link.textContent?.trim());
  assert.ok(labels.includes("Pregătire comenzi"));
  assert.ok(!labels.includes("Comenzi"));
  unmount();

  staff = staffSeller;
  render(<MemoryRouter>{navTree}</MemoryRouter>);
  const sellerLabels = screen
    .getAllByRole("link")
    .map((link) => link.textContent?.trim());
  assert.ok(!sellerLabels.includes("Pregătire comenzi"));
  assert.ok(!sellerLabels.includes("Comenzi"));
});
