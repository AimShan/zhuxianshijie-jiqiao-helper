"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { BOARD_LEVELS, BOARD_TEMPLATE_CELLS } = require("../solver-core.js");

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

test("full template matches the forty-cell game outline", () => {
  assert.equal(BOARD_TEMPLATE_CELLS.length, 40);
  const keys = new Set(
    BOARD_TEMPLATE_CELLS.map(([row, column]) => `${row},${column}`),
  );

  assert.deepEqual(
    BOARD_TEMPLATE_CELLS
      .filter(([row]) => row === 0)
      .map(([, column]) => column)
      .sort((a, b) => a - b),
    [1, 2, 3, 4],
  );

  for (let row = 1; row <= 6; row += 1) {
    assert.deepEqual(
      BOARD_TEMPLATE_CELLS
        .filter(([cellRow]) => cellRow === row)
        .map(([, column]) => column)
        .sort((a, b) => a - b),
      [0, 1, 2, 3, 4, 5],
    );
  }

  assert.equal(keys.size, 40);
});

test("levels five through seven remain locked until layouts are confirmed", () => {
  const lockedLevels = BOARD_LEVELS.slice(4);
  assert.deepEqual(lockedLevels.map((level) => level.targetCellCount), [32, 36, 40]);
  lockedLevels.forEach((level) => {
    assert.equal(level.locked, true);
    assert.equal(level.cells, null);
  });
});
