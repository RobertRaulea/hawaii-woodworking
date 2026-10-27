import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import { LanguageProvider } from './context/LanguageContext';
import { validateFrontendEnvironment } from '../shared/environment';
import App from './App.tsx';
import './index.css';
import './i18n/config';

const environment = validateFrontendEnvironment(import.meta.env);
const convex = new ConvexReactClient(environment.convexUrl);

createRoot(document.getElementById('root')!).render(
 <StrictMode>
 <ClerkProvider publishableKey={environment.publishableKey} afterSignOutUrl="/">
 <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
 <LanguageProvider>
 <App />
 </LanguageProvider>
 </ConvexProviderWithClerk>
 </ClerkProvider>
 </StrictMode>
);
