import type React from 'react';
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Layout } from './components/Layout';
import { Home } from './pages/Home/Home';
import { Products } from './pages/Products/Products';
import { Cart } from './pages/Cart/Cart';
import { CartProvider } from './context/CartContext';
import { ShippingProvider } from './context/ShippingContext';
import MaintenanceGuard from './components/MaintenanceGuard/MaintenanceGuard';
import { AdminRoute, StaffHome } from './components/AdminRoute';
import { ScrollToTop } from './components/ScrollToTop';
import { Toaster } from './components/ui/sonner';

// Lazy-loaded pages
const Catalog = lazy(() => import('./pages/Catalog/Catalog').then((m) => ({ default: m.Catalog })));
const Checkout = lazy(() => import('./pages/Checkout/Checkout').then((m) => ({ default: m.Checkout })));
const ThankYou = lazy(() => import('./pages/ThankYou/ThankYou').then((m) => ({ default: m.ThankYou })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetail/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })));
const TermsAndConditions = lazy(() => import('./pages/Legal/TermsAndConditions'));
const PrivacyPolicy = lazy(() => import('./pages/Legal/PrivacyPolicy'));
const ReturnPolicy = lazy(() => import('./pages/Legal/ReturnPolicy'));
const LegalInformation = lazy(() => import('./pages/Legal/LegalInformation'));
const Shipping = lazy(() => import('./pages/Shipping/Shipping').then((m) => ({ default: m.Shipping })));
const Login = lazy(() => import('./pages/Login/Login').then((m) => ({ default: m.Login })));
const AdminLogin = lazy(() => import('./pages/Admin/AdminLogin').then((m) => ({ default: m.AdminLogin })));
const AdminLayout = lazy(() => import('./pages/Admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminProducts = lazy(() => import('./pages/Admin/Products/AdminProducts').then((m) => ({ default: m.AdminProducts })));
const ProductForm = lazy(() => import('./pages/Admin/Products/ProductForm').then((m) => ({ default: m.ProductForm })));
const MyOrders = lazy(() => import('./pages/MyOrders/MyOrders').then((m) => ({ default: m.MyOrders })));
const MyOrderDetail = lazy(() => import('./pages/MyOrders/MyOrderDetail').then((m) => ({ default: m.MyOrderDetail })));
const AdminOrders = lazy(() => import('./pages/Admin/Orders/AdminOrders').then((m) => ({ default: m.AdminOrders })));
const AdminCustomers = lazy(() => import('./pages/Admin/Customers/AdminCustomers').then((m) => ({ default: m.AdminCustomers })));
const CustomerDetail = lazy(() => import('./pages/Admin/Customers/CustomerDetail').then((m) => ({ default: m.CustomerDetail })));
const OrderDetail = lazy(() => import('./pages/Admin/Orders/OrderDetail').then((m) => ({ default: m.OrderDetail })));
const AdminCategories = lazy(() => import('./pages/Admin/Categories/AdminCategories').then((m) => ({ default: m.AdminCategories })));
const AdminCustomWorks = lazy(() => import('./pages/Admin/CustomWorks/AdminCustomWorks').then((m) => ({ default: m.AdminCustomWorks })));
const PointOfSale = lazy(() => import('./pages/Admin/PointOfSale/PointOfSale').then((m) => ({ default: m.PointOfSale })));
const AdminFairs = lazy(() => import('./pages/Admin/Fairs/AdminFairs').then((m) => ({ default: m.AdminFairs })));
const AdminStaff = lazy(() => import('./pages/Admin/Staff/AdminStaff').then((m) => ({ default: m.AdminStaff })));
const AdminInventory = lazy(() => import('./pages/Admin/Inventory/AdminInventory').then((m) => ({ default: m.AdminInventory })));
const TransferList = lazy(() => import('./pages/Admin/Transfers/TransferList'));
const TransferForm = lazy(() => import('./pages/Admin/Transfers/TransferForm'));
const TransferDetail = lazy(() => import('./pages/Admin/Transfers/TransferDetail'));
const Dashboard = lazy(() => import('./pages/Admin/Dashboard/Dashboard').then((m) => ({ default: m.Dashboard })));
const Reports = lazy(() => import('./pages/Admin/Reports/Reports').then((m) => ({ default: m.Reports })));
const FulfillmentQueue = lazy(() => import('./pages/Admin/Fulfillment/FulfillmentQueue').then((m) => ({ default: m.FulfillmentQueue })));
const FulfillmentDetail = lazy(() => import('./pages/Admin/Fulfillment/FulfillmentDetail').then((m) => ({ default: m.FulfillmentDetail })));

const PageLoader: React.FC = () => (
 <div className="flex items-center justify-center min-h-[60vh]">
 <p className="text-stone-500 dark:text-stone-400 ">Se încarcă...</p>
 </div>
);

function App() {
 return (
 <HelmetProvider>
 <CartProvider>
 <ShippingProvider>
 <Router>
 <ScrollToTop />
 <Toaster />
 <MaintenanceGuard>
 <Suspense fallback={<PageLoader />}>
 <Routes>
 <Route path="/" element={<Layout />}>
 <Route index element={<Home />} />
 <Route path="products" element={<Products />} />
 <Route path="catalog" element={<Catalog />} />
 <Route path="cart" element={<Cart />} />
 <Route path="shipping" element={<Shipping />} />
 <Route path="login" element={<Login />} />
 <Route path="checkout" element={<Checkout />} />
 <Route path="my-orders" element={<MyOrders />} />
 <Route path="my-orders/:id" element={<MyOrderDetail />} />
 <Route path="thank-you" element={<ThankYou />} />
 <Route path="product/:productId" element={<ProductDetailPage />} />
 <Route path="terms-and-conditions" element={<TermsAndConditions />} />
 <Route path="privacy-policy" element={<PrivacyPolicy />} />
 <Route path="return-policy" element={<ReturnPolicy />} />
 <Route path="legal-information" element={<LegalInformation />} />
 </Route>

 {/* Admin routes */}
 <Route path="admin/login" element={<AdminLogin />} />
 <Route path="pos" element={<Navigate to="/admin/pos" replace />} />
 <Route path="admin" element={<AdminRoute />}>
 <Route element={<AdminRoute permission="pos.sell" />}>
 <Route path="pos" element={<PointOfSale />} />
 </Route>
 <Route element={<AdminLayout />}>
 <Route index element={<StaffHome />} />
 <Route element={<AdminRoute permission="fairs.manage" />}>
 <Route path="fairs" element={<AdminFairs />} />
 </Route>
 <Route element={<AdminRoute permission="inventory.read" />}>
 <Route path="inventory" element={<AdminInventory />} />
 </Route>
 <Route element={<AdminRoute permission="transfers.view" />}>
 <Route path="transfers" element={<TransferList />} />
 <Route path="transfers/new" element={<TransferForm />} />
 <Route path="transfers/:id" element={<TransferDetail />} />
 <Route path="transfers/:id/edit" element={<TransferForm />} />
 </Route>
 <Route element={<AdminRoute permission="catalog.manage" />}>
 <Route path="products" element={<AdminProducts />} />
 <Route path="products/new" element={<ProductForm />} />
 <Route path="products/:id" element={<ProductForm />} />
 <Route path="categories" element={<AdminCategories />} />
 <Route path="custom-works" element={<AdminCustomWorks />} />
 </Route>
 <Route element={<AdminRoute permission="dashboard.view" />}>
 <Route path="dashboard" element={<Dashboard />} />
 </Route>
 <Route element={<AdminRoute permission="reports.view" />}>
 <Route path="reports" element={<Reports />} />
 </Route>
 <Route element={<AdminRoute permission="orders.manage" />}>
 <Route path="orders" element={<AdminOrders />} />
 <Route path="orders/:id" element={<OrderDetail />} />
 </Route>
 <Route element={<AdminRoute permission="orders.fulfill" />}>
 <Route path="fulfillment" element={<FulfillmentQueue />} />
 <Route path="fulfillment/:id" element={<FulfillmentDetail />} />
 </Route>
 <Route element={<AdminRoute permission="customers.manage" />}>
 <Route path="customers" element={<AdminCustomers />} />
 <Route path="customers/:id" element={<CustomerDetail />} />
 </Route>
 <Route element={<AdminRoute permission="staff.manage" />}>
 <Route path="staff" element={<AdminStaff />} />
 </Route>
 </Route>
 </Route>
 </Routes>
 </Suspense>
 </MaintenanceGuard>
 </Router>
 </ShippingProvider>
 </CartProvider>
 </HelmetProvider>
 );
}

export default App;