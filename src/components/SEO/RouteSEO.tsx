import type React from 'react';
import { SEO } from './SEO';
import type { EnvironmentName } from '../../../shared/environment';

interface RouteSEOProps {
 environment?: EnvironmentName;
}

export const RouteSEO: React.FC<RouteSEOProps> = ({ environment }) => (
 <SEO environment={environment} />
);
