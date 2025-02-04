interface Product {
  name: string;
  price: string;
  image: string;
}

interface ProductCardProps extends Product {}

const ProductCard: React.FC<ProductCardProps> = ({ name, price, image }) => (
  <div className="group">
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="relative">
        <img src={image} alt={name} className="w-full h-80 object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium transform translate-y-4 group-hover:translate-y-0 transition-transform">
            Vizualizare Rapidă
          </button>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{name}</h3>
        <p className="text-amber-700 font-medium text-lg">{price}</p>
        <button className="mt-4 w-full bg-stone-100 hover:bg-stone-200 text-gray-900 px-4 py-3 rounded-lg transition-colors">
          Adaugă în Coș
        </button>
      </div>
    </div>
  </div>
);

export const FeaturedProducts: React.FC = () => {
  const products: Product[] = [
    {
      name: "Masă din Lemn Masiv",
      price: "2.999 RON",
      image: "https://images.unsplash.com/photo-1578685666972-015e0f32e477?auto=format&fit=crop&q=80"
    },
    {
      name: "Dulap Personalizat",
      price: "4.899 RON",
      image: "https://images.unsplash.com/photo-1609587312208-cea54be969e7?auto=format&fit=crop&q=80"
    },
    {
      name: "Ramă Foto Artizanală",
      price: "799 RON",
      image: "https://images.unsplash.com/photo-1533377379833-82591c6e4e78?auto=format&fit=crop&q=80"
    }
  ];

  return (
    <div className="py-24 bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center mb-16">Creații în Evidență</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {products.map((product, index) => (
            <ProductCard key={index} {...product} />
          ))}
        </div>
      </div>
    </div>
  );
};
