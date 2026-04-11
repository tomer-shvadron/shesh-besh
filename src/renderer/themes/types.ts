export interface CheckerStyle {
  fill: string;
  stroke: string;
  gradientLight: string;
  gradientDark: string;
}

export interface BoardTheme {
  board: {
    frame: string;
    surface: string;
    bar: string;
  };
  triangles: {
    light: string;
    dark: string;
  };
  checkers: {
    white: CheckerStyle;
    black: CheckerStyle;
  };
  dice: {
    bg: string;
    pips: string;
    usedBg: string;
    usedPips: string;
    border: string;
  };
  highlights: {
    valid: string;
    selected: string;
    hit: string;
  };
  text: string;
  bearOffLabel: string;
}
