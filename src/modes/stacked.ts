import "../stylesheets/stacked.css";

import { createYearView, updateYearView } from "../core/calendar-view.ts";
import type { StackedConfig } from "../core/config.ts";
import { startSharedEffects } from "../core/effects.ts";
import { stackedYearAt } from "../core/playback.ts";

export const startStackedMode = (
  app: HTMLElement,
  subtitles: HTMLElement,
  config: StackedConfig,
  signal: AbortSignal,
): void => {
  document.body.className = "mode-stacked";
  const view = createYearView(false);
  view.root.classList.add("stacked-calendar");
  app.replaceChildren(view.root);
  updateYearView(view, config.year, "overlay");
  startSharedEffects(config, subtitles, signal);

  if (!config.play || config.fps === 0) return;

  const startedAt = performance.now();
  let renderedYear = config.year;
  let frame = 0;

  const render = (timestamp: number): void => {
    if (signal.aborted) return;
    const year = stackedYearAt(config.year, timestamp - startedAt, config.fps);
    if (year !== renderedYear) {
      updateYearView(view, year, "overlay");
      renderedYear = year;
    }
    frame = requestAnimationFrame(render);
  };

  frame = requestAnimationFrame(render);
  signal.addEventListener("abort", () => cancelAnimationFrame(frame), {
    once: true,
  });
};
