"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { BOARD_LEVELS } = require("../solver-core.js");

test("level four opens only the four bottom-left cells shown in the game", () => {
  const levelThree = new Set(
    BOARD_LEVELS[2].cells.map(([row, column]) => `${row},${column}`),
  );
  const levelFour = BOARD_LEVELS[3];
  const newlyOpened = levelFour.cells
    .filter(([row, column]) => !levelThree.has(`${row},${column}`))
    .sort(([rowA, columnA], [rowB, columnB]) => rowA - rowB || columnA - columnB);

  assert.deepEqual(newlyOpened, [[5, 0], [5, 1], [5, 2], [5, 3]]);
  assert.equal(levelFour.cells.length, 28);
  assert.equal(levelFour.confirmed, true);
});

test("provisional higher levels keep every confirmed level-four cell open", () => {
  const levelFourKeys = BOARD_LEVELS[3].cells.map(([row, column]) => `${row},${column}`);

  BOARD_LEVELS.slice(4).forEach((level) => {
    const levelKeys = new Set(level.cells.map(([row, column]) => `${row},${column}`));
    levelFourKeys.forEach((key) => assert.ok(levelKeys.has(key), `level ${level.level} misses ${key}`));
  });
});
