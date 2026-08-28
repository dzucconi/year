import "./stylesheets/base.css";

import { parseConfig } from "./core/config.ts";
import { startGlobalInteractions } from "./core/interactions.ts";

const requireElement = <ElementType extends HTMLElement>(
  id: string,
  constructor: { new (): ElementType },
): ElementType => {
  const element = document.getElementById(id);
  if (!(element instanceof constructor)) throw new Error(`Missing #${id}`);
  return element;
};

const main = async (): Promise<void> => {
  const { config, warnings } = parseConfig(
    new URLSearchParams(window.location.search),
    {
      currentYear: new Date().getFullYear(),
      supportsColor: (value) => CSS.supports("color", value),
    },
  );
  if (warnings.length > 0)
    console.warn(`Year parameters: ${warnings.join("; ")}`);

  const app = requireElement("app", HTMLElement);
  const subtitles = requireElement("subtitles", HTMLElement);
  const controller = new AbortController();
  window.addEventListener("pagehide", () => controller.abort(), { once: true });

  if (config.mode === "scroll") {
    const { startScrollMode } = await import("./modes/scroll.ts");
    startScrollMode(app, subtitles, config, controller.signal);
  } else {
    const { startStackedMode } = await import("./modes/stacked.ts");
    startStackedMode(app, subtitles, config, controller.signal);
  }

  startGlobalInteractions(controller.signal);
};

void main();
