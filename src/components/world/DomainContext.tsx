import { createContext, useContext } from 'react';
import { domains } from './world-layout';
import type { DomainId, DomainConfig } from './world-layout';
import { useThemedDomains } from './useThemedDomains';

const DomainContext = createContext<Record<DomainId, DomainConfig>>(domains);

/** Provides theme-aware domain colors to all world sub-components */
export function DomainProvider({ children }: { children: React.ReactNode }) {
  const themedDomains = useThemedDomains();
  return (
    <DomainContext.Provider value={themedDomains}>
      {children}
    </DomainContext.Provider>
  );
}

/** Use theme-aware domain colors. Falls back to static defaults outside the provider. */
// eslint-disable-next-line react-refresh/only-export-components
export function useDomains(): Record<DomainId, DomainConfig> {
  return useContext(DomainContext);
}
