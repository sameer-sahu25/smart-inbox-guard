import React, { createContext, useContext, useState } from 'react';

interface ScanningContextType {
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
}

const ScanningContext = createContext<ScanningContextType | undefined>(undefined);

export const ScanningProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isScanning, setIsScanning] = useState(false);

  return (
    <ScanningContext.Provider value={{ isScanning, setIsScanning }}>
      {children}
    </ScanningContext.Provider>
  );
};

export const useScanning = () => {
  const context = useContext(ScanningContext);
  if (context === undefined) {
    throw new Error('useScanning must be used within a ScanningProvider');
  }
  return context;
};
