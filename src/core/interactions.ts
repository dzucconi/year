const IDLE_DELAY = 1_500;

export const startGlobalInteractions = (signal: AbortSignal): void => {
  let idleTimer: number | undefined;

  const markActive = (): void => {
    document.body.classList.remove("is-pointer-idle");
    if (idleTimer !== undefined) window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      document.body.classList.add("is-pointer-idle");
    }, IDLE_DELAY);
  };

  const toggleFullscreen = (event: MouseEvent): void => {
    event.preventDefault();
    const transition = document.fullscreenElement
      ? document.exitFullscreen?.()
      : document.documentElement.requestFullscreen?.();
    if (transition !== undefined) void transition.catch(() => undefined);
  };

  document.addEventListener("mousemove", markActive, { passive: true, signal });
  document.addEventListener("pointerdown", markActive, {
    passive: true,
    signal,
  });
  window.addEventListener("keydown", markActive, { signal });
  document.addEventListener("dblclick", toggleFullscreen, { signal });
  signal.addEventListener(
    "abort",
    () => {
      if (idleTimer !== undefined) window.clearTimeout(idleTimer);
      document.body.classList.remove("is-pointer-idle");
    },
    { once: true },
  );

  markActive();
};
