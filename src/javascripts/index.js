import { Calendar } from "calendar";
import length from "reading-time";
import { sample } from "./lib/rand";
import { timeout } from "./lib/timeout";
import { randomColor } from "./lib/randomColor";
import { questions } from "./data/questions";

const DOM = {
  app: document.getElementById("app"),
  subtitles: document.getElementById("subtitles"),
};

const SCHEMES = [
  { background: "black", color: "red" },
  { background: "green", color: "gold" },
  { background: "orange", color: "yellow" },
  { background: "lime", color: "purple" },
  { background: "red", color: "darkred" },
  { background: "lightsalmon", color: "red" },
  { background: "mistyrose", color: "azure" },
  { background: "whitesmoke", color: "gainsboro" },
  { background: "crimson", color: "deeppink" },
  { background: "lemonchiffon", color: "plum" },
  { background: "yellow", color: "black" },
  { background: "springgreen", color: "olive" },
  { background: "midnightblue", color: "blue" },
];

const scheme = sample(SCHEMES);

const PARAMS = {
  year: 2016,
  background: scheme.background,
  color: scheme.color,
  play: true,
  subtitles: false,
  fps: 12,
  refreshIntervalSeconds: 3600,
};

const STATE = {
  year: PARAMS.year,
};

const calendar = new Calendar();

const render = (year) => {
  if (year < 1970) STATE.year = 1970;
  if (year >= 199999) STATE.year = 1970;

  let output = "";
  let i, j, k;

  for (i = 0; i < 12; i++) {
    const month = calendar.monthDays(year, i);
    output += '<div class="month">';
    for (j = 0; j < month.length; j++) {
      const week = month[j];
      output += '<div class="week">';
      for (k = 0; k < week.length; k++) {
        const day = week[k];
        output += `<div class='day ${day ? "" : "day--zero"}'>${day}</div>`;
      }
      output += "</div>";
    }
    output += "</div>";
  }

  DOM.app.innerHTML = `
    <div class='year'>${year}</div>
    <div id='months' class='months'>${output}</div>
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

  const tick = () => {
    render(STATE.year++);
    setTimeout(() => {
      requestAnimationFrame(tick);
    }, 1000 / PARAMS.fps);
  };

  tick();

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
