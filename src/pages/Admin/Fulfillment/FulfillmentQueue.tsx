import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import {
 ChevronRight,
 ClipboardCheck,
 Clock,
 Inbox,
 Package,
 Truck,
 Users,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useStaffAccess } from "../../../hooks/useStaffAccess";
import { useStaffDirectory } from "../../../hooks/useStaffDirectory";
import { useOrderAction } from "../../../hooks/useOrderAction";
import type { FulfillmentQueueItem } from "../../../types/orders.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AssigneeChip } from "./AssigneeChip";
import { FulfillmentFeedback } from "./FulfillmentFeedback";
import { useQueueActivity } from "./useQueueActivity";
import { STATE_LABELS } from "./fulfillmentLabels";

type Tab = "ready" | "preparing" | "packed" | "shipped";

const TABS: readonly {
 key: Tab;
 label: string;
 hint: string;
 icon: React.ElementType;
 activeClass: string;
 pillClass: string;
}[] = [
 {
 key: "ready",
 label: "De pregătit",
 hint: "Comenzi plătite care așteaptă preluare",
 icon: Inbox,
 activeClass: "bg-amber-600 text-white shadow-soft",
 pillClass: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 ",
 },
 {
 key: "preparing",
 label: "În pregătire",
 hint: "Comenzi preluate, cu checklist în lucru",
 icon: ClipboardCheck,
 activeClass: "bg-blue-600 text-white shadow-soft",
 pillClass: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 ",
 },
 {
 key: "packed",
 label: "Ambalate",
 hint: "Gata de predat curierului",
 icon: Package,
 activeClass: "bg-indigo-600 text-white shadow-soft",
 pillClass: "bg-indigo-100 text-indigo-800",
 },
 {
 key: "shipped",
 label: "Expediate recent",
 hint: "Predate curierului în ultimele 30 de zile",
 icon: Truck,
 activeClass: "bg-emerald-600 text-white shadow-soft",
 pillClass: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 ",
 },
];

const STATE_COLORS: Record<string, string> = {
 ready: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 ",
 preparing: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 ",
 packed: "bg-indigo-100 text-indigo-800",
 shipped: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 ",
 delivered: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 ",
 cancelled: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 ",
 blocked: "bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 ",
};

const STATE_ACCENTS: Record<string, string> = {
 ready: "border-l-amber-400",
 preparing: "border-l-blue-400",
 packed: "border-l-indigo-400",
 shipped: "border-l-emerald-400",
};

const isTab = (value: string | null): value is Tab =>
 TABS.some((tab) => tab.key === value);

const formatDate = (timestamp: number): string =>
 new Date(timestamp).toLocaleDateString("ro-RO", {
 day: "2-digit",
 month: "2-digit",
 year: "numeric",
 hour: "2-digit",
 minute: "2-digit",
 });

const relativeAge = (timestamp: number, now: number): string => {
 const minutes = Math.max(0, Math.round((now - timestamp) / 60000));
 if (minutes < 1) return "chiar acum";
 if (minutes < 60) return `acum ${minutes} min`;
 const hours = Math.floor(minutes / 60);
 if (hours < 24) return `acum ${hours} h`;
 const days = Math.floor(hours / 24);
 return `acum ${days} ${days === 1 ? "zi" : "zile"}`;
};

