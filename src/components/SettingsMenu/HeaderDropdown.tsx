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

export const HeaderDropdown: React.FC<HeaderDropdownProps> = ({ label, icon, children }) => {
 const [isOpen, setIsOpen] = useState(false);
 const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const [isDesktop, setIsDesktop] = useState(false);

 useEffect(() => {
 const checkDesktop = () => {
 setIsDesktop(window.matchMedia('(min-width: 768px)').matches);
 };
 checkDesktop();
 window.addEventListener('resize', checkDesktop);
 return () => window.removeEventListener('resize', checkDesktop);
 }, []);

 // Desktop keeps the hover-to-open affordance; mobile relies on the
 // trigger's click handled by DropdownMenu itself.
 const handleMouseEnter = () => {
 if (!isDesktop) return;
 if (timeoutRef.current) clearTimeout(timeoutRef.current);
 setIsOpen(true);
 };

 const handleMouseLeave = () => {
 if (!isDesktop) return;
 timeoutRef.current = setTimeout(() => {
 setIsOpen(false);
 }, 300);
 };

 useEffect(() => {
 return () => {
 if (timeoutRef.current) clearTimeout(timeoutRef.current);
 };
 }, []);

 return (
 <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
 <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
 <DropdownMenuTrigger asChild>
 <Button
 variant="ghost"
 className="relative z-10 h-auto w-auto rounded-full p-2 hover:bg-stone-100 dark:hover:bg-stone-800 [&_svg]:size-6"
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
 >
 {children}
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 );
};
