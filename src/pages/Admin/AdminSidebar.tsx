import type React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { Package, ShoppingBag, Users, LayoutDashboard, ChevronLeft, FolderTree, Hammer, Calculator, MapPin, Database, ArrowLeftRight, Truck, BarChart3, Ship } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn.utils';
import { ThemeToggle } from '../../components/ThemeToggle';
import type { Permission } from '../../../convex/lib/permissions';

const NAV_ITEMS: readonly { to: string; label: string; icon: React.ElementType; permission: Permission }[] = [
 { to: '/admin/dashboard', label: 'Panou', icon: LayoutDashboard, permission: 'dashboard.view' },
 { to: '/admin/pos', label: 'Vânzări la târg', icon: Calculator, permission: 'pos.sell' },
 { to: '/admin/fairs', label: 'Târguri', icon: MapPin, permission: 'fairs.manage' },
 { to: '/admin/inventory', label: 'Stocuri', icon: Database, permission: 'inventory.read' },
 { to: '/admin/transfers', label: 'Transferuri', icon: ArrowLeftRight, permission: 'transfers.view' },
 { to: '/admin/products', label: 'Produse', icon: Package, permission: 'catalog.manage' },
 { to: '/admin/categories', label: 'Categorii', icon: FolderTree, permission: 'catalog.manage' },
 { to: '/admin/custom-works', label: 'La comandă', icon: Hammer, permission: 'catalog.manage' },
 { to: '/admin/fulfillment', label: 'Pregătire comenzi', icon: Truck, permission: 'orders.fulfill' },
 { to: '/admin/orders', label: 'Comenzi', icon: ShoppingBag, permission: 'orders.manage' },
 { to: '/admin/shipping', label: 'Livrare', icon: Ship, permission: 'shipping.manage' },
 { to: '/admin/reports', label: 'Rapoarte', icon: BarChart3, permission: 'reports.view' },
 { to: '/admin/customers', label: 'Clienți', icon: Users, permission: 'customers.manage' },
 { to: '/admin/staff', label: 'Echipă', icon: Users, permission: 'staff.manage' },
];

interface AdminSidebarProps {
 title: string;
 can: (permission: Permission) => boolean;
 pendingRequests: number | undefined;
 /** Called after the user picks a destination (used to close the mobile sheet). */
 onNavigate?: () => void;
}

/**
 * Sidebar contents shared by the static desktop aside and the mobile Sheet.
 * Renders a fragment: the parent supplies the flex-column dark container.
 */
export const AdminSidebar: React.FC<AdminSidebarProps> = ({ title, can, pendingRequests, onNavigate }) => {
 const navigate = useNavigate();

 return (
 <>
 <div className="flex items-center justify-between h-16 px-4 border-b border-stone-700">
 <Button
 variant="ghost"
 onClick={() => {
 onNavigate?.();
 navigate('/');
 }}
 className="gap-2 px-0 text-sm font-medium text-stone-300 hover:bg-transparent hover:text-white"
 >
 <ChevronLeft className="size-4" />
 Înapoi la magazin
 </Button>
 </div>

 <div className="flex items-center gap-3 px-4 py-4 border-b border-stone-700">
 <LayoutDashboard className="size-5 text-amber-400" />
 <span className="text-lg font-bold">{title}</span>
 </div>

 <nav aria-label="Navigare administrare" className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2">
 {NAV_ITEMS.filter(({ permission }) => can(permission)).map(({ to, label, icon: Icon }) => (
 <NavLink
 key={to}
 to={to}
 onClick={onNavigate}
 className={({ isActive }) =>
 cn(
 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
 isActive
 ? 'bg-amber-600 text-white'
 : 'text-stone-300 hover:bg-stone-800 hover:text-white',
 )
 }
 >
 <Icon className="size-4" />
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
 </>
 );
};
