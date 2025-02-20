import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { shouldShowUnderConstruction, maintenanceConfig } from '../../utils/maintenance.utils';
import UnderConstruction from '../../pages/UnderConstruction/UnderConstruction';

interface MaintenanceGuardProps {
  children: React.ReactNode;
}

const MaintenanceGuard: React.FC<MaintenanceGuardProps> = ({ children }) => {
  const location = useLocation();
  
  if (shouldShowUnderConstruction(location.pathname)) {
    return <UnderConstruction expectedDate={maintenanceConfig.expectedCompletionDate} />;
  }

  return <>{children}</>;
};

export default MaintenanceGuard;
