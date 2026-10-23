import type React from 'react';
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { ArrowsRightLeftIcon, CalculatorIcon, CircleStackIcon, MapPinIcon, TruckIcon } from '@heroicons/react/24/outline';
import { Package, ShoppingBag, Users, LayoutDashboard, ChevronLeft, Menu, FolderTree, Hammer } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { useStaffAccess } from '../../hooks/useStaffAccess';
import type { Permission } from '../../../convex/lib/permissions';

const NAV_ITEMS: readonly { to: string; label: string; icon: React.ElementType; permission: Permission }[] = [
  { to: '/admin/pos', label: 'Vânzări la târg', icon: CalculatorIcon, permission: 'pos.sell' },
  { to: '/admin/fairs', label: 'Târguri', icon: MapPinIcon, permission: 'fairs.manage' },
  { to: '/admin/inventory', label: 'Stocuri', icon: CircleStackIcon, permission: 'inventory.read' },
  { to: '/admin/transfers', label: 'Transferuri', icon: ArrowsRightLeftIcon, permission: 'transfers.view' },
  { to: '/admin/products', label: 'Produse', icon: Package, permission: 'catalog.manage' },
  { to: '/admin/categories', label: 'Categorii', icon: FolderTree, permission: 'catalog.manage' },
  { to: '/admin/custom-works', label: 'La comandă', icon: Hammer, permission: 'catalog.manage' },
  { to: '/admin/fulfillment', label: 'Pregătire comenzi', icon: TruckIcon, permission: 'orders.fulfill' },
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
    <div className="flex min-h-screen bg-stone-100">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-stone-900 text-white
          transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-stone-700">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-medium text-stone-300 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Înapoi la magazin
          </button>
        </div>

        <div className="flex items-center gap-3 px-4 py-4 border-b border-stone-700">
          <LayoutDashboard className="h-5 w-5 text-amber-400" />
          <span className="text-lg font-bold">{title}</span>
        </div>

        <nav className="mt-4 space-y-1 px-2">
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
                <span
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white"
                  aria-label={`${pendingRequests} solicitări de transfer în așteptare`}
                >
                  {pendingRequests}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-stone-700">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <span className="text-sm text-stone-300">Cont</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="flex items-center h-16 px-4 bg-white border-b border-stone-200 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Deschide meniul"
          >
            <Menu className="h-5 w-5 text-stone-700" />
          </button>
          <span className="ml-3 text-lg font-bold text-stone-900">{title}</span>
          <div className="ml-auto">
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
