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
  createInertialSwipe,
  inertialSwipePosition,
  normalizeScrollPosition,
  type InertialSwipe,
} from "../core/playback.ts";
import { randomFor } from "../core/random.ts";

const VIEW_COUNT = 5;
const ANCHOR_INDEX = 2;
const MANUAL_DECAY = 325;
const MANUAL_STOP_VELOCITY = 0.015;
const SCROLL_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
]);

type Drag = {
  readonly pointerId: number;
  y: number;
  timestamp: number;
  velocity: number;
};

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
  const views: YearView[] = Array.from({ length: VIEW_COUNT }, () =>
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
  let position = 0;
  let scrollIdleTimer: number | undefined;
  let frame: number | undefined;
  let wakeTimer: number | undefined;
  let swipe: InertialSwipe | undefined;
  let swipePosition = 0;
  let drag: Drag | undefined;
  let manualVelocity = 0;
  let previousFrameTimestamp: number | undefined;
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

  const recycle = (yearsMoved: number): void => {
    if (Math.abs(yearsMoved) >= VIEW_COUNT) {
      anchorYear += BigInt(yearsMoved);
      renderWindow();
      return;
    }

    const direction = Math.sign(yearsMoved);
    for (let index = 0; index < Math.abs(yearsMoved); index += 1) {
      anchorYear += BigInt(direction);
      if (direction > 0) {
        const view = views.shift();
        if (view === undefined) throw new Error("Missing leading year view");
        views.push(view);
        updateYearView(
          view,
          anchorYear + BigInt(VIEW_COUNT - ANCHOR_INDEX - 1),
        );
        windowElement.append(view.root);
      } else {
        const view = views.pop();
        if (view === undefined) throw new Error("Missing trailing year view");
        views.unshift(view);
        updateYearView(view, anchorYear - BigInt(ANCHOR_INDEX));
        windowElement.prepend(view.root);
      }
    }
  };

  const paintPosition = (): void => {
    windowElement.style.transform = `translate3d(0, ${-position}px, 0)`;
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
    if (
      (playing || Math.abs(manualVelocity) >= MANUAL_STOP_VELOCITY) &&
      frame === undefined
    )
      frame = requestAnimationFrame(animate);
  };

  const clearWakeTimer = (): void => {
    if (wakeTimer === undefined) return;
    window.clearTimeout(wakeTimer);
    wakeTimer = undefined;
  };

  const setPlaying = (next: boolean, updateLocation = true): void => {
    playing = next && config.speed !== 0;
    swipe = undefined;
    swipePosition = 0;
    clearWakeTimer();
    previousFrameTimestamp = undefined;
    if (playing) manualVelocity = 0;
    if (
      !playing &&
      Math.abs(manualVelocity) < MANUAL_STOP_VELOCITY &&
      frame !== undefined
    ) {
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

  const moveBy = (pixels: number): void => {
    if (!Number.isFinite(pixels) || pixels === 0 || yearHeight <= 0) return;
    const normalized = normalizeScrollPosition(
      anchorYear,
      position + pixels,
      yearHeight,
      ANCHOR_INDEX,
    );
    if (normalized.yearsMoved !== 0) {
      recycle(normalized.yearsMoved);
      scheduleYearSync();
    }
    position = normalized.scrollTop;
    paintPosition();
  };

  function animate(timestamp: number): void {
    frame = undefined;
    if (signal.aborted) return;
    if (document.hidden || yearHeight <= 0) {
      swipe = undefined;
      swipePosition = 0;
      previousFrameTimestamp = undefined;
      return;
    }

    if (Math.abs(manualVelocity) >= MANUAL_STOP_VELOCITY) {
      const elapsed =
        previousFrameTimestamp === undefined
          ? 0
          : Math.min(32, timestamp - previousFrameTimestamp);
      previousFrameTimestamp = timestamp;
      if (elapsed > 0) {
        moveBy(manualVelocity * elapsed);
        manualVelocity *= Math.exp(-elapsed / MANUAL_DECAY);
      }
      if (Math.abs(manualVelocity) < MANUAL_STOP_VELOCITY) {
        manualVelocity = 0;
        previousFrameTimestamp = undefined;
      }
      scheduleFrame();
      return;
    }

    if (!playing) return;

    if (swipe !== undefined && timestamp >= swipe.nextAt) {
      if (swipe.nextAt >= swipe.startedAt + swipe.duration) {
        moveBy(swipe.distance - swipePosition);
      }
      swipe = undefined;
      swipePosition = 0;
    }
    swipe ??= createInertialSwipe(timestamp, config.speed, motionRandom);

    const nextPosition = inertialSwipePosition(swipe, timestamp);
    moveBy(nextPosition - swipePosition);
    swipePosition = nextPosition;
    const swipeEndsAt = swipe.startedAt + swipe.duration;
    if (timestamp >= swipeEndsAt && swipe.nextAt > timestamp) {
      wakeTimer = window.setTimeout(() => {
        wakeTimer = undefined;
        scheduleFrame();
      }, swipe.nextAt - timestamp);
      return;
    }
    scheduleFrame();
  }

  const pauseFromInput = (): void => {
    if (playing) setPlaying(false);
  };

  const stopManualMotion = (): void => {
    manualVelocity = 0;
    previousFrameTimestamp = undefined;
  };

  const keyDistance = (key: string): number => {
    if (key === "ArrowDown") return 48;
    if (key === "ArrowUp") return -48;
    if (key === "PageDown" || key === "End") return viewport.clientHeight * 0.8;
    return -viewport.clientHeight * 0.8;
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === "Space" && !isInteractive(event.target)) {
      event.preventDefault();
      setPlaying(!playing);
      return;
    }
    if (!SCROLL_KEYS.has(event.key) || isInteractive(event.target)) return;
    event.preventDefault();
    pauseFromInput();
    stopManualMotion();
    moveBy(keyDistance(event.key));
  };

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    pauseFromInput();
    stopManualMotion();
    const scale =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? viewport.clientHeight
          : 1;
    moveBy(event.deltaY * scale);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0)
    )
      return;
    pauseFromInput();
    stopManualMotion();
    drag = {
      pointerId: event.pointerId,
      y: event.clientY,
      timestamp: event.timeStamp,
      velocity: 0,
    };
    viewport.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (drag?.pointerId !== event.pointerId) return;
    event.preventDefault();
    const elapsed = Math.max(1, event.timeStamp - drag.timestamp);
    const distance = drag.y - event.clientY;
    drag.velocity = drag.velocity * 0.72 + (distance / elapsed) * 0.28;
    drag.y = event.clientY;
    drag.timestamp = event.timeStamp;
    moveBy(distance);
  };

  const endPointer = (event: PointerEvent): void => {
    if (drag?.pointerId !== event.pointerId) return;
    manualVelocity = event.timeStamp - drag.timestamp < 100 ? drag.velocity : 0;
    drag = undefined;
    previousFrameTimestamp = undefined;
    scheduleFrame();
  };

  const measure = (): void => {
    const measuredHeight =
      views[ANCHOR_INDEX]?.root.getBoundingClientRect().height ?? 0;
    if (!(measuredHeight > 0) || measuredHeight === yearHeight) return;
    const progress =
      yearHeight > 0 ? (position - ANCHOR_INDEX * yearHeight) / yearHeight : 0;
    yearHeight = measuredHeight;
    swipe = undefined;
    swipePosition = 0;
    position = (ANCHOR_INDEX + progress) * yearHeight;
    paintPosition();
  };

  renderWindow();
  startSharedEffects(config, subtitles, signal);
  updateButton();

  viewport.addEventListener("wheel", onWheel, { passive: false, signal });
  viewport.addEventListener("pointerdown", onPointerDown, { signal });
  viewport.addEventListener("pointermove", onPointerMove, {
    passive: false,
    signal,
  });
  viewport.addEventListener("pointerup", endPointer, { signal });
  viewport.addEventListener("pointercancel", endPointer, { signal });
  window.addEventListener("keydown", onKeyDown, { signal });
  document.addEventListener(
    "visibilitychange",
    () => {
      swipe = undefined;
      swipePosition = 0;
      stopManualMotion();
      if (!document.hidden) scheduleFrame();
    },
    { signal },
  );
  playback.addEventListener("click", () => setPlaying(!playing), { signal });

  const resizeObserver = new ResizeObserver(measure);
  const measuredView = views[0];
  if (measuredView !== undefined) resizeObserver.observe(measuredView.root);
  signal.addEventListener(
    "abort",
    () => {
      resizeObserver.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
      clearWakeTimer();
      if (scrollIdleTimer !== undefined) window.clearTimeout(scrollIdleTimer);
    },
    { once: true },
  );

  requestAnimationFrame(() => {
    measure();
    setPlaying(playing, reducedMotion && config.play);
  });
};
