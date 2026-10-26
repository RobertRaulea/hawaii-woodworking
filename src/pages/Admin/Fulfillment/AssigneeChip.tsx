import type React from "react";
import { useStaffDirectoryEntries } from "../../../hooks/useStaffDirectory";

interface AssigneeChipProps {
 userId: string;
 mine?: boolean;
 title?: string;
}

const initials = (name: string | undefined, fallback: string): string => {
 const source = (name ?? fallback).trim();
 if (!source) return "?";
 if (source.includes("@")) {
 const local = source.split("@")[0];
 return local.slice(0, 2).toUpperCase();
 }
 const parts = source.split(/\s+/).filter(Boolean);
 if (parts.length === 1) return source.slice(0, 2).toUpperCase();
 return parts
 .slice(0, 2)
 .map((part) => part[0])
 .join("")
 .toUpperCase();
};

/**
 * Avatar + label for the operator holding an order. Resolves the display
 * name through the staff directory, falling back to the raw user id.
 */
export const AssigneeChip: React.FC<AssigneeChipProps> = ({
 userId,
 mine = false,
 title,
}) => {
 const entries = useStaffDirectoryEntries();
 const entry = entries.get(userId);
 const label = userId.startsWith("system:")
 ? "Sistem"
 : (entry?.name ?? entry?.email ?? userId);

 return (
 <span
 title={title ?? label}
 className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-xs font-medium ${
 mine ? "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 " : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 "
 }`}
 >
 <span
 aria-hidden="true"
 className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${
 mine ? "bg-amber-600" : "bg-stone-500"
 }`}
 >
 {initials(entry?.name, entry?.email ?? label)}
 </span>
 <span className="max-w-40 truncate">{mine ? "Tu" : label}</span>
 </span>
 );
};
