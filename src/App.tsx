import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Home } from './pages/Home/Home';
import { Products } from './pages/Products/Products';
import { Catalog } from './pages/Catalog/Catalog';
import { Cart } from './pages/Cart/Cart';
import { CartProvider } from './context/CartContext';
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
            </Route>
          </Routes>
        </MaintenanceGuard>
      </Router>
    </CartProvider>
  );
}

export default App;