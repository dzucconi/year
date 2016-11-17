import { Calendar } from 'calendar';
import parameters from 'queryparams';

window.parameters = parameters;

const DOM = {
  app: document.getElementById('app'),
};

const render = year => {
  const calendar = new Calendar;

  const months = Array(12).fill(undefined).map((_, month) => {
    return calendar.monthDays(year, month);
  });

  DOM.app.innerHTML = `
    <div class='year'>
      <input id='year' min='1970' value='${year}' type='number'>
    </div>

    <div class='months'>
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

  DOM.year.addEventListener('input', () => {
    render(parseInt(DOM.year.value));
    DOM.year.focus();
  });
};

export default () => {
  const { year } = parameters({
    year: new Date().getFullYear(),
  });

  render(year);
};
