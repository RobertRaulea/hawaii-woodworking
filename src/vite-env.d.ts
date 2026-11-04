/// <reference types="vite/client" />

interface ImportMetaEnv {
 readonly VITE_APP_ENV: 'test' | 'production';
 readonly VITE_CONVEX_URL: string;
 readonly VITE_CLERK_PUBLISHABLE_KEY: string;
 readonly VITE_SITE_URL: string;
 readonly VITE_PUBLIC_POSTHOG_ENABLED?: string;
 readonly VITE_PUBLIC_POSTHOG_KEY?: string;
 readonly VITE_PUBLIC_POSTHOG_HOST?: string;
 readonly VITE_PUBLIC_POSTHOG_ENV?: string;
}

declare module '*.svg' {
 const content: string
 export default content
}
