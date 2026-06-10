import { useState, useMemo, useEffect } from 'react';
import { domains, domainCSSVars } from './world-layout';
import type { DomainId, DomainConfig } from './world-layout';

/**
 * Resolves domain colors from CSS custom properties at render time.
 * When AIOX theme is active, returns monochrome cockpit colors.
 * For other themes, falls back to the hardcoded defaults from world-layout.
 */
export function useThemedDomains(): Record<DomainId, DomainConfig> {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || '');

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.dataset.theme || '');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    const result = {} as Record<DomainId, DomainConfig>;
    for (const [id, cfg] of Object.entries(domains) as [DomainId, DomainConfig][]) {
      const vars = domainCSSVars[id];
      result[id] = {
        ...cfg,
        tileColor: style.getPropertyValue(vars.tile).trim() || cfg.tileColor,
        tileBorder: style.getPropertyValue(vars.border).trim() || cfg.tileBorder,
        agentColor: style.getPropertyValue(vars.agent).trim() || cfg.agentColor,
        floorColor: style.getPropertyValue(vars.floor).trim() || cfg.floorColor,
      };
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}
