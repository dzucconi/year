import {
  calendarForYear,
  formatYear,
  type MonthCalendar,
} from "../core/calendar.ts";

const MAX_RENDER_SCALE = 2;
const MAX_MONTH_TILE_COUNT = 32;
const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

const clamp = (minimum: number, value: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export type ScrollCanvasLayout = Readonly<{
  viewportWidth: number;
  viewportHeight: number;
  containerWidth: number;
  containerLeft: number;
  yearHeight: number;
  paddingX: number;
  paddingY: number;
  headingSize: number;
  ruleMarginTop: number;
  ruleMarginBottom: number;
  monthsTop: number;
  monthWidth: number;
  monthHeight: number;
  monthColumnGap: number;
  monthRowGap: number;
  monthNameSize: number;
  monthNameMarginBottom: number;
  daySize: number;
  dayLineHeight: number;
}>;

export const scrollCanvasLayout = (
  viewportWidth: number,
  viewportHeight: number,
): ScrollCanvasLayout => {
  const containerWidth = Math.min(viewportWidth, 48 * 16);
  const paddingX = clamp(1.25 * 16, viewportWidth * 0.06, 3 * 16);
  const paddingY = clamp(1.25 * 16, viewportWidth * 0.04, 3 * 16);
  const headingSize = clamp(2.25 * 16, viewportWidth * 0.09, 3.75 * 16);
  const ruleMarginTop = clamp(0.5 * 16, viewportWidth * 0.015, 0.875 * 16);
  const ruleMarginBottom = clamp(0.75 * 16, viewportWidth * 0.025, 1.5 * 16);
  const monthColumnGap = clamp(0.875 * 16, viewportWidth * 0.035, 2 * 16);
  const monthRowGap = clamp(1.25 * 16, viewportWidth * 0.045, 2.75 * 16);
  const monthNameSize = clamp(1.1875 * 16, viewportWidth * 0.048, 1.5 * 16);
  const daySize =
    viewportWidth >= 700
      ? clamp(0.75 * 16, viewportWidth * 0.014, 0.875 * 16)
      : clamp(0.625 * 16, viewportWidth * 0.0255, 0.875 * 16);
  const dayLineHeight = daySize * 1.45;
  const monthNameMarginBottom = monthNameSize * 0.42;
  const monthHeight = monthNameSize + monthNameMarginBottom + dayLineHeight * 6;
  const monthsTop =
    paddingY + headingSize + ruleMarginTop + 1 + ruleMarginBottom;
  const yearHeight = monthsTop + monthHeight * 4 + monthRowGap * 3 + paddingY;

  return {
    viewportWidth,
    viewportHeight,
    containerWidth,
    containerLeft: (viewportWidth - containerWidth) / 2,
    yearHeight,
    paddingX,
    paddingY,
    headingSize,
    ruleMarginTop,
    ruleMarginBottom,
    monthsTop,
    monthWidth: (containerWidth - paddingX * 2 - monthColumnGap * 2) / 3,
    monthHeight,
    monthColumnGap,
    monthRowGap,
    monthNameSize,
    monthNameMarginBottom,
    daySize,
    dayLineHeight,
  };
};

export type ScrollCursor = Readonly<{
  year: bigint;
  offset: number;
  yearsMoved: number;
}>;

export const moveScrollCursor = (
  year: bigint,
  offset: number,
  distance: number,
  yearHeight: number,
): ScrollCursor => {
  if (!(yearHeight > 0) || !Number.isFinite(distance) || distance === 0)
    return { year, offset, yearsMoved: 0 };

  const nextOffset = offset + distance;
  const yearsMoved = Math.floor(nextOffset / yearHeight);
  return {
    year: year + BigInt(yearsMoved),
    offset: nextOffset - yearsMoved * yearHeight,
    yearsMoved,
  };
};

type CanvasSurface = HTMLCanvasElement | OffscreenCanvas;
type CanvasContext =
  CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const createSurface = (width: number, height: number): CanvasSurface => {
  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(width, height);
    if (canvas.getContext("2d", { alpha: false }) !== null) return canvas;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const contextFor = (surface: CanvasSurface, alpha: boolean): CanvasContext => {
  const context = surface.getContext("2d", { alpha });
  if (context === null || !("fillText" in context))
    throw new Error("Canvas 2D is unavailable");
  return context;
};

const setFont = (
  context: CanvasContext,
  weight: number,
  size: number,
  letterSpacing = 0,
): void => {
  context.font = `${weight} ${size}px ${FONT_FAMILY}`;
  context.letterSpacing = `${letterSpacing}px`;
};

const renderMonth = (
  month: MonthCalendar,
  layout: ScrollCanvasLayout,
  scale: number,
  background: string,
  foreground: string,
): CanvasSurface => {
  const surface = createSurface(
    Math.ceil(layout.monthWidth * scale),
    Math.ceil(layout.monthHeight * scale),
  );
  const context = contextFor(surface, false);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.fillStyle = background;
  context.fillRect(0, 0, layout.monthWidth, layout.monthHeight);
  context.fillStyle = foreground;
  setFont(context, 600, layout.monthNameSize, layout.monthNameSize * -0.015);
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText(month.name, 0, 0);

  const gridTop = layout.monthNameSize + layout.monthNameMarginBottom;
  setFont(context, 500, layout.daySize);
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (let day = 1; day <= month.length; day += 1) {
    const cell = month.firstWeekday + day - 1;
    const dayColumn = cell % 7;
    const dayRow = Math.floor(cell / 7);
    context.fillText(
      String(day),
      ((dayColumn + 0.5) * layout.monthWidth) / 7,
      gridTop + (dayRow + 0.5) * layout.dayLineHeight,
    );
  }

  return surface;
};

const renderYear = (
  canvas: HTMLCanvasElement,
  year: bigint,
  layout: ScrollCanvasLayout,
  scale: number,
  background: string,
  foreground: string,
  monthTile: (month: MonthCalendar, index: number) => CanvasSurface,
): void => {
  const width = Math.ceil(layout.containerWidth * scale);
  const height = Math.ceil(layout.yearHeight * scale);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  canvas.style.width = `${layout.containerWidth}px`;
  canvas.style.height = `${layout.yearHeight}px`;
  const context = contextFor(canvas, false);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.fillStyle = background;
  context.fillRect(0, 0, layout.containerWidth, layout.yearHeight);
  context.fillStyle = foreground;
  context.textBaseline = "top";

  setFont(context, 700, layout.headingSize, layout.headingSize * -0.025);
  context.textAlign = "left";
  context.fillText(formatYear(year), layout.paddingX, layout.paddingY);

  const ruleY =
    layout.paddingY + layout.headingSize + layout.ruleMarginTop + 0.5;
  context.globalAlpha = 0.25;
  context.fillRect(
    layout.paddingX,
    ruleY,
    layout.containerWidth - layout.paddingX * 2,
    1,
  );
  context.globalAlpha = 1;

  calendarForYear(year).months.forEach((month, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    context.drawImage(
      monthTile(month, index),
      layout.paddingX + column * (layout.monthWidth + layout.monthColumnGap),
      layout.monthsTop + row * (layout.monthHeight + layout.monthRowGap),
      layout.monthWidth,
      layout.monthHeight,
    );
  });
};

export type ScrollCanvasRenderer = Readonly<{
  layout: ScrollCanvasLayout;
  renderScale: number;
  draw: (canvas: HTMLCanvasElement, year: bigint) => void;
}>;

export const createScrollCanvasRenderer = (
  viewportWidth: number,
  viewportHeight: number,
  deviceScale: number,
  background: string,
  foreground: string,
): ScrollCanvasRenderer => {
  const layout = scrollCanvasLayout(viewportWidth, viewportHeight);
  const renderScale = Math.min(MAX_RENDER_SCALE, Math.max(1, deviceScale));
  const monthTiles = new Map<string, CanvasSurface>();

  const monthTileFor = (month: MonthCalendar, index: number): CanvasSurface => {
    const key = `${index}:${month.length}:${month.firstWeekday}`;
    const cached = monthTiles.get(key);
    if (cached !== undefined) {
      monthTiles.delete(key);
      monthTiles.set(key, cached);
      return cached;
    }
    const tile = renderMonth(
      month,
      layout,
      renderScale,
      background,
      foreground,
    );
    monthTiles.set(key, tile);
    if (monthTiles.size > MAX_MONTH_TILE_COUNT) {
      const oldest = monthTiles.keys().next().value;
      if (oldest !== undefined) monthTiles.delete(oldest);
    }
    return tile;
  };

  const draw = (canvas: HTMLCanvasElement, year: bigint): void => {
    renderYear(
      canvas,
      year,
      layout,
      renderScale,
      background,
      foreground,
      monthTileFor,
    );
    canvas.dataset.year = year.toString();
    canvas.dataset.renderScale = String(renderScale);
    canvas.dataset.monthTileCount = String(monthTiles.size);
  };

  return { layout, renderScale, draw };
};
