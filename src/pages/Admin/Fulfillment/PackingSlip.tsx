import type React from "react";
import { createPortal } from "react-dom";
import { SITE_NAME } from "../../../constants/site.constants";
import { useSiteAssets } from "../../../hooks/useSiteAssets";
import { useProductThumbnails } from "../../../hooks/useProductThumbnails";
import { ProductThumb } from "../../../components/ProductThumb";
import type { FulfillmentDetail } from "../../../types/orders.types";

interface PackingSlipProps {
 order: FulfillmentDetail;
 /** Display name of the operator holding the order. */
 packerLabel: string | null;
}

const formatPrice = (price: number): string => `${price.toFixed(2)} RON`;

const formatDate = (timestamp: number): string =>
 new Date(timestamp).toLocaleDateString("ro-RO", {
 day: "2-digit",
 month: "2-digit",
 year: "numeric",
 });

/**
 * Print-only packing slip ("foaie de ambalare") placed in the parcel.
 * Rendered through a portal directly under <body> so the scoped print
 * rule can hide the whole app without leaving blank pages behind.
 */
export const PackingSlip: React.FC<PackingSlipProps> = ({
 order,
 packerLabel,
}) => {
 const { assets } = useSiteAssets("logo");
 const thumbnails = useProductThumbnails();
 const logoSrc =
 assets.find((asset) => asset.name === "hawaii-logo.svg")?.url ??
 assets[0]?.url ??
 "/hawaii-logo-without-text.png";

 if (typeof document === "undefined") return null;

 return createPortal(
 <aside className="packing-slip hidden print:block" aria-hidden="true">
 {/* Scoped: only exists while the slip is mounted, so printing any
 other page is unaffected. Hides the app shell, keeps the slip. */}
 <style>{`
 @media print {
 body > *:not(.packing-slip) {
 display: none !important;
 }
 @page {
 margin: 12mm;
 }
 }
 `}</style>
 <div className="mx-auto max-w-[184mm] border-2 border-stone-900 bg-white p-8 text-stone-900">
 <header className="flex items-start justify-between gap-6 border-b-2 border-stone-900 pb-5">
 <div className="flex items-center gap-4">
 <img
 src={logoSrc}
 alt=""
 className="max-h-16 w-auto max-w-16 object-contain"
 />
 <div>
 <p className="font-serif text-2xl font-bold leading-tight">
 {SITE_NAME}
 </p>
 <p className="mt-0.5 text-xs text-stone-600">
 Obiecte meșteșugite din lemn
 </p>
 </div>
 </div>
 <div className="text-right">
 <p className="font-serif text-lg font-bold uppercase tracking-wide">
 Foaie de ambalare
 </p>
 <p className="mt-0.5 text-xs text-stone-600">
 Document pentru colet
 </p>
 </div>
 </header>

 <div className="flex items-baseline justify-between border-b border-stone-300 py-3">
 <p className="text-sm">
 <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
 Comandă
 </span>{" "}
 <span className="font-mono text-base font-bold">
 #{order.shortNumber}
 </span>
 </p>
 <p className="text-sm">
 <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
 Data
 </span>{" "}
 <span className="font-medium">{formatDate(order.createdAt)}</span>
 </p>
 </div>

 <div className="grid grid-cols-2 gap-8 border-b border-stone-300 py-4">
 <div>
 <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
 Livrare către
 </p>
 {order.recipient ? (
 <div className="mt-1.5 text-sm leading-relaxed">
 <p className="font-semibold">
 {order.recipient.firstName} {order.recipient.lastName}
 </p>
 <p>{order.recipient.address.street}</p>
 <p>
 {order.recipient.address.city},{" "}
 {order.recipient.address.county}{" "}
 {order.recipient.address.postalCode}
 </p>
 <p>{order.recipient.address.country}</p>
 </div>
 ) : (
 <p className="mt-1.5 text-sm text-stone-500">
 Adresa nu este disponibilă.
 </p>
 )}
 </div>
 <div>
 <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
 Pregătită de
 </p>
 <p className="mt-1.5 text-sm font-semibold">{packerLabel ?? "—"}</p>
 <p className="mt-1 text-xs leading-relaxed text-stone-500">
 Operatorul de mai sus a verificat conținutul și integritatea
 produselor.
 </p>
 </div>
 </div>

 <table className="mt-5 w-full border-collapse text-sm">
 <thead>
 <tr className="border-b-2 border-stone-900 text-left">
 <th
 scope="col"
 className="w-8 pb-2 text-xs font-bold uppercase tracking-wide"
 aria-label="Verificat"
 />
 <th
 scope="col"
 className="pb-2 text-xs font-bold uppercase tracking-wide"
 >
 Produs
 </th>
 <th
 scope="col"
 className="w-16 pb-2 text-center text-xs font-bold uppercase tracking-wide"
 >
 Cant.
 </th>
 <th
 scope="col"
 className="w-24 pb-2 text-right text-xs font-bold uppercase tracking-wide"
 >
 Preț buc.
 </th>
 <th
 scope="col"
 className="w-28 pb-2 text-right text-xs font-bold uppercase tracking-wide"
 >
 Total
 </th>
 </tr>
 </thead>
 <tbody>
 {order.items.map((item) => (
 <tr
 key={item.productId}
 className="border-b border-stone-200 align-top"
 >
 <td className="py-2.5 pr-2">
 <span
 aria-hidden="true"
 className="inline-block h-4 w-4 border-2 border-stone-900"
 />
 </td>
 <td className="py-2.5 pr-3 font-medium">
 <span className="flex items-center gap-2.5">
 <ProductThumb
 src={thumbnails.get(item.productId)}
 alt={item.name}
 className="h-10 w-10 border border-stone-200"
 />
 {item.name}
 </span>
 </td>
 <td className="py-2.5 text-center font-semibold tabular-nums">
 {item.quantity}
 </td>
 <td className="py-2.5 text-right tabular-nums">
 {formatPrice(item.price)}
 </td>
 <td className="py-2.5 text-right font-semibold tabular-nums">
 {formatPrice(item.price * item.quantity)}
 </td>
 </tr>
 ))}
 </tbody>
 <tfoot>
 <tr className="border-t-2 border-stone-900">
 <td
 colSpan={4}
 className="pt-3 text-right text-xs font-bold uppercase tracking-wide"
 >
 Total comandă
 </td>
 <td className="pt-3 text-right font-serif text-lg font-bold tabular-nums">
 {formatPrice(order.total)}
 </td>
 </tr>
 </tfoot>
 </table>

 <footer className="mt-10">
 <p className="flex items-center gap-2.5 text-xs">
 <span
 aria-hidden="true"
 className="inline-block h-4 w-4 shrink-0 border-2 border-stone-900"
 />
 Am verificat conținutul coletului și integritatea produselor.
 </p>
 <div className="mt-10 flex items-end justify-between">
 <div>
 <p className="text-xs uppercase tracking-wide text-stone-500">
 Semnătura operatorului
 </p>
 <p className="mt-6 w-52 border-b-2 border-stone-900" />
 </div>
 <p className="font-serif text-base italic">
 Mulțumim pentru comandă!
 </p>
 </div>
 </footer>
 </div>
 </aside>,
 document.body,
 );
};
