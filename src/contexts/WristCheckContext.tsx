import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface WristCheckContextType {
  isOpen: boolean;
  preSelectedWatchId: string | null;
  openWristCheck: (watchId?: string) => void;
  closeWristCheck: () => void;
}

const WristCheckContext = createContext<WristCheckContextType>({
  isOpen: false,
  preSelectedWatchId: null,
  openWristCheck: () => {},
  closeWristCheck: () => {},
});

export function WristCheckProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [preSelectedWatchId, setPreSelectedWatchId] = useState<string | null>(null);

  const openWristCheck = useCallback((watchId?: string) => {
    setPreSelectedWatchId(watchId || null);
    setIsOpen(true);
  }, []);
  const closeWristCheck = useCallback(() => {
    setIsOpen(false);
    setPreSelectedWatchId(null);
  }, []);

  return (
    <WristCheckContext.Provider value={{ isOpen, openWristCheck, closeWristCheck }}>
      {children}
    </WristCheckContext.Provider>
  );
}

export const useWristCheck = () => useContext(WristCheckContext);
