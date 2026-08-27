import type { AppConfig } from "./config.ts";
import { startSubtitles } from "./subtitles.ts";
import { QUESTIONS } from "../data/questions.ts";

export const startSharedEffects = (
  config: AppConfig,
  subtitleOutput: HTMLElement,
  signal: AbortSignal,
): void => {
  document.documentElement.style.setProperty("--background", config.background);
  document.documentElement.style.setProperty("--foreground", config.color);

  if (config.refreshIntervalMilliseconds !== null) {
    const timer = window.setTimeout(
      () => window.location.reload(),
      config.refreshIntervalMilliseconds,
    );
    signal.addEventListener("abort", () => window.clearTimeout(timer), {
      once: true,
    });
  }

  if (config.subtitles) startSubtitles(subtitleOutput, QUESTIONS, signal);
};
