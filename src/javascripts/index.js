import { Calendar } from "calendar";
import parameters from "queryparams";
import length from "reading-time";
import fps from "frame-interval";

import rand from "./lib/rand";
import timeout from "./lib/timeout";

import questions from "./data/questions";

window.parameters = parameters;

const DOM = {
  app: document.getElementById("app"),
  subtitles: document.getElementById("subtitles")
};

const factor = Math.ceil(rand(0, 10));

const PARAMS = parameters({
  year: new Date().getFullYear() * factor,
  background: "white",
  color: "red",
  play: false,
  subtitles: false,
  fps: 12
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
    .map((_, month) => {
      return calendar.monthDays(year, month);
    });

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
  document.body.style.backgroundColor = PARAMS.background;
  document.body.style.color = PARAMS.color;

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
