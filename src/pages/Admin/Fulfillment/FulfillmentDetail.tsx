import type React from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { ArrowLeft, ArrowRightLeft, Printer } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useStaffAccess } from "../../../hooks/useStaffAccess";
import { useStaffDirectory } from "../../../hooks/useStaffDirectory";
import { useAdminQuery } from "../../../hooks/useAdminQuery";
import { useOrderAction } from "../../../hooks/useOrderAction";
import { AdminDialog } from "../../../components/AdminDialog/AdminDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProductThumb } from "../../../components/ProductThumb";
import { useProductThumbnails } from "../../../hooks/useProductThumbnails";
import { AssigneeChip } from "./AssigneeChip";
import { FulfillmentFeedback } from "./FulfillmentFeedback";
import { FulfillmentStepper } from "./FulfillmentStepper";
import { PackingSlip } from "./PackingSlip";
import type { FulfillmentEvent } from "../../../types/orders.types";

const EVENT_LABELS: Record<FulfillmentEvent["kind"], string> = {
 claimed: "Preluată",
 released: "Eliberată",
 reassigned: "Realocată",
 checked: "Produs bifat",
 note: "Notiță",
 packed: "Ambalată",
 shipped: "Expediată",
 delivered: "Livrată",
 cancelled: "Anulată",
};

const formatDate = (timestamp: number): string =>
 new Date(timestamp).toLocaleDateString("ro-RO", {
 day: "2-digit",
 month: "2-digit",
 year: "numeric",
 hour: "2-digit",
 minute: "2-digit",
 });

