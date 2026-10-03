// Colors come from CSS variables (styles/globals.css); cached once they resolve
type Colors = ReturnType<typeof readColors>;
let colors: Colors | null = null;

function readColors() {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    ROOF: {
      DEFAULT: v("--roof-default"),
      SELECTED: v("--roof-selected"),
      HOVER: v("--roof-hover"),
    },
    OBJECT: {
      DEFAULT: v("--object-default"),
      SELECTED: v("--object-selected"),
      HOVER: v("--object-hover"),
    },
    PANEL: {
      STROKE: v("--panel-stroke"),
      STROKE_HIGHLIGHT: v("--panel-stroke-highlight"),
      STANDARD: v("--panel-standard"),
    },
  };
}

const getColors = (): Colors =>
  colors?.ROOF.DEFAULT ? colors : (colors = readColors());

// Roof and object polygons share stroke/fill styles and differ only in z-index
const POLYGON_STYLES = {
  default: { strokeOpacity: 0.9, strokeWeight: 2, fillOpacity: 0.3 },
  selected: { strokeOpacity: 0.9, strokeWeight: 3, fillOpacity: 0.4 },
};
const POLYGON_Z_INDEX = {
  roof: { default: 1000, selected: 1050 },
  object: { default: 1100, selected: 1150 },
};

const PANEL_STYLES = {
  default: {
    strokeOpacity: 0.9,
    strokeWeight: 1.5,
    fillOpacity: 0.95,
    zIndex: 1101,
    draggable: false,
  },
  selected: {
    strokeOpacity: 0.5,
    strokeWeight: 2.0,
    fillOpacity: 0.95,
    zIndex: 1802,
    draggable: true,
  },
  hover: {
    strokeOpacity: 0.95,
    strokeWeight: 2.0,
    fillOpacity: 0.97,
    zIndex: 1101,
    draggable: false,
  },
};

export const StyleConfig = {
  get COLORS(): Colors {
    return getColors();
  },

  getOptionsForType(
    isRoof: boolean,
    isSelected: boolean = false,
  ): google.maps.PolygonOptions {
    const state = isSelected ? "selected" : "default";
    const color =
      getColors()[isRoof ? "ROOF" : "OBJECT"][
        isSelected ? "SELECTED" : "DEFAULT"
      ];
    return {
      ...POLYGON_STYLES[state],
      strokeColor: color,
      fillColor: color,
      editable: isSelected,
      draggable: isSelected,
      clickable: true,
      zIndex: POLYGON_Z_INDEX[isRoof ? "roof" : "object"][state],
    };
  },

  getPanelOptions(
    state: "default" | "selected" | "hover" = "default",
  ): google.maps.PolygonOptions {
    const { PANEL } = getColors();
    return {
      ...PANEL_STYLES[state],
      strokeColor: {
        default: PANEL.STROKE,
        selected: "#FFFFFF", // Soft white glow/shadow for selected
        hover: PANEL.STROKE_HIGHLIGHT,
      }[state],
      fillColor: PANEL.STANDARD,
      editable: false,
      clickable: true,
    };
  },
};
