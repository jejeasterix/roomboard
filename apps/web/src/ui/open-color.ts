/**
 * Palette du sélecteur de couleur (OG11, T16) : 15 lignes (teintes) de 5 nuances, claire à foncée.
 * Les teintes et les nuances 50, 200, 400, 600 et 800 viennent d'open-color (https://github.com/yeun/open-color,
 * Copyright (c) 2016 heeyeun, licence MIT), choisies comme Excalidraw (packages/common/src/colors.ts, COLOR_PALETTE,
 * Copyright (c) 2020 Excalidraw, licence MIT). `bronze` vient de Radix Colors (MIT), reprise par Excalidraw ;
 * `indigo` et `lime` sont les deux teintes d'open-color qu'Excalidraw n'affiche pas ; la première ligne est neutre.
 */
export const OPEN_COLOR: readonly (readonly string[])[] = Object.freeze([
  Object.freeze(["#ffffff", "#f1f3f5", "#868e96", "#343a40", "#1e1e1e"]),
  Object.freeze(["#f8f9fa", "#e9ecef", "#ced4da", "#868e96", "#343a40"]), // gray
  Object.freeze(["#fff5f5", "#ffc9c9", "#ff8787", "#fa5252", "#e03131"]), // red
  Object.freeze(["#fff0f6", "#fcc2d7", "#f783ac", "#e64980", "#c2255c"]), // pink
  Object.freeze(["#f8f0fc", "#eebefa", "#da77f2", "#be4bdb", "#9c36b5"]), // grape
  Object.freeze(["#f3f0ff", "#d0bfff", "#9775fa", "#7950f2", "#6741d9"]), // violet
  Object.freeze(["#edf2ff", "#bac8ff", "#748ffc", "#4c6ef5", "#3b5bdb"]), // indigo
  Object.freeze(["#e7f5ff", "#a5d8ff", "#4dabf7", "#228be6", "#1971c2"]), // blue
  Object.freeze(["#e3fafc", "#99e9f2", "#3bc9db", "#15aabf", "#0c8599"]), // cyan
  Object.freeze(["#e6fcf5", "#96f2d7", "#38d9a9", "#12b886", "#099268"]), // teal
  Object.freeze(["#ebfbee", "#b2f2bb", "#69db7c", "#40c057", "#2f9e44"]), // green
  Object.freeze(["#f4fce3", "#d8f5a2", "#a9e34b", "#82c91e", "#66a80f"]), // lime
  Object.freeze(["#fff9db", "#ffec99", "#ffd43b", "#fab005", "#f08c00"]), // yellow
  Object.freeze(["#fff4e6", "#ffd8a8", "#ffa94d", "#fd7e14", "#e8590c"]), // orange
  Object.freeze(["#f8f1ee", "#eaddd7", "#d2bab0", "#a18072", "#846358"]), // bronze
]);
