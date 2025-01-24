import React from 'react';
import { ChevronDown, Palmtree, ShoppingCart, Menu, Search, Trees, Hammer, Shield, Truck } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Trees className="h-8 w-8 text-amber-700" />
              <span className="ml-2 text-xl font-semibold text-amber-900">Hawaii Woodworking</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-700 hover:text-amber-700 transition-colors">Shop</a>
              <a href="#" className="text-gray-700 hover:text-amber-700 transition-colors">Custom Orders</a>
              <a href="#" className="text-gray-700 hover:text-amber-700 transition-colors">About</a>
              <a href="#" className="text-gray-700 hover:text-amber-700 transition-colors">Contact</a>
              <button className="p-2 hover:bg-stone-100 rounded-full relative group">
                <ShoppingCart className="h-6 w-6 text-gray-700" />
                <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
              </button>
            </div>
            
            <button className="md:hidden">
              <Menu className="h-6 w-6 text-gray-700" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative h-[80vh]">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1611275484845-52a71f2b0a6a?auto=format&fit=crop&q=80"
            alt="Wooden crafts workshop"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-white max-w-2xl">
            <h1 className="text-6xl font-bold mb-4 leading-tight">Handcrafted with Aloha Spirit</h1>
            <p className="text-xl mb-8 text-stone-200">Discover unique wooden treasures made with Hawaiian woods and traditional craftsmanship</p>
            <div className="flex gap-4">
              <button className="bg-amber-700 hover:bg-amber-800 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors">
                Shop Collection
              </button>
              <button className="border-2 border-white hover:bg-white/10 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors">
                Custom Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="bg-amber-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transform group-hover:rotate-6 transition-transform">
                <Hammer className="h-10 w-10 text-amber-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Handcrafted Quality</h3>
              <p className="text-gray-600">Each piece carefully made with attention to detail and passion for perfection</p>
            </div>
            <div className="text-center group">
              <div className="bg-amber-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transform group-hover:rotate-6 transition-transform">
                <Trees className="h-10 w-10 text-amber-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Sustainable Materials</h3>
              <p className="text-gray-600">Responsibly sourced Hawaiian woods from local suppliers</p>
            </div>
            <div className="text-center group">
              <div className="bg-amber-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transform group-hover:rotate-6 transition-transform">
                <Shield className="h-10 w-10 text-amber-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Lifetime Guarantee</h3>
              <p className="text-gray-600">Built to last generations with our quality promise</p>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Products */}
      <div className="py-24 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-16">Featured Creations</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Koa Wood Bowl",
                price: "$299",
                image: "https://images.unsplash.com/photo-1578685666972-015e0f32e477?auto=format&fit=crop&q=80"
              },
              {
                name: "Mango Wood Serving Tray",
                price: "$189",
                image: "https://images.unsplash.com/photo-1609587312208-cea54be969e7?auto=format&fit=crop&q=80"
              },
              {
                name: "Hawaiian Picture Frame",
                price: "$159",
                image: "https://images.unsplash.com/photo-1533377379833-82591c6e4e78?auto=format&fit=crop&q=80"
              }
            ].map((product, index) => (
              <div key={index} className="group">
                <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="relative">
                    <img src={product.image} alt={product.name} className="w-full h-80 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium transform translate-y-4 group-hover:translate-y-0 transition-transform">
                        Quick View
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                    <p className="text-amber-700 font-medium text-lg">{product.price}</p>
                    <button className="mt-4 w-full bg-stone-100 hover:bg-stone-200 text-gray-900 px-4 py-3 rounded-lg transition-colors">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Orders CTA */}
      <div className="relative py-24">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1581897271939-e31cc9eb2892?auto=format&fit=crop&q=80"
            alt="Woodworking workshop"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-amber-900/90"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Custom Orders Welcome</h2>
          <p className="text-amber-100 mb-10 max-w-2xl mx-auto text-lg">
            Have a specific piece in mind? We'll work with you to create the perfect custom wooden creation for your home.
          </p>
          <button className="bg-white hover:bg-amber-50 text-amber-900 px-10 py-4 rounded-lg text-lg font-medium transition-colors">
            Start Custom Order
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center mb-6">
                <Trees className="h-8 w-8 text-amber-500" />
                <span className="ml-2 text-xl font-semibold text-white">Hawaii Woodworking</span>
              </div>
              <p className="text-sm leading-relaxed">Crafting beautiful wooden pieces with the spirit of aloha since 2010. Each piece tells a story of Hawaiian craftsmanship and tradition.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-6 text-lg">Quick Links</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-amber-500 transition-colors">Shop</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Custom Orders</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-6 text-lg">Customer Service</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-amber-500 transition-colors">Shipping Info</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Returns</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Care Instructions</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-6 text-lg">Newsletter</h4>
              <p className="text-sm mb-6">Subscribe to receive updates and special offers.</p>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full bg-stone-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button className="w-full bg-amber-700 hover:bg-amber-600 text-white px-4 py-3 rounded-lg transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-stone-800 mt-16 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Hawaii Woodworking. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;