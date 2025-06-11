import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home/Home';
import { Products } from './pages/Products/Products';
import { Catalog } from './pages/Catalog/Catalog';
import { Cart } from './pages/Cart/Cart';
import { CartProvider } from './context/CartContext';
import { Checkout } from './pages/Checkout/Checkout';
import { ThankYou } from './pages/ThankYou/ThankYou';
import MaintenanceGuard from './components/MaintenanceGuard/MaintenanceGuard';

function App() {
  return (
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
            </Route>
          </Routes>
        </MaintenanceGuard>
      </Router>
    </CartProvider>
  );
}

export default App;