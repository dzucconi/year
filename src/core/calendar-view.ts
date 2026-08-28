import { calendarForYear, formatYear } from "./calendar.ts";

const TEMPLATE_CALENDAR = calendarForYear(2000n);

type MonthView = Readonly<{
  root: HTMLElement;
  days: readonly HTMLElement[];
}>;

export type YearView = Readonly<{
  root: HTMLElement;
  heading: HTMLElement;
  months: readonly MonthView[];
}>;

const element = <Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  className?: string,
): HTMLElementTagNameMap[Tag] => {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
};

const createMonth = (monthIndex: number, labelled: boolean): MonthView => {
  const root = element(labelled ? "article" : "div", "calendar-month");
  const calendar = TEMPLATE_CALENDAR.months[monthIndex];
  if (calendar === undefined) throw new Error(`Missing month ${monthIndex}`);

  if (labelled) {
    const heading = element("h2", "calendar-month__name");
    heading.textContent = calendar.name;
    root.append(heading);
  }

  const grid = element("div", "calendar-month__grid");
  const days = Array.from({ length: calendar.length }, (_, index) => {
    const day = element("span", "calendar-day");
    day.textContent = String(index + 1);
    grid.append(day);
    return day;
  });
  root.append(grid);
  return { root, days };
};

export const createYearView = (labelled: boolean): YearView => {
  const root = element(labelled ? "section" : "div", "calendar-year");
  const heading = element(labelled ? "h1" : "div", "calendar-year__heading");
  const monthsRoot = element("div", "calendar-year__months");
  const months = Array.from({ length: 12 }, (_, index) =>
    createMonth(index, labelled),
  );

  root.append(heading);
  if (labelled) root.append(element("hr", "calendar-year__rule"));
  monthsRoot.append(...months.map(({ root: month }) => month));
  root.append(monthsRoot);
  return { root, heading, months };
};

export const updateYearView = (
  view: YearView,
  year: bigint,
  layout: "grid" | "overlay" = "grid",
): void => {
  const calendar = calendarForYear(year);
  const label = formatYear(year);
  view.heading.textContent = label;
  view.root.dataset.year = year.toString();
  view.root.setAttribute("aria-label", `Year ${label}`);

  calendar.months.forEach((month, index) => {
    const monthView = view.months[index];
    if (monthView === undefined) throw new Error(`Missing month view ${index}`);
    monthView.root.setAttribute("aria-label", `${month.name} ${label}`);

    if (layout === "overlay") {
      monthView.root.dataset.start = String(month.firstWeekday);
      monthView.days.forEach((day, dayIndex) => {
        day.hidden = dayIndex >= month.length;
        const cell = month.firstWeekday + dayIndex;
        day.style.transform = `translate(${(cell % 7) * 2}em, ${Math.floor(cell / 7) * 1.2}em)`;
      });
      return;
    }

    const firstDay = monthView.days[0];
    if (firstDay !== undefined)
      firstDay.style.gridColumnStart = String(month.firstWeekday + 1);
    if (index === 1) {
      const leapDay = monthView.days[28];
      if (leapDay !== undefined) leapDay.hidden = month.length === 28;
    }
  });
};
