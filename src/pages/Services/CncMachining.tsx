import type React from 'react';
import { ServiceLanding } from '../../components/ServiceLanding/ServiceLanding';
import { useLanguage } from '../../context/LanguageContext';
import { marketingCopy } from '../../../shared/seo/marketing';

export const CncMachining: React.FC = () => {
 const { language } = useLanguage();
 return <ServiceLanding copy={marketingCopy[language]} page="cnc" />;
};
