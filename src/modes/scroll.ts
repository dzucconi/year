import "../stylesheets/scroll.css";

import { calendarForYear, formatYear } from "../core/calendar.ts";
import type { ScrollConfig } from "../core/config.ts";
import { startSharedEffects } from "../core/effects.ts";
import {
  createInertialSwipe,
  inertialSwipePosition,
  type InertialSwipe,
} from "../core/playback.ts";
import { randomFor } from "../core/random.ts";
import {
  createScrollCanvasRenderer,
  moveScrollCursor,
  type ScrollCanvasRenderer,
} from "./scroll-canvas.ts";

const NATIVE_SCROLL_RANGE = 1_000_000;
const NATIVE_SCROLL_IDLE_MILLISECONDS = 120;
const YEAR_SYNC_INTERVAL_MILLISECONDS = 500;
const INITIAL_AUTOPLAY_DELAY_MILLISECONDS = 750;
const YEAR_TILE_COUNT = 5;
const YEAR_TILE_ANCHOR = Math.floor(YEAR_TILE_COUNT / 2);
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

type SemanticMonth = Readonly<{
  heading: HTMLHeadingElement;
  days: HTMLParagraphElement;
}>;

type YearTile = {
  canvas: HTMLCanvasElement;
  year: bigint | undefined;
};

const createSemanticCalendar = (): Readonly<{
  root: HTMLElement;
  heading: HTMLHeadingElement;
  months: readonly SemanticMonth[];
}> => {
  const root = document.createElement("section");
  const heading = document.createElement("h1");
  root.className = "scroll-semantic";
  const months = Array.from({ length: 12 }, () => {
    const article = document.createElement("article");
    const monthHeading = document.createElement("h2");
    const days = document.createElement("p");
    article.append(monthHeading, days);
    root.append(article);
    return { heading: monthHeading, days };
  });
  root.prepend(heading);
  return { root, heading, months };
};

