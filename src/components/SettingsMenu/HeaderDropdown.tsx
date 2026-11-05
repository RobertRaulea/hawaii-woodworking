import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderDropdownProps {
 label: string;
 icon: React.ReactNode;
 children: React.ReactNode;
}

// Clerk renders the UserButton popover and the "Manage account" modal into a
// portal on document.body, outside this dropdown's tree. While one of them
// is open the menu must stay open, and pointer/focus events aimed at them
// must not count as "outside" for Radix's dismiss layer.
const CLERK_OPEN_OVERLAY = '.cl-userButtonPopoverCard, .cl-modalContent';
const CLERK_OVERLAY = '.cl-userButtonPopoverCard, .cl-popoverBox, .cl-modalContent, .cl-modalBackdrop';

const isClerkOverlayOpen = () =>
 Boolean(document.querySelector(CLERK_OPEN_OVERLAY));

const isClerkOverlayTarget = (event: { target: EventTarget | null }) =>
 event.target instanceof Element &&
 Boolean(event.target.closest(CLERK_OVERLAY));

export const HeaderDropdown: React.FC<HeaderDropdownProps> = ({ label, icon, children }) => {
 const [isOpen, setIsOpen] = useState(false);
 const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const pointerInsideRef = useRef(false);
 const clerkOverlayOpenRef = useRef(false);
 const [isDesktop, setIsDesktop] = useState(false);

 useEffect(() => {
 const checkDesktop = () => {
 setIsDesktop(window.matchMedia('(min-width: 768px)').matches);
 };
 checkDesktop();
 window.addEventListener('resize', checkDesktop);
 return () => window.removeEventListener('resize', checkDesktop);
 }, []);

 const scheduleClose = () => {
 if (timeoutRef.current) clearTimeout(timeoutRef.current);
 timeoutRef.current = setTimeout(() => {
 if (clerkOverlayOpenRef.current || pointerInsideRef.current) return;
 setIsOpen(false);
 }, 300);
 };

 // Watch Clerk's portaled overlay so hover-out while it is open does not
 // unmount the UserButton (which would vanish the popover with it), and so
 // its closing re-arms the normal hover-out close.
 useEffect(() => {
 const update = () => {
 const open = isClerkOverlayOpen();
 const wasOpen = clerkOverlayOpenRef.current;
 clerkOverlayOpenRef.current = open;
 if (wasOpen && !open && !pointerInsideRef.current) {
 scheduleClose();
 }
 };
 const observer = new MutationObserver(update);
 observer.observe(document.body, { childList: true, subtree: true });
 return () => observer.disconnect();
 }, []);

 // Desktop keeps the hover-to-open affordance; mobile relies on the
 // trigger's click handled by DropdownMenu itself.
 const handleMouseEnter = () => {
 pointerInsideRef.current = true;
 if (!isDesktop) return;
 if (timeoutRef.current) clearTimeout(timeoutRef.current);
 setIsOpen(true);
 };

 const handleMouseLeave = () => {
 pointerInsideRef.current = false;
 if (!isDesktop || clerkOverlayOpenRef.current) return;
 scheduleClose();
 };

 const handleOpenChange = (open: boolean) => {
 if (!open && clerkOverlayOpenRef.current) return;
 setIsOpen(open);
 };

 useEffect(() => {
 return () => {
 if (timeoutRef.current) clearTimeout(timeoutRef.current);
 };
 }, []);

 return (
 <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
 <DropdownMenu open={isOpen} onOpenChange={handleOpenChange} modal={false}>
 <DropdownMenuTrigger asChild>
 <Button
 variant="ghost"
 className="relative z-10 h-auto w-auto rounded-full p-2 hover:bg-muted [&_svg]:size-6"
 aria-label={label}
 >
 {icon}
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent
 align="end"
 sideOffset={4}
 collisionPadding={12}
 className="w-64 max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border-stone-100 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 py-2 backdrop-blur-md shadow-2xl"
 onMouseEnter={handleMouseEnter}
 onMouseLeave={handleMouseLeave}
 onPointerDownOutside={(event) => {
 if (clerkOverlayOpenRef.current || isClerkOverlayTarget(event)) {
 event.preventDefault();
 }
 }}
 onFocusOutside={(event) => {
 if (clerkOverlayOpenRef.current || isClerkOverlayTarget(event)) {
 event.preventDefault();
 }
 }}
 onInteractOutside={(event) => {
 if (clerkOverlayOpenRef.current || isClerkOverlayTarget(event)) {
 event.preventDefault();
 }
 }}
 >
 {children}
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 );
};