export const FulfillmentQueue: React.FC = () => {
 const { userId, can } = useStaffAccess();
 const userLabel = useStaffDirectory();
 const controller = useOrderAction(userId);
 const orders = useQuery(api.fulfillment.queue, {});
 const restock = useQuery(
 api.transfers.list,
 can("transfers.view") ? { status: "requested" as const } : "skip",
 );
 const [searchParams, setSearchParams] = useSearchParams();
 const tabParam = searchParams.get("tab");
 const tab: Tab = isTab(tabParam) ? tabParam : "ready";
 const [flashId, setFlashId] = useState<Id<"orders"> | null>(null);
 const handledEvent = useRef<string | null>(null);
 const activity = useQueueActivity(orders, userId, userLabel);

 const counts = useMemo(() => {
 const tally: Record<Tab, number> = {
 ready: 0,
 preparing: 0,
 packed: 0,
 shipped: 0,
 };
 for (const order of orders ?? []) {
 if (order.state in tally) tally[order.state as Tab] += 1;
 }
 return tally;
 }, [orders]);

 const team = useMemo(() => {
 const byUser = new Map<
 string,
 { userId: string; preparing: number; packed: number; since: number }
 >();
 for (const order of orders ?? []) {
 if (
 !order.assignedTo ||
 (order.state !== "preparing" && order.state !== "packed")
 )
 continue;
 const entry = byUser.get(order.assignedTo) ?? {
 userId: order.assignedTo,
 preparing: 0,
 packed: 0,
 since: Number.POSITIVE_INFINITY,
 };
 if (order.state === "preparing") entry.preparing += 1;
 if (order.state === "packed") entry.packed += 1;
 if (order.assignedAt && order.assignedAt < entry.since)
 entry.since = order.assignedAt;
 byUser.set(order.assignedTo, entry);
 }
 return [...byUser.values()].sort(
 (a, b) => b.preparing + b.packed - (a.preparing + a.packed),
 );
 }, [orders]);

 // After a successful claim the order "moves" to În pregătire: follow it
 // there so the transition is visible instead of a silent disappearance.
 useEffect(() => {
 const event = controller.completed;
 if (!event || event.requestId === handledEvent.current) return;
 handledEvent.current = event.requestId;
 if (event.kind === "claimed") {
 setFlashId(event.orderId);
 if (tab !== "preparing")
 setSearchParams({ tab: "preparing" }, { replace: true });
 } else if (event.kind === "released" && tab !== "ready") {
 setSearchParams({ tab: "ready" }, { replace: true });
 }
 }, [controller.completed, tab, setSearchParams]);

 useEffect(() => {
 if (!flashId) return;
 const timer = setTimeout(() => setFlashId(null), 5000);
 return () => clearTimeout(timer);
 }, [flashId]);

 if (orders === undefined) {
 return (
 <div className="flex items-center justify-center py-20">
 <p className="text-stone-500 dark:text-stone-400 ">Se încarcă comenzile…</p>
 </div>
 );
 }

 const rows = orders.filter((order) => order.state === tab);
 const activeTab = TABS.find((entry) => entry.key === tab)!;
 const ActiveTabIcon = activeTab.icon;
 const now = Date.now();

 const claim = (order: FulfillmentQueueItem) => {
 void controller.start({ kind: "claimed", orderId: order._id });
 };

 return (
 <section className="max-w-5xl space-y-6">
 <header className="flex flex-wrap items-end justify-between gap-3">
 <div>
 <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50 ">
 Pregătire comenzi
 </h1>
 <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 ">
 Pregătirea, ambalarea și expedierea comenzilor plătite.
 </p>
 </div>
 {counts.ready > 0 ? (
 <Badge
 variant="warning"
 className="px-3 py-1 text-sm font-semibold"
 >
 {counts.ready} de pregătit
 </Badge>
 ) : null}
 </header>

 <FulfillmentFeedback
 controller={controller}
 activity={activity.notice}
 onActivityDismiss={activity.dismiss}
 />

 <nav
 role="tablist"
 aria-label="Stare pregătire comenzi"
 className="grid grid-cols-2 gap-2 md:flex md:items-stretch"
 >
 {TABS.map(({ key, label, icon: Icon, activeClass }, index) => (
 <div key={key} className="contents">
 {index > 0 ? (
 <ChevronRight
 aria-hidden="true"
 className="hidden h-4 w-4 self-center text-stone-300 md:block"
 />
 ) : null}
 <Button
 type="button"
 variant="ghost"
 role="tab"
 id={`fulfillment-tab-${key}`}
 aria-selected={tab === key}
 aria-controls="fulfillment-panel"
 onClick={() => setSearchParams({ tab: key })}
 className={`flex h-auto items-center gap-2.5 whitespace-normal rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-all md:flex-1 ${
 tab === key
 ? activeClass
 : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300 hover:shadow-soft"
 }`}
 >
 <Icon
 className={`h-4 w-4 shrink-0 ${tab === key ? "" : "text-stone-400 dark:text-stone-500 "}`}
 />
 <span className="min-w-0 flex-1 truncate">{label}</span>
 <span
 aria-hidden="true"
 className={`rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums ${
 tab === key
 ? "bg-white/25 dark:bg-stone-900/25 text-white"
 : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 "
 }`}
 >
 {counts[key]}
 </span>
 </Button>
 </div>
 ))}
 </nav>
 <p className="-mt-3 text-xs text-stone-400 dark:text-stone-500 ">{activeTab.hint}</p>

 {team.length > 0 ? (
 <section
 aria-label="Operatori activi"
 className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3"
 >
 <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400 ">
 <Users className="h-4 w-4" />
 Cine lucrează acum
 </h2>
 <ul className="mt-2 flex flex-wrap gap-2">
 {team.map((member) => (
 <li
 key={member.userId}
 className="flex items-center gap-2 rounded-lg bg-stone-50 dark:bg-stone-800 px-2 py-1.5"
 >
 <AssigneeChip
 userId={member.userId}
 mine={member.userId === userId}
 />
 <span className="text-xs text-stone-500 dark:text-stone-400 ">
 {member.preparing + member.packed}{" "}
 {member.preparing + member.packed === 1
 ? "comandă"
 : "comenzi"}
 {member.preparing > 0 && member.packed > 0
 ? ` (${member.preparing} în pregătire · ${member.packed} ambalate)`
 : member.packed > 0
 ? " ambalate"
 : " în pregătire"}
 </span>
 </li>
 ))}
 </ul>
 </section>
 ) : null}

 <div
 role="tabpanel"
 id="fulfillment-panel"
 aria-labelledby={`fulfillment-tab-${tab}`}
 >
 {rows.length === 0 ? (
 <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 bg-white/60 dark:bg-stone-900/60 p-10 text-center">
 <ActiveTabIcon className="h-8 w-8 text-stone-300" />
 <p className="text-sm text-stone-500 dark:text-stone-400 ">
 Nicio comandă în această stare.
 </p>
 </div>
 ) : (
 <ul className="space-y-3">
 {rows.map((order) => (
 <li
 key={order._id}
 className={`rounded-xl border border-stone-200 dark:border-stone-800 border-l-4 bg-white dark:bg-stone-900 p-4 transition-shadow hover:shadow-soft ${
 STATE_ACCENTS[order.state] ?? "border-l-stone-300"
 } ${flashId === order._id ? "animate-scale-in ring-2 ring-amber-400" : ""}`}
 >
 <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2">
 <Link
 to={`/admin/fulfillment/${order._id}`}
 className="font-mono text-sm font-bold text-stone-900 dark:text-stone-50 hover:text-amber-700 dark:hover:text-amber-400"
 >
 #{order.shortNumber}
 </Link>
 <Badge
 className={`px-2.5 py-0.5 text-xs font-medium ${STATE_COLORS[order.state]}`}
 >
 {STATE_LABELS[order.state]}
 </Badge>
 {order.assignedTo ? (
 <AssigneeChip
 userId={order.assignedTo}
 mine={order.assignedToMe}
 title={`la ${userLabel(order.assignedTo)}`}
 />
 ) : null}
 </div>
 <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-500 dark:text-stone-400 ">
 <Clock className="h-3.5 w-3.5" />
 <span title={formatDate(order.createdAt)}>
 {order.state === "shipped" && order.shippedAt
 ? `expediată ${relativeAge(order.shippedAt, now)}`
 : `plasată ${relativeAge(order.createdAt, now)}`}
 </span>
 <span aria-hidden="true">·</span>
 {order.recipientName ? (
 <>
 <span>{order.recipientName}</span>
 <span aria-hidden="true">·</span>
 </>
 ) : null}
 <span>
 {order.itemCount}{" "}
 {order.itemCount === 1 ? "produs" : "produse"} ·{" "}
 {order.units} bucăți
 </span>
 {order.state === "shipped" &&
 (order.carrier || order.awb) ? (
 <>
 <span aria-hidden="true">·</span>
 <span>
 {order.carrier ?? ""}
 {order.carrier && order.awb ? " · " : ""}
 {order.awb ? `AWB ${order.awb}` : ""}
 </span>
 </>
 ) : null}
 </p>
 {order.state === "preparing" &&
 typeof order.checklistTotal === "number" &&
 order.checklistTotal > 0 ? (
 <div className="mt-2 flex items-center gap-2">
 <div
 role="progressbar"
 aria-label={`${order.checkedCount ?? 0} din ${order.checklistTotal} produse bifate`}
 aria-valuemin={0}
 aria-valuemax={order.checklistTotal}
 aria-valuenow={order.checkedCount ?? 0}
 className="h-1.5 w-36 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800 "
 >
 <div
 className="h-full rounded-full bg-blue-500 transition-all"
 style={{
 width: `${Math.round(
 ((order.checkedCount ?? 0) /
 order.checklistTotal) *
 100,
 )}%`,
 }}
 />
 </div>
 <span className="text-xs font-medium text-stone-500 dark:text-stone-400 tabular-nums">
 {order.checkedCount ?? 0}/{order.checklistTotal}{" "}
 bifate
 </span>
 </div>
 ) : null}
 </div>
 <div className="flex shrink-0 items-center gap-2">
 {order.state === "ready" ? (
 <Button
 type="button"
 onClick={() => claim(order)}
 disabled={
 controller.busy ||
 controller.blocked ||
 !controller.online
 }
 className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium hover:bg-amber-700"
 >
 Preia
 </Button>
 ) : null}
 <Button
 asChild
 variant="outline"
 className="rounded-lg px-4 py-2 text-sm font-medium"
 >
 <Link to={`/admin/fulfillment/${order._id}`}>
 {order.state === "preparing" && order.assignedToMe
 ? "Continuă"
 : "Deschide"}
 </Link>
 </Button>
 </div>
 </div>
 </li>
 ))}
 </ul>
 )}
 </div>

 <section
 aria-label="Solicitări de reaprovizionare"
 className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5"
 >
 <div className="flex items-center gap-2">
 <Inbox className="h-5 w-5 text-amber-600 dark:text-amber-400 " />
 <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 ">
 Solicitări de reaprovizionare
 </h2>
 </div>
 {restock === undefined ? (
 <p className="mt-3 text-sm text-stone-500 dark:text-stone-400 ">Se încarcă…</p>
 ) : restock.length === 0 ? (
 <p className="mt-3 text-sm text-stone-500 dark:text-stone-400 ">
 Nicio solicitare în așteptare.
 </p>
 ) : (
 <ul className="mt-3 space-y-2">
 {restock.map((transfer) => (
 <li key={transfer._id}>
 <Link
 to={`/admin/transfers/${transfer._id}`}
 className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300"
 >
 <Truck className="h-4 w-4" />
 Transfer #{transfer._id.slice(-8).toUpperCase()} ·{" "}
 {transfer.lineCount} produse · {transfer.totalUnits} bucăți →{" "}
 {transfer.toName}
 </Link>
 </li>
 ))}
 </ul>
 )}
 </section>
 </section>
 );
};

export default FulfillmentQueue;
