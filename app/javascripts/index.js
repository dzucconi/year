import { Calendar } from 'calendar';
import parameters from 'queryparams';
import throttle from 'lodash.throttle';
import max from './lib/max';
import { on, off } from './lib/events';
import rand from './lib/rand';

window.parameters = parameters;

const DOM = {
  app: document.getElementById('app'),
};

const STATE = {
  on: {},
  rendered: false,
};

const render = year => {
  if (year < 1970) return;

  if (STATE.rendered) {
    off(window, 'resize', STATE.on.resize);
    off(DOM.year, 'input', STATE.on.input);
  }

  const calendar = new Calendar;

  const months = Array(12).fill(undefined).map((_, month) => {
    return calendar.monthDays(year, month);
  });

  DOM.app.innerHTML = `
    <div class='year'>
      <input id='year' min='1970' value='${year}' type='number'>
    </div>

    <div id='months' class='months'>
      ${months.map(weeks => `
        <div class='month'>
          ${weeks.map(days => `
            <div class='week'>
              ${days.map(day => `
                <div class='day ${day ? '' : 'day--zero'}'>
                  ${day}
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;

  DOM.year = document.getElementById('year');
  DOM.months = document.getElementById('months');
  DOM.month = document.getElementsByClassName('month');

  (STATE.resize = () => {
    DOM.months.style.width = `${max(DOM.month, 'width')}px`;
    DOM.months.style.height = `${max(DOM.month, 'height')}px`;
  })();

  on(window, 'resize', STATE.on.resize = throttle(STATE.resize, 50));

  on(DOM.year, 'input', STATE.on.input = () => {
    render(parseInt(DOM.year.value));
    DOM.year.focus();
  });

  STATE.rendered = true;
};

export default () => {
  const factor = Math.ceil(rand(0, 10));

  const { year } = parameters({
    year: new Date().getFullYear() * factor,
  });

  render(year);
};
