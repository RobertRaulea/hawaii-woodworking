import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Layout } from './components/Layout';
import { Home } from './pages/Home/Home';
import { Products } from './pages/Products/Products';
import { Catalog } from './pages/Catalog/Catalog';
import { Cart } from './pages/Cart/Cart';
import { CartProvider } from './context/CartContext';
import { Checkout } from './pages/Checkout/Checkout';
import { ThankYou } from './pages/ThankYou/ThankYou';
import { ProductDetailPage } from './pages/ProductDetail/ProductDetailPage';
import { TermsAndConditions, PrivacyPolicy, ReturnPolicy, LegalInformation } from './pages/Legal';
import MaintenanceGuard from './components/MaintenanceGuard/MaintenanceGuard';

function App() {
  return (
    <HelmetProvider>
      <CartProvider>
        <Router>
          <MaintenanceGuard>
            <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="products" element={<Products />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="thank-you" element={<ThankYou />} />
              <Route path="product/:productId" element={<ProductDetailPage />} />
              <Route path="terms-and-conditions" element={<TermsAndConditions />} />
              <Route path="privacy-policy" element={<PrivacyPolicy />} />
              <Route path="return-policy" element={<ReturnPolicy />} />
              <Route path="legal-information" element={<LegalInformation />} />
            </Route>
            </Routes>
          </MaintenanceGuard>
        </Router>
      </CartProvider>
    </HelmetProvider>
  );
}

export default App;