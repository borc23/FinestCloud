declare module 'polylabel' {
  /**
   * Finds the pole of inaccessibility (visual center) of a polygon
   * @param polygon An array of rings, where the first is the outer ring and others are holes
   * @param precision Precision (default 1.0)
   * @returns [x, y] coordinates of the pole of inaccessibility
   */
  function polylabel(polygon: number[][][], precision?: number): [number, number]
  export default polylabel
}
