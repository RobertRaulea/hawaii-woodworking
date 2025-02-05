import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Home } from './pages/Home/Home';
import { Products } from './pages/Products/Products';
import { Catalog } from './pages/Catalog/Catalog';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="catalog" element={<Catalog />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;