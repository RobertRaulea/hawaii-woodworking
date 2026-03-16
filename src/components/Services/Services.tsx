import type React from 'react';
import { Hammer, Trees, Shield } from 'lucide-react';

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, description }) => (
  <div className="bg-white p-8 rounded-lg border border-stone-200 hover:border-stone-300 hover:shadow-soft transition-all duration-300">
    <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
      {icon}
    </div>
    <h3 className="font-serif text-xl font-medium mb-3 text-center text-stone-900">{title}</h3>
    <p className="text-stone-500 text-center text-sm leading-relaxed">{description}</p>
  </div>
);

export const Services: React.FC = () => {
  const services = [
    {
      icon: <Hammer className="h-8 w-8 text-amber-600" />,
      title: "Calitate Artizanală",
      description: "Fiecare piesă este creată cu atenție la detalii și pasiune pentru perfecțiune"
    },
    {
      icon: <Trees className="h-8 w-8 text-amber-600" />,
      title: "Materiale Premium",
      description: "Lemn selectat cu grijă de la furnizori locali de încredere"
    },
    {
      icon: <Shield className="h-8 w-8 text-amber-600" />,
      title: "Garanție pe Viață",
      description: "Construit să dureze generații cu promisiunea noastră de calitate"
    }
  ];

  return (
    <div className="bg-stone-50 py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl lg:text-4xl font-medium text-stone-900">Serviciile Noastre</h2>
          <p className="mt-4 text-stone-500 text-base max-w-lg mx-auto">Descoperă gama noastră completă de servicii de tâmplărie</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <ServiceCard key={index} {...service} />
          ))}
        </div>
      </div>
    </div>
  );
};
