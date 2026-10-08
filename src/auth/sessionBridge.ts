let forceLogoutHandler: (() => void) | null = null;

export function registerForceLogoutHandler(handler: () => void) {
  forceLogoutHandler = handler;
}

export function triggerForceLogout() {
  forceLogoutHandler?.();
}
