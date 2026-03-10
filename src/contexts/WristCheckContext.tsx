import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface WristCheckContextType {
  isOpen: boolean;
  openWristCheck: () => void;
  closeWristCheck: () => void;
}

const WristCheckContext = createContext<WristCheckContextType>({
  isOpen: false,
  openWristCheck: () => {},
  closeWristCheck: () => {},
});

export function WristCheckProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openWristCheck = useCallback(() => setIsOpen(true), []);
  const closeWristCheck = useCallback(() => setIsOpen(false), []);

  return (
    <WristCheckContext.Provider value={{ isOpen, openWristCheck, closeWristCheck }}>
      {children}
    </WristCheckContext.Provider>
  );
}

export const useWristCheck = () => useContext(WristCheckContext);
