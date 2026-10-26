import type React from "react";
import { Check } from "lucide-react";

interface FulfillmentStepperProps {
 state: string;
 createdAt: number;
 assignedAt?: number;
 packedAt?: number;
 shippedAt?: number;
 deliveredAt?: number;
}

const STEP_COLORS: Record<string, string> = {
 ready: "bg-amber-500",
 preparing: "bg-blue-500",
 packed: "bg-indigo-500",
 shipped: "bg-emerald-500",
 delivered: "bg-emerald-600",
};

const formatTime = (timestamp: number): string =>
 new Date(timestamp).toLocaleDateString("ro-RO", {
 day: "2-digit",
 month: "2-digit",
 hour: "2-digit",
 minute: "2-digit",
 });

/**
 * Horizontal pipeline: De pregătit → În pregătire → Ambalată → Expediată →
 * Livrată. Done steps show a check; the current step shows its timestamp.
 */
export const FulfillmentStepper: React.FC<FulfillmentStepperProps> = ({
 state,
 createdAt,
 assignedAt,
 packedAt,
 shippedAt,
 deliveredAt,
}) => {
 if (state === "cancelled" || state === "blocked") return null;

 const steps = [
 { key: "ready", label: "De pregătit", at: createdAt },
 { key: "preparing", label: "În pregătire", at: assignedAt },
 { key: "packed", label: "Ambalată", at: packedAt },
 { key: "shipped", label: "Expediată", at: shippedAt },
 { key: "delivered", label: "Livrată", at: deliveredAt },
 ] as const;

 const currentIndex = Math.max(
 0,
 steps.findIndex((step) => step.key === state),
 );

 return (
 <ol
 aria-label="Progres pregătire comandă"
 className="flex items-start gap-0 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4"
 >
 {steps.map((step, index) => {
 const done = index < currentIndex;
 const current = index === currentIndex;
 return (
 <li
 key={step.key}
 aria-current={current ? "step" : undefined}
 className="flex flex-1 flex-col items-center text-center"
 >
 <div className="flex w-full items-center">
 <span
 aria-hidden="true"
 className={`h-0.5 flex-1 ${
 index === 0
 ? "invisible"
 : done || current
 ? "bg-emerald-400"
 : "bg-stone-200 dark:bg-stone-700 "
 }`}
 />
 <span
 className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
 done
 ? "bg-emerald-500 text-white"
 : current
 ? `${STEP_COLORS[step.key]} text-white ring-4 ring-stone-100`
 : "bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 "
 }`}
 >
 {done ? <Check className="h-4 w-4" /> : index + 1}
 </span>
 <span
 aria-hidden="true"
 className={`h-0.5 flex-1 ${
 index === steps.length - 1
 ? "invisible"
 : done
 ? "bg-emerald-400"
 : "bg-stone-200 dark:bg-stone-700 "
 }`}
 />
 </div>
 <span
 className={`mt-1.5 text-[11px] font-medium leading-tight md:text-xs ${
 current
 ? "text-stone-900 dark:text-stone-50 "
 : done
 ? "text-stone-600 dark:text-stone-300 "
 : "text-stone-400 dark:text-stone-500 "
 }`}
 >
 {step.label}
 </span>
 {step.at && (done || current) ? (
 <span className="text-[10px] text-stone-400 dark:text-stone-500 ">
 {formatTime(step.at)}
 </span>
 ) : null}
 </li>
 );
 })}
 </ol>
 );
};
