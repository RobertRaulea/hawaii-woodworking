import { Hammer, Trees, Shield } from 'lucide-react';

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, description }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
    <div className="bg-amber-50 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-4 text-center">{title}</h3>
    <p className="text-gray-600 text-center">{description}</p>
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
    <div className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900">Serviciile Noastre</h2>
          <p className="mt-4 text-gray-600">Descoperă gama noastră completă de servicii de tâmplărie</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <ServiceCard key={index} {...service} />
          ))}
        </div>
      </div>
    </div>
  );
};
