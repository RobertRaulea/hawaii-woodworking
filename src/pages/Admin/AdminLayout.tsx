import type React from 'react';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { Menu } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useStaffAccess } from '../../hooks/useStaffAccess';
import { ThemeToggle } from '../../components/ThemeToggle';
import { AdminSidebar } from './AdminSidebar';

export const AdminLayout: React.FC = () => {
 const [sidebarOpen, setSidebarOpen] = useState(false);
 const { role, can } = useStaffAccess();
 const title = role === 'admin' ? 'Administrare' : 'Operațiuni';
 const pendingRequests = useQuery(
 api.transfers.pendingRequestCount,
 can('transfers.execute') ? {} : 'skip',
 );

 // The mobile sheet is a modal; close it if the viewport grows to desktop,
 // where the static sidebar takes over.
 useEffect(() => {
 if (typeof window.matchMedia !== 'function') return;
 const query = window.matchMedia('(min-width: 768px)');
 const handleChange = (event: MediaQueryListEvent) => {
 if (event.matches) setSidebarOpen(false);
 };
 query.addEventListener('change', handleChange);
 return () => query.removeEventListener('change', handleChange);
 }, []);

 return (
 <div className="flex min-h-screen bg-stone-100 dark:bg-stone-950 ">
 {/* Sidebar (desktop) */}
 <aside className="hidden w-64 flex-col bg-stone-900 text-white md:sticky md:top-0 md:flex md:h-screen">
 <AdminSidebar title={title} can={can} pendingRequests={pendingRequests} />
 </aside>

 {/* Sidebar (mobile) */}
 <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
 <SheetContent
 side="left"
 hideClose
 className="flex w-64 flex-col gap-0 border-0 bg-stone-900 text-white shadow-none sm:max-w-none md:hidden"
 >
 <SheetTitle className="sr-only">{title}</SheetTitle>
 <SheetDescription className="sr-only">Meniul de navigare al zonei de administrare</SheetDescription>
 <AdminSidebar
 title={title}
 can={can}
 pendingRequests={pendingRequests}
 onNavigate={() => setSidebarOpen(false)}
 />
 </SheetContent>
 </Sheet>

 {/* Main content */}
 <div className="flex-1 flex flex-col min-w-0">
 {/* Top bar (mobile) */}
 <header className="flex items-center h-16 px-4 bg-card border-b border-border md:hidden">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => setSidebarOpen(true)}
 className="-ml-2"
 aria-label="Deschide meniul"
 >
 <Menu className="size-5 text-stone-700 dark:text-stone-300 " />
 </Button>
 <span className="ml-3 text-lg font-bold text-foreground">{title}</span>
 <div className="ml-auto flex items-center gap-1">
 <ThemeToggle />
 <UserButton afterSignOutUrl="/" />
 </div>
 </header>

 {/* Page content */}
 <main className="flex-1 p-4 md:p-8 overflow-auto">
 <Outlet />
 </main>
 </div>
 </div>
 );
};
