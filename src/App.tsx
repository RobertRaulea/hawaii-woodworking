import type React from 'react';
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Layout } from './components/Layout';
import { Home } from './pages/Home/Home';
import { Products } from './pages/Products/Products';
import { Cart } from './pages/Cart/Cart';
import { CartProvider } from './context/CartContext';
import { ShippingProvider } from './context/ShippingContext';
import MaintenanceGuard from './components/MaintenanceGuard/MaintenanceGuard';
import { AdminRoute } from './components/AdminRoute';

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

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <p className="text-stone-500">Loading...</p>
  </div>
);

function App() {
  return (
    <HelmetProvider>
      <CartProvider>
        <ShippingProvider>
        <Router>
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
                <Route path="admin" element={<AdminRoute />}>
                  <Route element={<AdminLayout />}>
                    <Route index element={<AdminProducts />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="products/new" element={<ProductForm />} />
                    <Route path="products/:id" element={<ProductForm />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="orders/:id" element={<OrderDetail />} />
                    <Route path="customers" element={<AdminCustomers />} />
                    <Route path="customers/:id" element={<CustomerDetail />} />
                    <Route path="categories" element={<AdminCategories />} />
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