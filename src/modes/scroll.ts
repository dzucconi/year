import "../stylesheets/scroll.css";

import {
  createYearView,
  updateYearView,
  type YearView,
} from "../core/calendar-view.ts";
import { yearsAround } from "../core/calendar.ts";
import type { ScrollConfig } from "../core/config.ts";
import { startSharedEffects } from "../core/effects.ts";
import {
  accumulateScroll,
  createInertialSwipe,
  inertialSwipePosition,
  normalizeScrollPosition,
  type InertialSwipe,
} from "../core/playback.ts";
import { randomFor } from "../core/random.ts";

const VIEW_COUNT = 9;
const ANCHOR_INDEX = 4;
const SCROLL_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
]);

const replaceParameter = (key: string, value: string): void => {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.replaceState(null, "", url);
};

const isInteractive = (target: EventTarget | null): boolean =>
  target instanceof HTMLButtonElement ||
  target instanceof HTMLInputElement ||
  target instanceof HTMLSelectElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLAnchorElement;

export const startScrollMode = (
  app: HTMLElement,
  subtitles: HTMLElement,
  config: ScrollConfig,
  signal: AbortSignal,
): void => {
  document.body.className = "mode-scroll";
  const viewport = document.createElement("div");
  viewport.className = "scroll-viewport";
  viewport.tabIndex = 0;
  viewport.setAttribute("aria-label", "Endless calendar");

  const windowElement = document.createElement("div");
  windowElement.className = "scroll-window";
  const views: readonly YearView[] = Array.from({ length: VIEW_COUNT }, () =>
    createYearView(true),
  );
  views.forEach((view) => view.root.classList.add("scroll-year"));
  windowElement.append(...views.map(({ root }) => root));
  viewport.append(windowElement);

  const playback = document.createElement("button");
  const playbackIcon = document.createElement("span");
  playback.className = "scroll-playback";
  playback.type = "button";
  playback.setAttribute("aria-keyshortcuts", "Space");
  playbackIcon.className = "scroll-playback__icon";
  playbackIcon.setAttribute("aria-hidden", "true");
  playback.append(playbackIcon);
  app.replaceChildren(viewport, playback);

  let anchorYear = config.year;
  let yearHeight = 0;
  let scrollIdleTimer: number | undefined;
  let frame: number | undefined;
  let scrollRemainder = 0;
  let swipe: InertialSwipe | undefined;
  let swipePosition = 0;
  let normalizing = false;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const motionRandom = randomFor(config.seed, "scroll-motion");
  let playing = config.play && config.speed !== 0 && !reducedMotion;

  const renderWindow = (): void => {
    const years = yearsAround(anchorYear, VIEW_COUNT);
    views.forEach((view, index) => {
      const year = years[index];
      if (year === undefined) throw new Error(`Missing virtual year ${index}`);
      updateYearView(view, year);
    });
  };

  const updateButton = (): void => {
    const label = playing
      ? "Pause automatic scrolling"
      : "Play automatic scrolling";
    playback.setAttribute("aria-label", label);
    playback.setAttribute("aria-pressed", String(playing));
    playback.title = label;
  };

  const scheduleFrame = (): void => {
    if (playing && frame === undefined) frame = requestAnimationFrame(animate);
  };

  const setPlaying = (next: boolean, updateLocation = true): void => {
    playing = next && config.speed !== 0;
    swipe = undefined;
    swipePosition = 0;
    if (!playing && frame !== undefined) {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
    updateButton();
    if (updateLocation) replaceParameter("play", String(playing));
    scheduleFrame();
  };

  const syncYear = (): void => replaceParameter("year", anchorYear.toString());

  const scheduleYearSync = (): void => {
    if (scrollIdleTimer !== undefined) window.clearTimeout(scrollIdleTimer);
    scrollIdleTimer = window.setTimeout(syncYear, 150);
  };

  const normalize = (): void => {
    if (normalizing || yearHeight <= 0) return;
    const position = normalizeScrollPosition(
      anchorYear,
      viewport.scrollTop,
      yearHeight,
      ANCHOR_INDEX,
    );
    if (position.yearsMoved === 0) return;

    normalizing = true;
    anchorYear = position.anchorYear;
    renderWindow();
    viewport.scrollTop = position.scrollTop;
    normalizing = false;
  };

  const onScroll = (): void => {
    normalize();
    scheduleYearSync();
  };

  const moveBy = (pixels: number): void => {
    const position = normalizeScrollPosition(
      anchorYear,
      viewport.scrollTop + pixels,
      yearHeight,
      ANCHOR_INDEX,
    );
    normalizing = true;
    if (position.yearsMoved !== 0) {
      anchorYear = position.anchorYear;
      renderWindow();
    }
    viewport.scrollTop = position.scrollTop;
    normalizing = false;
  };

  const moveFractionally = (distance: number): void => {
    const movement = accumulateScroll(scrollRemainder, distance);
    scrollRemainder = movement.remainder;
    if (movement.pixels !== 0) moveBy(movement.pixels);
  };

  function animate(timestamp: number): void {
    frame = undefined;
    if (!playing || signal.aborted) return;
    if (document.hidden || yearHeight <= 0) {
      swipe = undefined;
      swipePosition = 0;
      scheduleFrame();
      return;
    }

    if (swipe !== undefined && timestamp >= swipe.nextAt) {
      moveFractionally(swipe.distance - swipePosition);
      swipe = undefined;
      swipePosition = 0;
    }
    swipe ??= createInertialSwipe(timestamp, config.speed, motionRandom);

    const nextPosition = inertialSwipePosition(swipe, timestamp);
    moveFractionally(nextPosition - swipePosition);
    swipePosition = nextPosition;
    scheduleFrame();
  }

  const pauseFromInput = (): void => {
    if (playing) setPlaying(false);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === "Space" && !isInteractive(event.target)) {
      event.preventDefault();
      setPlaying(!playing);
      return;
    }
    if (SCROLL_KEYS.has(event.key)) pauseFromInput();
  };

  const measure = (): void => {
    const measuredHeight =
      views[ANCHOR_INDEX]?.root.getBoundingClientRect().height ?? 0;
    if (!(measuredHeight > 0) || measuredHeight === yearHeight) return;
    const progress =
      yearHeight > 0
        ? (viewport.scrollTop - ANCHOR_INDEX * yearHeight) / yearHeight
        : 0;
    yearHeight = measuredHeight;
    swipe = undefined;
    swipePosition = 0;
    normalizing = true;
    viewport.scrollTop = (ANCHOR_INDEX + progress) * yearHeight;
    normalizing = false;
  };

  renderWindow();
  startSharedEffects(config, subtitles, signal);
  updateButton();

  viewport.addEventListener("scroll", onScroll, { passive: true, signal });
  viewport.addEventListener("wheel", pauseFromInput, { passive: true, signal });
  viewport.addEventListener("touchstart", pauseFromInput, {
    passive: true,
    signal,
  });
  viewport.addEventListener("pointerdown", pauseFromInput, {
    passive: true,
    signal,
  });
  window.addEventListener("keydown", onKeyDown, { signal });
  document.addEventListener(
    "visibilitychange",
    () => {
      swipe = undefined;
      swipePosition = 0;
    },
    { signal },
  );
  playback.addEventListener("click", () => setPlaying(!playing), { signal });

  const resizeObserver = new ResizeObserver(measure);
  const measuredView = views[ANCHOR_INDEX];
  if (measuredView !== undefined) resizeObserver.observe(measuredView.root);
  signal.addEventListener(
    "abort",
    () => {
      resizeObserver.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
      if (scrollIdleTimer !== undefined) window.clearTimeout(scrollIdleTimer);
    },
    { once: true },
  );

  requestAnimationFrame(() => {
    measure();
    setPlaying(playing, reducedMotion && config.play);
  });
};
