import { useCallback, useEffect, useState } from 'react';

import { DESKTOP_BREAKPOINT } from '@/utils/responsive';

interface GameScreenLogicReturn {
  isDesktopLayout: boolean;
}

export function useGameScreenLogic(): GameScreenLogicReturn {
  const [isDesktopLayout, setIsDesktopLayout] = useState(window.innerWidth >= DESKTOP_BREAKPOINT);

  const handleResize = useCallback(() => {
    setIsDesktopLayout(window.innerWidth >= DESKTOP_BREAKPOINT);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  return { isDesktopLayout };
}
