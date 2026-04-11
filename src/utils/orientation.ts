export function lockOrientation(): void {
  try {
    const orientation = screen.orientation;
    if (orientation && 'lock' in orientation) {
      void (orientation as ScreenOrientation).lock('landscape-primary').catch(() => {
        // Orientation lock not supported or not in fullscreen — silently ignore
      });
    }
  } catch {
    // Screen Orientation API not supported — silently ignore
  }
}
