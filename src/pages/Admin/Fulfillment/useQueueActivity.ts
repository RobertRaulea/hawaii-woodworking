import { useEffect, useRef, useState } from "react";
import type { FulfillmentQueueItem } from "../../../types/orders.types";

interface QueueRowSnapshot {
 state: string;
 assignedTo?: string;
 shortNumber: string;
}

/**
 * The queue query is live. This hook diffs consecutive snapshots and turns
 * transitions made by *other* operators into short human-readable notices,
 * so the team sees work move without refreshing. The first snapshot is the
 * baseline and never notifies.
 */
export const useQueueActivity = (
 orders: FulfillmentQueueItem[] | undefined,
 myUserId: string | null,
 userLabel: (userId: string | null | undefined) => string,
) => {
 const previous = useRef<Map<string, QueueRowSnapshot> | null>(null);
 const [notice, setNotice] = useState<string | null>(null);

 useEffect(() => {
 if (!orders) return;
 const current = new Map<string, QueueRowSnapshot>(
 orders.map((order) => [
 order._id,
 {
 state: order.state,
 assignedTo: order.assignedTo,
 shortNumber: order.shortNumber,
 },
 ]),
 );
 const before = previous.current;
 previous.current = current;
 if (before === null) return;

 const messages: string[] = [];
 for (const [id, cur] of current) {
 const prev = before.get(id);
 const num = `#${cur.shortNumber}`;
 if (!prev) {
 if (cur.state === "ready")
 messages.push(`Comandă nouă ${num} de pregătit.`);
 continue;
 }
 if (prev.state === cur.state && prev.assignedTo === cur.assignedTo)
 continue;

 const other = cur.assignedTo !== undefined && cur.assignedTo !== myUserId;
 if (prev.state === "ready" && cur.state === "preparing") {
 if (other)
 messages.push(
 `${userLabel(cur.assignedTo)} a preluat comanda ${num}.`,
 );
 } else if (prev.state === "preparing" && cur.state === "ready") {
 messages.push(`Comanda ${num} a revenit la «De pregătit».`);
 } else if (prev.state === "preparing" && cur.state === "packed") {
 if (other)
 messages.push(
 `${userLabel(cur.assignedTo)} a ambalat comanda ${num}.`,
 );
 } else if (prev.state === "packed" && cur.state === "shipped") {
 if (other) messages.push(`Comanda ${num} a fost expediată.`);
 } else if (
 prev.state === cur.state &&
 prev.assignedTo !== cur.assignedTo &&
 other
 ) {
 messages.push(
 `Comanda ${num} este acum la ${userLabel(cur.assignedTo)}.`,
 );
 }
 }
 // An order that leaves the queue entirely was delivered or cancelled
 // by someone else — say so instead of letting it vanish silently.
 for (const [id, prev] of before) {
 if (!current.has(id))
 messages.push(
 `Comanda #${prev.shortNumber} a ieșit din coada de pregătire.`,
 );
 }
 if (messages.length > 0) setNotice(messages.join(" "));
 }, [orders, myUserId, userLabel]);

 return { notice, dismiss: () => setNotice(null) };
};
