import type React from 'react';
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { Package, ShoppingBag, Users, LayoutDashboard, ChevronLeft, Menu, FolderTree, Hammer, Calculator, MapPin, Database, ArrowLeftRight, Truck } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStaffAccess } from '../../hooks/useStaffAccess';
import { ThemeToggle } from '../../components/ThemeToggle';
import type { Permission } from '../../../convex/lib/permissions';

const NAV_ITEMS: readonly { to: string; label: string; icon: React.ElementType; permission: Permission }[] = [
 { to: '/admin/pos', label: 'Vânzări la târg', icon: Calculator, permission: 'pos.sell' },
 { to: '/admin/fairs', label: 'Târguri', icon: MapPin, permission: 'fairs.manage' },
 { to: '/admin/inventory', label: 'Stocuri', icon: Database, permission: 'inventory.read' },
 { to: '/admin/transfers', label: 'Transferuri', icon: ArrowLeftRight, permission: 'transfers.view' },
 { to: '/admin/products', label: 'Produse', icon: Package, permission: 'catalog.manage' },
 { to: '/admin/categories', label: 'Categorii', icon: FolderTree, permission: 'catalog.manage' },
 { to: '/admin/custom-works', label: 'La comandă', icon: Hammer, permission: 'catalog.manage' },
 { to: '/admin/fulfillment', label: 'Pregătire comenzi', icon: Truck, permission: 'orders.fulfill' },
 { to: '/admin/orders', label: 'Comenzi', icon: ShoppingBag, permission: 'orders.manage' },
 { to: '/admin/customers', label: 'Clienți', icon: Users, permission: 'customers.manage' },
 { to: '/admin/staff', label: 'Echipă', icon: Users, permission: 'staff.manage' },
];

export const AdminLayout: React.FC = () => {
 const [sidebarOpen, setSidebarOpen] = useState(false);
 const navigate = useNavigate();
 const { role, can } = useStaffAccess();
 const title = role === 'admin' ? 'Administrare' : 'Operațiuni';
 const pendingRequests = useQuery(
 api.transfers.pendingRequestCount,
 can('transfers.execute') ? {} : 'skip',
 );

 return (
 <div className="flex min-h-screen bg-stone-100 dark:bg-stone-950 ">
 {/* Sidebar overlay (mobile) */}
 {sidebarOpen && (
 <div
 className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm md:hidden"
 onClick={() => setSidebarOpen(false)}
 />
 )}

 {/* Sidebar */}
 <aside
 className={`
 fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-stone-900 text-white
 transform transition-transform duration-200 ease-in-out
 md:sticky md:top-0 md:h-screen md:translate-x-0
 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
 `}
 >
 <div className="flex items-center justify-between h-16 px-4 border-b border-stone-700">
 <Button
 variant="ghost"
 onClick={() => navigate('/')}
 className="gap-2 px-0 text-sm font-medium text-stone-300 hover:bg-transparent hover:text-white"
 >
 <ChevronLeft className="h-4 w-4" />
 Înapoi la magazin
 </Button>
 </div>

 <div className="flex items-center gap-3 px-4 py-4 border-b border-stone-700">
 <LayoutDashboard className="h-5 w-5 text-amber-400" />
 <span className="text-lg font-bold">{title}</span>
 </div>

 <nav className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto px-2">
 {NAV_ITEMS.filter(({ permission }) => can(permission)).map(({ to, label, icon: Icon }) => (
 <NavLink
 key={to}
 to={to}
 onClick={() => setSidebarOpen(false)}
 className={({ isActive }) =>
 `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
 isActive
 ? 'bg-amber-600 text-white'
 : 'text-stone-300 hover:bg-stone-800 hover:text-white'
 }`
 }
 >
 <Icon className="h-4 w-4" />
 <span className="flex-1">{label}</span>
 {to === '/admin/transfers' && pendingRequests ? (
 <Badge
 variant="destructive"
 className="h-5 min-w-5 justify-center rounded-full px-1.5 text-xs"
 aria-label={`${pendingRequests} solicitări de transfer în așteptare`}
 >
 {pendingRequests}
 </Badge>
 ) : null}
 </NavLink>
 ))}
 </nav>

 <div className="flex shrink-0 items-center justify-between border-t border-stone-700 p-4">
 <div className="flex items-center gap-3">
 <UserButton afterSignOutUrl="/" />
 <span className="text-sm text-stone-300">Cont</span>
 </div>
 <ThemeToggle className="text-stone-300 hover:bg-stone-800 hover:text-white [&_svg]:size-5" />
 </div>
 </aside>

 {/* Main content */}
 <div className="flex-1 flex flex-col min-w-0">
 {/* Top bar (mobile) */}
 <header className="flex items-center h-16 px-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 md:hidden">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => setSidebarOpen(true)}
 className="-ml-2"
 aria-label="Deschide meniul"
 >
 <Menu className="h-5 w-5 text-stone-700 dark:text-stone-300 " />
 </Button>
 <span className="ml-3 text-lg font-bold text-stone-900 dark:text-stone-50 ">{title}</span>
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
