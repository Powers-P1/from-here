export type InstallPlatform = 'ios' | 'android' | 'desktop';
export function installPlatform(userAgent: string, platform: string, touchPoints: number): InstallPlatform {
  if (/iPad|iPhone|iPod/i.test(userAgent) || platform === 'MacIntel' && touchPoints > 1) return 'ios';
  return /Android|Mobile/i.test(userAgent) ? 'android' : 'desktop';
}
export const installSteps: Record<InstallPlatform, readonly string[]> = {
  ios: ['Open FROM HERE in Safari.', 'Tap Share, then choose Add to Home Screen.', 'Confirm with Add. Open FROM HERE from its new icon.'],
  android: ['Open FROM HERE in Chrome or Edge.', 'Open the browser menu and choose Install app or Add to Home screen, if offered.', 'Confirm the browser’s installation prompt.'],
  desktop: ['Open FROM HERE in a browser that supports installation, such as Chrome or Edge.', 'Use the install icon in the address bar or the browser menu’s Install app option.', 'If installation is not offered, continue using the website.'],
};