export const startScrollMode = (
  app: HTMLElement,
  subtitles: HTMLElement,
  config: ScrollConfig,
  signal: AbortSignal,
): void => {
  document.body.className = "mode-scroll";

  const stage = document.createElement("div");
  const viewport = document.createElement("div");
  const track = document.createElement("div");
  const semantic = createSemanticCalendar();
  const tiles: YearTile[] = Array.from({ length: YEAR_TILE_COUNT }, () => {
    const canvas = document.createElement("canvas");
    canvas.className = "scroll-year-tile";
    canvas.setAttribute("aria-hidden", "true");
    return { canvas, year: undefined };
  });
  stage.className = "scroll-stage";
  viewport.className = "scroll-viewport";
  viewport.tabIndex = 0;
  viewport.setAttribute("aria-label", "Endless calendar");
  track.className = "scroll-track";
  track.style.height = `${NATIVE_SCROLL_RANGE}px`;
  track.append(...tiles.map(({ canvas }) => canvas));
  viewport.append(track);
  stage.append(viewport, semantic.root);

  const playback = document.createElement("button");
  const playbackIcon = document.createElement("span");
  playback.className = "scroll-playback";
  playback.type = "button";
  playback.setAttribute("aria-keyshortcuts", "Space");
  playbackIcon.className = "scroll-playback__icon";
  playbackIcon.setAttribute("aria-hidden", "true");
  playback.append(playbackIcon);
  app.replaceChildren(stage, playback);

  let year = config.year;
  let yearTop = 0;
  let renderer: ScrollCanvasRenderer | undefined;
  let frame: number | undefined;
  let wakeTimer: number | undefined;
  let yearSyncTimer: number | undefined;
  let nativeScrollIdleTimer: number | undefined;
  let swipe: InertialSwipe | undefined;
  let swipePosition = 0;
  let lastSyncedYear: bigint | undefined;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const motionRandom = randomFor(config.seed, "scroll-motion");
  let playing = config.play && config.speed !== 0 && !reducedMotion;

  const updateSemanticCalendar = (): void => {
    const calendar = calendarForYear(year);
    const label = formatYear(year);
    semantic.heading.textContent = label;
    semantic.root.setAttribute("aria-label", `Year ${label}`);
    viewport.setAttribute("aria-label", `Endless calendar, year ${label}`);
    calendar.months.forEach((month, index) => {
      const view = semantic.months[index];
      if (view === undefined) return;
      view.heading.textContent = month.name;
      view.days.textContent = Array.from({ length: month.length }, (_, day) =>
        String(day + 1),
      ).join(", ");
    });
  };

  const syncYear = (): void => {
    yearSyncTimer = undefined;
    if (year === lastSyncedYear) return;
    lastSyncedYear = year;
    updateSemanticCalendar();
    replaceParameter("year", year.toString());
  };

  const scheduleYearSync = (): void => {
    if (yearSyncTimer !== undefined) return;
    yearSyncTimer = window.setTimeout(
      syncYear,
      YEAR_SYNC_INTERVAL_MILLISECONDS,
    );
  };

  const positionTile = (tile: YearTile): void => {
    if (renderer === undefined || tile.year === undefined) return;
    const relativeYear = Number(tile.year - year);
    tile.canvas.style.top = `${yearTop + relativeYear * renderer.layout.yearHeight}px`;
    tile.canvas.style.left = `${renderer.layout.containerLeft}px`;
  };

  const reconcileTiles = (redrawAll = false): void => {
    const currentRenderer = renderer;
    if (currentRenderer === undefined) return;
    const desiredYears = Array.from(
      { length: YEAR_TILE_COUNT },
      (_, index) => year + BigInt(index - YEAR_TILE_ANCHOR),
    );
    const desiredKeys = new Set(desiredYears.map(String));
    const byYear = new Map(
      tiles.flatMap((tile) =>
        tile.year === undefined ? [] : [[tile.year.toString(), tile] as const],
      ),
    );
    const unused = tiles.filter(
      (tile) =>
        tile.year === undefined || !desiredKeys.has(tile.year.toString()),
    );
    const ordered = desiredYears.map((desiredYear) => {
      const existing = byYear.get(desiredYear.toString());
      const tile = existing ?? unused.shift();
      if (tile === undefined) throw new Error("Missing scroll year tile");
      if (redrawAll || tile.year !== desiredYear) {
        tile.year = desiredYear;
        currentRenderer.draw(tile.canvas, desiredYear);
      }
      positionTile(tile);
      return tile;
    });
    tiles.splice(0, tiles.length, ...ordered);
  };

  const updateFromScroll = (): void => {
    if (renderer === undefined) return;
    const cursor = moveScrollCursor(
      year,
      0,
      viewport.scrollTop - yearTop,
      renderer.layout.yearHeight,
    );
    if (cursor.yearsMoved === 0) return;
    year = cursor.year;
    yearTop += cursor.yearsMoved * renderer.layout.yearHeight;
    reconcileTiles();
    scheduleYearSync();
  };

  const moveBy = (pixels: number): void => {
    if (renderer === undefined || pixels === 0) return;
    viewport.scrollTop += pixels;
    updateFromScroll();
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

  const clearWakeTimer = (): void => {
    if (wakeTimer === undefined) return;
    window.clearTimeout(wakeTimer);
    wakeTimer = undefined;
  };

  const setPlaying = (
    next: boolean,
    updateLocation = true,
    delay = 0,
  ): void => {
    playing = next && config.speed !== 0;
    swipe = undefined;
    swipePosition = 0;
    clearWakeTimer();
    if (!playing && frame !== undefined) {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
    updateButton();
    if (updateLocation) replaceParameter("play", String(playing));
    if (playing && delay > 0) {
      wakeTimer = window.setTimeout(() => {
        wakeTimer = undefined;
        scheduleFrame();
      }, delay);
    } else {
      scheduleFrame();
    }
  };

  function animate(timestamp: number): void {
    frame = undefined;
    if (signal.aborted) return;
    if (document.hidden || renderer === undefined) {
      swipe = undefined;
      swipePosition = 0;
      return;
    }
    if (!playing) return;

    if (swipe !== undefined && timestamp >= swipe.nextAt) {
      if (swipe.nextAt >= swipe.startedAt + swipe.duration)
        moveBy(swipe.distance - swipePosition);
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

  const centerNativeScroll = (): void => {
    if (renderer === undefined) return;
    const center = (viewport.scrollHeight - viewport.clientHeight) / 2;
    const shift = center - viewport.scrollTop;
    if (Math.abs(shift) < 1) return;
    yearTop += shift;
    tiles.forEach(positionTile);
    viewport.scrollTop = center;
  };

  const scheduleNativeScrollReset = (): void => {
    if (nativeScrollIdleTimer !== undefined)
      window.clearTimeout(nativeScrollIdleTimer);
    nativeScrollIdleTimer = window.setTimeout(() => {
      nativeScrollIdleTimer = undefined;
      centerNativeScroll();
    }, NATIVE_SCROLL_IDLE_MILLISECONDS);
  };

  const onScroll = (): void => {
    updateFromScroll();
    scheduleNativeScrollReset();
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
    moveBy(keyDistance(event.key));
    scheduleNativeScrollReset();
  };

  const measure = (): void => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!(width > 0) || !(height > 0)) return;
    const previousHeight = renderer?.layout.yearHeight;
    const progress =
      previousHeight === undefined
        ? 0
        : (viewport.scrollTop - yearTop) / previousHeight;
    const styles = getComputedStyle(document.documentElement);
    renderer = createScrollCanvasRenderer(
      width,
      height,
      window.devicePixelRatio,
      styles.backgroundColor,
      styles.color,
    );
    if (previousHeight === undefined) {
      const center = (viewport.scrollHeight - viewport.clientHeight) / 2;
      viewport.scrollTop = center;
      yearTop = center;
    } else {
      yearTop = viewport.scrollTop - progress * renderer.layout.yearHeight;
    }
    reconcileTiles(true);
  };

  startSharedEffects(config, subtitles, signal);
  updateSemanticCalendar();
  lastSyncedYear = year;
  updateButton();
  measure();

  viewport.addEventListener("scroll", onScroll, { passive: true, signal });
  viewport.addEventListener("wheel", pauseFromInput, { passive: true, signal });
  viewport.addEventListener("pointerdown", pauseFromInput, { signal });
  window.addEventListener("keydown", onKeyDown, { signal });
  document.addEventListener(
    "visibilitychange",
    () => {
      swipe = undefined;
      swipePosition = 0;
      if (!document.hidden) scheduleFrame();
    },
    { signal },
  );
  playback.addEventListener("click", () => setPlaying(!playing), { signal });

  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(stage);
  signal.addEventListener(
    "abort",
    () => {
      resizeObserver.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
      clearWakeTimer();
      if (yearSyncTimer !== undefined) window.clearTimeout(yearSyncTimer);
      if (nativeScrollIdleTimer !== undefined)
        window.clearTimeout(nativeScrollIdleTimer);
    },
    { once: true },
  );

  requestAnimationFrame(() =>
    setPlaying(
      playing,
      reducedMotion && config.play,
      config.play ? INITIAL_AUTOPLAY_DELAY_MILLISECONDS : 0,
    ),
  );
};
