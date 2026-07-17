"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  SHAPES,
  BOARD_LEVELS,
  SHAPE_ORIENTATIONS,
  solveBoard,
  validateInventory,
} = require("../solver-core.js");

function emptyInventory() {
  return Object.fromEntries(SHAPES.map((shape) => [shape.id, 0]));
}

function assertExactCover(level, solution, availableInventory) {
  const boardKeys = new Set(level.cells.map(([row, column]) => `${row},${column}`));
  const covered = new Set();
  const usedInventory = emptyInventory();

  for (const placement of solution) {
    usedInventory[placement.shapeId] += 1;
    assert.equal(placement.cells.length, 4);
    for (const [row, column] of placement.cells) {
      const key = `${row},${column}`;
      assert.ok(boardKeys.has(key), `placement must remain on the board: ${key}`);
      assert.ok(!covered.has(key), `placements must not overlap: ${key}`);
      covered.add(key);
    }
  }

  assert.equal(covered.size, level.cells.length);
  assert.equal(solution.length, level.cells.length / 4);
  SHAPES.forEach((shape) => {
    assert.ok(
      usedInventory[shape.id] <= availableInventory[shape.id],
      `used ${shape.id} must not exceed backpack inventory`,
    );
  });
}

test("all five game pieces contain exactly four cells", () => {
  assert.equal(SHAPES.length, 5);
  SHAPES.forEach((shape) => assert.equal(shape.cells.length, 4));
});

test("rotations are unique and do not introduce mirrored pieces", () => {
  assert.equal(SHAPE_ORIENTATIONS.square.length, 1);
  assert.equal(SHAPE_ORIENTATIONS.left.length, 4);
  assert.equal(SHAPE_ORIENTATIONS.tee.length, 4);
  assert.equal(SHAPE_ORIENTATIONS.line.length, 2);
  assert.equal(SHAPE_ORIENTATIONS.right.length, 4);
});

test("configured levels progress in four-cell increments", () => {
  assert.deepEqual(BOARD_LEVELS.map((level) => level.cells.length), [16, 20, 24, 28, 32, 36]);
});

test("inventory validation rejects shortages but accepts surplus backpack pieces", () => {
  const level = BOARD_LEVELS[2];
  const tooFew = emptyInventory();
  tooFew.square = 5;
  assert.equal(validateInventory(level.cells, tooFew).code, "TOO_FEW");

  const surplus = emptyInventory();
  surplus.square = 10;
  const validation = validateInventory(level.cells, surplus);
  assert.equal(validation.ok, true);
  assert.equal(validation.requiredPieces, 6);
  assert.equal(validation.surplusPieces, 4);
});

test("every configured level has a valid baseline tiling", () => {
  BOARD_LEVELS.forEach((level) => {
    const inventory = emptyInventory();
    inventory.line = level.cells.length / 4;
    const result = solveBoard(level.cells, inventory, { limit: 1 });
    assert.equal(result.ok, true, `level ${level.level} should be solvable`);
    assertExactCover(level, result.solutions[0], inventory);
  });
});

test("level three mixed inventory is solved as an exact cover", () => {
  const level = BOARD_LEVELS[2];
  const inventory = { square: 1, left: 1, tee: 2, line: 1, right: 1 };
  const result = solveBoard(level.cells, inventory, { limit: 4 });
  assert.equal(result.ok, true);
  result.solutions.forEach((solution) => assertExactCover(level, solution, inventory));
});

test("solver automatically selects a six-piece subset from a larger backpack", () => {
  const level = BOARD_LEVELS[2];
  const inventory = { square: 4, left: 3, tee: 5, line: 4, right: 3 };
  const result = solveBoard(level.cells, inventory, { limit: 6 });
  assert.equal(result.ok, true);
  assert.equal(result.availablePieces, 19);
  assert.equal(result.requiredPieces, 6);
  assert.equal(result.surplusPieces, 13);
  result.solutions.forEach((solution) => assertExactCover(level, solution, inventory));
});

test("an impossible but sufficiently large single-shape inventory returns no solution", () => {
  const level = BOARD_LEVELS[2];
  const inventory = emptyInventory();
  inventory.tee = 10;
  const result = solveBoard(level.cells, inventory, { limit: 1 });
  assert.equal(result.ok, false);
  assert.equal(result.code, "NO_SOLUTION");
  assert.equal(result.solutions.length, 0);
});
