(function () {
  "use strict";
  window.DIDS = window.DIDS || {};
  const W = 640,
    H = 360,
    FOV = Math.PI / 2.85,
    MAPW = 29,
    MAPH = 20,
    DAY_SECONDS = 360;
  const CAMS = ["CAM10", "CAM13", "CAM14", "CAM15", "CAM16"];
  const NAMES = {
    CAM10: "Закулисье",
    CAM13: "Склад реквизита",
    CAM14: "Мастерская",
    CAM15: "Восточный техкоридор",
    CAM16: "Правый подход",
  };
  const STATE_FILES = {};
  const STATE_NAMES = {
    CAM10: [
      "EMPTY",
      "DISTANT",
      "HIDDEN",
      "NEAR",
      "REPOSITION",
      "HIDDEN_RIGHT",
      "SECONDARY",
      "STATIC",
      "BLACKOUT",
      "CRITICAL",
    ],
    CAM13: [
      "EMPTY",
      "FAR",
      "LEFT_HIDE",
      "MID",
      "RIGHT_HIDE",
      "REPOSITION",
      "FALSE",
      "STATIC",
      "BLACKOUT",
      "CRITICAL",
    ],
    CAM14: [
      "EMPTY",
      "FAR",
      "LEFT_HIDE",
      "MID",
      "RIGHT_HIDE",
      "REPOSITION",
      "FALSE",
      "STATIC",
      "BLACKOUT",
      "CRITICAL",
    ],
    CAM15: [
      "EMPTY",
      "FAR",
      "LEFT_HIDE",
      "MID",
      "RIGHT_HIDE",
      "REPOSITION",
      "FALSE",
      "STATIC",
      "BLACKOUT",
      "CRITICAL",
    ],
    CAM16: [
      "EMPTY",
      "FAR",
      "LEFT_HIDE",
      "MID",
      "RIGHT_HIDE",
      "REPOSITION",
      "FALSE",
      "STATIC",
      "BLACKOUT",
      "CRITICAL",
    ],
  };
  for (const id of CAMS)
    STATE_FILES[id] = STATE_NAMES[id].map(
      (n, i) =>
        `states/${id}/${id}_${String(i + 1).padStart(2, "0")}_${n}.webp`,
    );
  window.DIDS.config = {
    W,
    H,
    FOV,
    MAPW,
    MAPH,
    DAY_SECONDS,
    CAMS,
    NAMES,
    STATE_FILES,
    STATE_NAMES,
  };
})();
