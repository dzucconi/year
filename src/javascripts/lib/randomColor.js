import { colorNames, colors } from "./colors";
import { rand } from "./rand";

export const randomColor = () =>
  colors[colorNames[rand(0, colorNames.length - 1)]];
