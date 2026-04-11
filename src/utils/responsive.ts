export const DESKTOP_BREAKPOINT = 1024;

export function isDesktop(): boolean {
  return window.innerWidth >= DESKTOP_BREAKPOINT;
}
