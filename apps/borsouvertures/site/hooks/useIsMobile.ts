import { useViewportWidth } from '@/hooks/useViewportWidth';

const MOBILE_BREAKPOINT_PX = 900;

export function useIsMobile(): boolean {
  return useViewportWidth() <= MOBILE_BREAKPOINT_PX;
}