export const FulfillmentDetail: React.FC = () => {
 const { id } = useParams<{ id: string }>();
 const { can, userId } = useStaffAccess();
 const userLabel = useStaffDirectory();
 const thumbnails = useProductThumbnails();
 const isAdmin = can("orders.manage");
 const controller = useOrderAction(userId);
 const order = useQuery(
 api.fulfillment.get,
 id ? { orderId: id as Id<"orders"> } : "skip",
 );
 const directory = useAdminQuery(api.staff.directory, isAdmin ? {} : "skip");
 const [note, setNote] = useState("");
 const [shipOpen, setShipOpen] = useState(false);
 const [awb, setAwb] = useState("");
 const [carrier, setCarrier] = useState("");
 const [reassignOpen, setReassignOpen] = useState(false);
 const [reassignTarget, setReassignTarget] = useState("");

 // Close dialogs / clear inputs only after the action is confirmed, so a
 // failed request never discards what the operator typed.
 useEffect(() => {
 const kind = controller.completed?.kind;
 if (kind === "reassigned") {
 setReassignOpen(false);
 setReassignTarget("");
 } else if (kind === "shipped") {
 setShipOpen(false);
 setAwb("");
 setCarrier("");
 } else if (kind === "note") {
 setNote("");
 }
 }, [controller.completed]);

 if (order === undefined) {
 return (
 <div className="flex items-center justify-center py-20">
 <p className="text-stone-500 dark:text-stone-400 ">Se încarcă comanda…</p>
 </div>
 );
 }

 if (order === null) {
 return (
 <div className="py-20 text-center">
 <p className="mb-4 text-stone-500 dark:text-stone-400 ">
 Comanda nu este în fluxul de pregătire comenzi.
 </p>
 <Link
 to="/admin/fulfillment"
 className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-400"
 >
 ← Înapoi la pregătire comenzi
 </Link>
 </div>
 );
 }

 const heldByOther =
 Boolean(order.assignedTo) && !order.assignedToMe && !isAdmin;
 const canAct = !controller.busy && !controller.blocked && controller.online;
 const allChecked =
 order.checklist.length > 0 && order.checklist.every((line) => line.checked);
 const quantityOf = (productId: Id<"products">) =>
 order.items.find((item) => item.productId === productId)?.quantity ?? 0;
 const eligibleStaff = (Array.isArray(directory.data) ? directory.data : [])
 .filter((entry) => entry.role !== "seller")
 .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email));
 // Who goes on the slip: the operator who packed it once packed, else the
 // current holder while the order is being prepared.
 const packerId =
 order.events.find((event) => event.kind === "packed")?.actorId ??
 order.assignedTo ??
 null;
 const packerLabel = packerId ? userLabel(packerId) : null;

 return (
 <section className="max-w-4xl space-y-6">
 <div>
 <Link
 to={`/admin/fulfillment?tab=${order.state === "delivered" ? "shipped" : order.state}`}
 className="mb-2 inline-flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400 transition-colors hover:text-stone-700 dark:hover:text-stone-300"
 >
 <ArrowLeft className="h-4 w-4" />
 Înapoi la pregătire comenzi
 </Link>
 <div className="flex flex-wrap items-center justify-between gap-3">
 <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50 ">
 Comanda <span className="font-mono">#{order.shortNumber}</span>
 </h1>
 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => window.print()}
 className="h-auto gap-1 rounded-lg px-3 py-1.5 text-sm font-medium"
 >
 <Printer className="h-4 w-4" />
 Printează lista
 </Button>
 {order.invoicePdfUrl ? (
 <Button
 asChild
 variant="outline"
 className="h-auto rounded-lg px-3 py-1.5 text-sm font-medium"
 >
 <a
 href={order.invoicePdfUrl}
 target="_blank"
 rel="noreferrer"
 >
 Deschide factura
 </a>
 </Button>
 ) : null}
 </div>
 </div>
 <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 ">
 Plasată {formatDate(order.createdAt)}
 </p>
 </div>

 <FulfillmentStepper
 state={order.state}
 createdAt={order.createdAt}
 assignedAt={order.assignedAt}
 packedAt={order.packedAt}
 shippedAt={order.shippedAt}
 deliveredAt={order.deliveredAt}
 />

 {order.assignedTo ? (
 <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 p-4">
 <div className="flex flex-wrap items-center gap-3">
 <AssigneeChip userId={order.assignedTo} mine={order.assignedToMe} />
 <p className="text-sm text-blue-900">
 Comanda este preluată de{" "}
 {order.assignedToMe ? "tine" : userLabel(order.assignedTo)}
 {order.assignedAt ? ` · din ${formatDate(order.assignedAt)}` : ""}
 .
 </p>
 </div>
 {isAdmin &&
 (order.state === "preparing" || order.state === "packed") ? (
 <Button
 type="button"
 variant="outline"
 disabled={!canAct}
 onClick={() => setReassignOpen(true)}
 className="h-auto gap-1.5 rounded-lg border-blue-300 bg-white dark:bg-stone-900 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-900"
 >
 <ArrowRightLeft className="h-4 w-4" />
 Realocă
 </Button>
 ) : null}
 </div>
 ) : null}

 <FulfillmentFeedback controller={controller} />

 {order.recipient ? (
 <Card className="rounded-lg">
 <CardContent className="p-5">
 <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 ">Destinatar</h2>
 <p className="mt-2 text-sm text-stone-900 dark:text-stone-50 ">
 {order.recipient.firstName} {order.recipient.lastName}
 </p>
 <p className="text-sm text-stone-700 dark:text-stone-300 ">
 {order.recipient.address.street}
 </p>
 <p className="text-sm text-stone-700 dark:text-stone-300 ">
 {order.recipient.address.city}, {order.recipient.address.county}{" "}
 {order.recipient.address.postalCode}
 </p>
 <p className="text-sm text-stone-700 dark:text-stone-300 ">
 {order.recipient.address.country}
 </p>
 </CardContent>
 </Card>
 ) : null}

 <Card className="rounded-lg">
 <CardContent className="p-5">
 <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 ">
 Lista de verificare
 </h2>
 <ul className="mt-3 space-y-2">
 {(order.checklist.length > 0
 ? order.checklist.map((line) => ({
 productId: line.productId,
 checked: line.checked,
 name:
 order.items.find((item) => item.productId === line.productId)
 ?.name ?? line.productId,
 quantity: quantityOf(line.productId),
 }))
 : order.items.map((item) => ({
 productId: item.productId,
 checked: false,
 name: item.name,
 quantity: item.quantity,
 }))
 ).map((line) => {
 const editable =
 order.state === "preparing" &&
 (order.assignedToMe || isAdmin) &&
 canAct;
 return (
 <li key={line.productId}>
 <label
 className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
 line.checked
 ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/50 "
 : "border-stone-200 dark:border-stone-800 "
 } ${editable ? "cursor-pointer" : "opacity-80"}`}
 >
 <Checkbox
 checked={line.checked}
 disabled={!editable}
 onCheckedChange={(checked) =>
 void controller.start({
 kind: "checked",
 orderId: order._id,
 productId: line.productId,
 checked: checked === true,
 })
 }
 className="h-5 w-5"
 />
 <ProductThumb
 src={thumbnails.get(line.productId)}
 alt={line.name}
 />
 <span
 className={`flex-1 text-sm ${
 line.checked
 ? "text-stone-500 dark:text-stone-400 line-through"
 : "text-stone-900 dark:text-stone-50 "
 }`}
 >
 {line.name}
 </span>
 <span className="text-sm text-stone-500 dark:text-stone-400 ">
 × {line.quantity}
 </span>
 </label>
 </li>
 );
 })}
 </ul>
 {order.checklist.length === 0 ? (
 <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 ">
 Checklistul se inițializează la preluarea comenzii.
 </p>
 ) : null}
 </CardContent>
 </Card>

 <Card className="rounded-lg">
 <CardContent className="p-5">
 <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 ">Acțiuni</h2>
 <div className="mt-3 flex flex-wrap gap-2">
 {order.state === "ready" ? (
 <Button
 type="button"
 disabled={!canAct}
 onClick={() =>
 void controller.start({
 kind: "claimed",
 orderId: order._id,
 })
 }
 className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium hover:bg-amber-700"
 >
 Preia
 </Button>
 ) : null}
 {order.state === "preparing" ? (
 <>
 <Button
 type="button"
 variant="outline"
 disabled={!canAct || heldByOther}
 onClick={() =>
 void controller.start({
 kind: "released",
 orderId: order._id,
 })
 }
 className="rounded-lg px-4 py-2 text-sm font-medium"
 >
 Eliberează
 </Button>
 <Button
 type="button"
 disabled={!canAct || heldByOther || !allChecked}
 title={
 !allChecked
 ? "Bifează toate produsele înainte de ambalare."
 : undefined
 }
 onClick={() =>
 void controller.start({
 kind: "packed",
 orderId: order._id,
 })
 }
 className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium hover:bg-amber-700"
 >
 Marchează ambalată
 </Button>
 </>
 ) : null}
 {order.state === "packed" ? (
 <Button
 type="button"
 disabled={!canAct || heldByOther}
 onClick={() => setShipOpen(true)}
 className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium hover:bg-amber-700"
 >
 Expediază
 </Button>
 ) : null}
 {order.state === "shipped" ? (
 <Button
 type="button"
 disabled={!canAct || heldByOther}
 onClick={() =>
 void controller.start({
 kind: "delivered",
 orderId: order._id,
 })
 }
 className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium hover:bg-amber-700"
 >
 Marchează livrată
 </Button>
 ) : null}
 {order.state !== "ready" &&
 !order.assignedToMe &&
 !isAdmin &&
 order.assignedTo ? (
 <p className="text-sm text-stone-500 dark:text-stone-400 ">
 Acțiunile sunt disponibile doar operatorului care a preluat
 comanda.
 </p>
 ) : null}
 </div>
 {order.awb || order.carrier ? (
 <p className="mt-3 text-sm text-stone-600 dark:text-stone-300 ">
 {order.carrier ? `Curier: ${order.carrier}` : ""}
 {order.carrier && order.awb ? " · " : ""}
 {order.awb ? `AWB: ${order.awb}` : ""}
 </p>
 ) : null}
 </CardContent>
 </Card>

 <Card className="rounded-lg">
 <CardContent className="p-5">
 <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 ">Notițe</h2>
 <div className="mt-3 flex flex-col gap-2 md:flex-row">
 <Label className="sr-only" htmlFor="order-note">
 Notiță nouă
 </Label>
 <Textarea
 id="order-note"
 value={note}
 onChange={(event) => setNote(event.target.value)}
 rows={2}
 maxLength={500}
 placeholder="Adaugă o notiță pentru echipă…"
 className="flex-1 rounded-lg px-3 py-2 text-sm"
 />
 <Button
 type="button"
 variant="outline"
 disabled={!canAct || note.trim().length < 3}
 onClick={() => {
 void controller.start({
 kind: "note",
 orderId: order._id,
 note: note.trim(),
 });
 }}
 className="rounded-lg px-4 py-2 text-sm font-medium"
 >
 Adaugă
 </Button>
 </div>
 </CardContent>
 </Card>

 <Card className="rounded-lg">
 <CardContent className="p-5">
 <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 ">Istoric</h2>
 {order.events.length === 0 ? (
 <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 ">
 Nicio acțiune înregistrată.
 </p>
 ) : (
 <ul className="mt-3 space-y-2">
 {order.events.map((event) => (
 <li
 key={event._id}
 className="flex flex-col gap-0.5 border-b border-stone-100 dark:border-stone-800 pb-2 text-sm last:border-b-0"
 >
 <span className="font-medium text-stone-800 dark:text-stone-100 ">
 {EVENT_LABELS[event.kind]}
 </span>
 <span className="text-xs text-stone-500 dark:text-stone-400 ">
 {formatDate(event.createdAt)} · {userLabel(event.actorId)}
 {event.data?.productId
 ? ` · ${
 order.items.find(
 (item) => item.productId === event.data?.productId,
 )?.name ?? event.data.productId
 }`
 : ""}
 {event.data?.toUser
 ? ` · ${userLabel(event.data.fromUser)} → ${userLabel(event.data.toUser)}`
 : ""}
 {event.data?.awb ? ` · AWB ${event.data.awb}` : ""}
 </span>
 {event.note ? (
 <span className="text-stone-600 dark:text-stone-300 ">{event.note}</span>
 ) : null}
 </li>
 ))}
 </ul>
 )}
 </CardContent>
 </Card>

 {shipOpen ? (
 <AdminDialog
 title="Expediază comanda"
 onClose={() => setShipOpen(false)}
 >
 <form
 onSubmit={(event) => {
 event.preventDefault();
 void controller.start({
 kind: "shipped",
 orderId: order._id,
 awb: awb.trim() || undefined,
 carrier: carrier.trim() || undefined,
 });
 }}
 className="space-y-4"
 >
 <div>
 <Label
 htmlFor="ship-awb"
 className="text-sm font-medium text-stone-700 dark:text-stone-300 "
 >
 AWB (opțional)
 </Label>
 <Input
 id="ship-awb"
 value={awb}
 onChange={(event) => setAwb(event.target.value)}
 placeholder="ex. AWB-12345"
 className="mt-1 h-auto w-full rounded-lg px-3 py-2 text-sm"
 />
 </div>
 <div>
 <Label
 htmlFor="ship-carrier"
 className="text-sm font-medium text-stone-700 dark:text-stone-300 "
 >
 Curier (opțional)
 </Label>
 <Input
 id="ship-carrier"
 value={carrier}
 onChange={(event) => setCarrier(event.target.value)}
 placeholder="ex. FAN Courier"
 maxLength={50}
 className="mt-1 h-auto w-full rounded-lg px-3 py-2 text-sm"
 />
 </div>
 <div className="flex justify-end gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setShipOpen(false)}
 className="rounded-lg px-4 py-2 text-sm font-medium"
 >
 Renunță
 </Button>
 <Button
 type="submit"
 disabled={!canAct}
 className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium hover:bg-amber-700"
 >
 Expediază
 </Button>
 </div>
 </form>
 </AdminDialog>
 ) : null}

 {reassignOpen ? (
 <AdminDialog
 title={`Realocă comanda #${order.shortNumber}`}
 onClose={() => setReassignOpen(false)}
 >
 <form
 onSubmit={(event) => {
 event.preventDefault();
 if (!reassignTarget) return;
 void controller.start({
 kind: "reassigned",
 orderId: order._id,
 userId: reassignTarget,
 });
 }}
 className="space-y-4"
 >
 <p className="text-sm text-stone-600 dark:text-stone-300 ">
 Alege operatorul care preia pregătirea comenzii. Istoricul
 păstrează cine a lucrat anterior la comandă.
 </p>
 <div>
 <Label
 htmlFor="reassign-target"
 className="text-sm font-medium text-stone-700 dark:text-stone-300 "
 >
 Operator
 </Label>
 <select
 id="reassign-target"
 value={reassignTarget}
 onChange={(event) => setReassignTarget(event.target.value)}
 className="mt-1 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
 >
 <option value="" disabled>
 Alege un operator…
 </option>
 {eligibleStaff.map((entry) => (
 <option
 key={entry.userId}
 value={entry.userId}
 disabled={entry.userId === order.assignedTo}
 >
 {entry.name ?? entry.email}
 {entry.userId === order.assignedTo ? " (curent)" : ""}
 </option>
 ))}
 </select>
 {directory.data === undefined ? (
 <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 ">
 Se încarcă echipa…
 </p>
 ) : eligibleStaff.length === 0 ? (
 <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 ">
 Nicio persoană eligibilă în echipă. Adaugă operatori din
 pagina Echipă.
 </p>
 ) : null}
 </div>
 <div className="flex justify-end gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setReassignOpen(false)}
 className="rounded-lg px-4 py-2 text-sm font-medium"
 >
 Renunță
 </Button>
 <Button
 type="submit"
 disabled={!canAct || !reassignTarget}
 className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium hover:bg-amber-700"
 >
 Realocă
 </Button>
 </div>
 </form>
 </AdminDialog>
 ) : null}

 <PackingSlip order={order} packerLabel={packerLabel} />
 </section>
 );
};

export default FulfillmentDetail;
