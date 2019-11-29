import { Calendar } from "calendar";
import parameters from "queryparams";
import length from "reading-time";
import fps from "frame-interval";

import { rand } from "./lib/rand";
import { timeout } from "./lib/timeout";
import { randomColor } from "./lib/randomColor";
import { questions } from "./data/questions";

window.parameters = parameters;

const DOM = {
  app: document.getElementById("app"),
  subtitles: document.getElementById("subtitles")
};

const factor = rand(1, 10);

const PARAMS = parameters({
  year: new Date().getFullYear() * factor,
  background: "white",
  color: "red",
  play: false,
  subtitles: false,
  fps: 12,
  refreshIntervalSeconds: 3600
});

const STATE = {
  year: PARAMS.year
};

const render = year => {
  if (year < 1970) STATE.year = 1970;
  if (year >= 199999) STATE.year = 1970;

  const calendar = new Calendar();
  const months = Array(12)
    .fill(undefined)
    .map((_, month) => calendar.monthDays(year, month));

  DOM.app.innerHTML = `
    <div class='year'>
      ${year}
    </div>

    <div id='months' class='months'>
      ${months
        .map(
          weeks => `
        <div class='month'>
          ${weeks
            .map(
              days => `
            <div class='week'>
              ${days
                .map(
                  day => `
                <div class='day ${day ? "" : "day--zero"}'>
                  ${day}
                </div>
              `
                )
                .join("")}
            </div>
          `
            )
            .join("")}
        </div>
      `
        )
        .join("")}
    </div>
  `;
};

const init = () => {
  document.body.style.backgroundColor =
    PARAMS.background === "random" ? randomColor() : PARAMS.background;
  document.body.style.color =
    PARAMS.color === "random" ? randomColor() : PARAMS.color;

  if (PARAMS.refreshIntervalSeconds) {
    setTimeout(() => location.reload(), PARAMS.refreshIntervalSeconds * 1000);
  }

  render(STATE.year);

  if (PARAMS.play) {
    fps(requestAnimationFrame)(PARAMS.fps, () => render(STATE.year++))();
  }

  if (PARAMS.subtitles) {
    questions.reduce((memo, question) => {
      timeout(() => {
        DOM.subtitles.innerText = question;
      }, memo);

      memo += length(question).time * 2;

      return memo;
    }, 0);
  }
};

document.addEventListener("DOMContentLoaded", init);
