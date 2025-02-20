interface MaintenanceConfig {
  isUnderConstruction: boolean;
  expectedCompletionDate?: string;
  excludedPaths?: string[];
}

export const maintenanceConfig: MaintenanceConfig = {
  // Set this to true to activate the under construction page
  isUnderConstruction: true,
  
  // Set the expected completion date that will be shown to users
  expectedCompletionDate: '2025-03-01',
  
  // Add any paths that should NOT show the under construction page
  // For example, you might want to exclude admin pages or specific routes
  excludedPaths: [
    '/admin',           // Admin panel will still be accessible
    '/api',            // API endpoints will still work
    '/maintenance-status' // Status page will be accessible
  ],
};

export const shouldShowUnderConstruction = (pathname: string): boolean => {
  if (!maintenanceConfig.isUnderConstruction) return false;
  
  return !maintenanceConfig.excludedPaths?.some(
    path => pathname.startsWith(path)
  );
};
