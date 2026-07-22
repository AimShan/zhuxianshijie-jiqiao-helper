(function exposeSolver(globalScope) {
  "use strict";

  const SHAPES = [
    {
      id: "square",
      name: "方石",
      shortName: "方",
      color: "#d9a85f",
      cells: [[0, 0], [0, 1], [1, 0], [1, 1]],
    },
    {
      id: "left",
      name: "左弯石",
      shortName: "左弯",
      color: "#77b9a5",
      cells: [[0, 0], [1, 0], [1, 1], [1, 2]],
    },
    {
      id: "tee",
      name: "丁字石",
      shortName: "丁",
      color: "#89a9d5",
      cells: [[0, 0], [0, 1], [0, 2], [1, 1]],
    },
    {
      id: "line",
      name: "长条石",
      shortName: "长",
      color: "#b88bc4",
      cells: [[0, 0], [0, 1], [0, 2], [0, 3]],
    },
    {
      id: "right",
      name: "右弯石",
      shortName: "右弯",
      color: "#d9826b",
      cells: [[0, 2], [1, 0], [1, 1], [1, 2]],
    },
  ];

  function rectangle(rowStart, rowEnd, columnStart, columnEnd) {
    const cells = [];
    for (let row = rowStart; row <= rowEnd; row += 1) {
      for (let column = columnStart; column <= columnEnd; column += 1) {
        cells.push([row, column]);
      }
    }
    return cells;
  }

  function mergeCells(...groups) {
    const seen = new Set();
    const result = [];
    groups.flat().forEach(([row, column]) => {
      const key = `${row},${column}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push([row, column]);
      }
    });
    return result;
  }

  const BOARD_LEVELS = [
    {
      level: 1,
      name: "初启",
      cells: rectangle(1, 4, 1, 4),
      note: "4 × 4 · 16 格",
      confirmed: true,
    },
    {
      level: 2,
      name: "拓界",
      cells: rectangle(1, 4, 0, 4),
      note: "5 × 4 · 20 格",
      confirmed: true,
    },
    {
      level: 3,
      name: "成盘",
      cells: rectangle(1, 4, 0, 5),
      note: "6 × 4 · 24 格",
      confirmed: true,
    },
    {
      level: 4,
      name: "引星",
      cells: mergeCells(rectangle(1, 4, 0, 5), rectangle(5, 5, 0, 3)),
      note: "底部靠左新增 4 格 · 共 28 格",
      confirmed: true,
    },
    {
      level: 5,
      name: "承光",
      cells: mergeCells(
        rectangle(1, 4, 0, 5),
        rectangle(5, 5, 0, 3),
        rectangle(0, 0, 1, 4),
      ),
      note: "32 格 · 格位待实图校准",
      confirmed: false,
    },
    {
      level: 6,
      name: "圆满",
      cells: mergeCells(
        rectangle(1, 4, 0, 5),
        rectangle(5, 5, 0, 3),
        rectangle(0, 0, 1, 4),
        rectangle(6, 6, 1, 4),
      ),
      note: "36 格 · 格位待实图校准",
      confirmed: false,
    },
  ];

  function normalizeCells(cells) {
    const minRow = Math.min(...cells.map(([row]) => row));
    const minColumn = Math.min(...cells.map(([, column]) => column));
    return cells
      .map(([row, column]) => [row - minRow, column - minColumn])
      .sort(([rowA, columnA], [rowB, columnB]) => rowA - rowB || columnA - columnB);
  }

  function cellsKey(cells) {
    return cells.map(([row, column]) => `${row},${column}`).join(";");
  }

  function rotateCells(cells) {
    return normalizeCells(cells.map(([row, column]) => [column, -row]));
  }

  function getOrientations(shape) {
    const orientations = [];
    const seen = new Set();
    let current = normalizeCells(shape.cells);

    for (let turn = 0; turn < 4; turn += 1) {
      const key = cellsKey(current);
      if (!seen.has(key)) {
        seen.add(key);
        orientations.push({
          cells: current,
          rotation: turn * 90,
          height: Math.max(...current.map(([row]) => row)) + 1,
          width: Math.max(...current.map(([, column]) => column)) + 1,
        });
      }
      current = rotateCells(current);
    }

    return orientations;
  }

  const SHAPE_ORIENTATIONS = Object.fromEntries(
    SHAPES.map((shape) => [shape.id, getOrientations(shape)]),
  );

  function validateInventory(boardCells, inventory) {
    const totalPieces = SHAPES.reduce(
      (total, shape) => total + Math.max(0, Number(inventory[shape.id]) || 0),
      0,
    );
    const requiredPieces = boardCells.length / 4;

    if (boardCells.length % 4 !== 0) {
      return {
        ok: false,
        code: "INVALID_BOARD",
        message: `棋盘共有 ${boardCells.length} 格，无法由四格机巧石恰好铺满。`,
      };
    }
    if (totalPieces < requiredPieces) {
      return {
        ok: false,
        code: "TOO_FEW",
        message: `背包中的机巧石还差 ${requiredPieces - totalPieces} 块。`,
      };
    }
    return {
      ok: true,
      totalPieces,
      requiredPieces,
      surplusPieces: totalPieces - requiredPieces,
    };
  }

  function buildBoardModel(boardCells) {
    const sortedCells = boardCells
      .map(([row, column]) => [row, column])
      .sort(([rowA, columnA], [rowB, columnB]) => rowA - rowB || columnA - columnB);
    const indexByCoordinate = new Map(
      sortedCells.map(([row, column], index) => [`${row},${column}`, index]),
    );
    const neighbors = sortedCells.map(([row, column]) =>
      [[row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]]
        .map(([nextRow, nextColumn]) => indexByCoordinate.get(`${nextRow},${nextColumn}`))
        .filter((index) => index !== undefined),
    );
    return { sortedCells, indexByCoordinate, neighbors };
  }

  function buildPlacements(boardModel) {
    const { sortedCells, indexByCoordinate } = boardModel;
    const minRow = Math.min(...sortedCells.map(([row]) => row));
    const maxRow = Math.max(...sortedCells.map(([row]) => row));
    const minColumn = Math.min(...sortedCells.map(([, column]) => column));
    const maxColumn = Math.max(...sortedCells.map(([, column]) => column));
    const placements = [];
    const placementsByCell = sortedCells.map(() => []);

    SHAPES.forEach((shape, shapeIndex) => {
      const shapePlacements = new Set();
      SHAPE_ORIENTATIONS[shape.id].forEach((orientation) => {
        for (let rowOffset = minRow; rowOffset <= maxRow - orientation.height + 1; rowOffset += 1) {
          for (
            let columnOffset = minColumn;
            columnOffset <= maxColumn - orientation.width + 1;
            columnOffset += 1
          ) {
            const coordinates = orientation.cells.map(([row, column]) => [
              row + rowOffset,
              column + columnOffset,
            ]);
            const indices = coordinates.map(([row, column]) =>
              indexByCoordinate.get(`${row},${column}`),
            );
            if (indices.some((index) => index === undefined)) continue;

            let mask = 0n;
            indices.forEach((index) => { mask |= 1n << BigInt(index); });
            const placementKey = `${shape.id}:${mask.toString()}`;
            if (shapePlacements.has(placementKey)) continue;
            shapePlacements.add(placementKey);

            const placement = {
              shapeId: shape.id,
              shapeIndex,
              mask,
              indices,
              cells: coordinates,
              rotation: orientation.rotation,
            };
            const placementIndex = placements.length;
            placements.push(placement);
            indices.forEach((index) => placementsByCell[index].push(placementIndex));
          }
        }
      });
    });

    return { placements, placementsByCell };
  }

  function remainingRegionsAreValid(occupiedMask, boardModel, fullMask) {
    let unseenMask = fullMask & ~occupiedMask;
    const { neighbors } = boardModel;

    while (unseenMask !== 0n) {
      let start = 0;
      while ((unseenMask & (1n << BigInt(start))) === 0n) start += 1;

      const queue = [start];
      unseenMask &= ~(1n << BigInt(start));
      let size = 0;

      while (queue.length > 0) {
        const current = queue.pop();
        size += 1;
        neighbors[current].forEach((neighbor) => {
          const bit = 1n << BigInt(neighbor);
          if ((unseenMask & bit) !== 0n) {
            unseenMask &= ~bit;
            queue.push(neighbor);
          }
        });
      }

      if (size % 4 !== 0) return false;
    }

    return true;
  }

  function solveBoard(boardCells, inventory, options) {
    const settings = { limit: 12, ...options };
    const validation = validateInventory(boardCells, inventory);
    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();

    if (!validation.ok) {
      return { ...validation, solutions: [], elapsedMs: 0, visitedStates: 0 };
    }

    const boardModel = buildBoardModel(boardCells);
    const { placements, placementsByCell } = buildPlacements(boardModel);
    const shapeCounts = SHAPES.map((shape) => Math.max(0, Number(inventory[shape.id]) || 0));
    const fullMask = (1n << BigInt(boardCells.length)) - 1n;
    const solutions = [];
    const path = [];
    const deadStates = new Set();
    let visitedStates = 0;

    function stateKey(occupiedMask) {
      return `${occupiedMask.toString(36)}|${shapeCounts.join(",")}`;
    }

    function search(occupiedMask) {
      if (solutions.length >= settings.limit) return true;
      visitedStates += 1;

      if (occupiedMask === fullMask) {
        solutions.push(path.map((placementIndex) => placements[placementIndex]));
        return solutions.length >= settings.limit;
      }

      const key = stateKey(occupiedMask);
      if (deadStates.has(key)) return false;
      if (!remainingRegionsAreValid(occupiedMask, boardModel, fullMask)) {
        deadStates.add(key);
        return false;
      }

      let bestCandidates = null;
      for (let cellIndex = 0; cellIndex < boardCells.length; cellIndex += 1) {
        const cellBit = 1n << BigInt(cellIndex);
        if ((occupiedMask & cellBit) !== 0n) continue;

        const candidates = placementsByCell[cellIndex].filter((placementIndex) => {
          const placement = placements[placementIndex];
          return shapeCounts[placement.shapeIndex] > 0 && (placement.mask & occupiedMask) === 0n;
        });
        if (candidates.length === 0) {
          deadStates.add(key);
          return false;
        }
        if (bestCandidates === null || candidates.length < bestCandidates.length) {
          bestCandidates = candidates;
          if (candidates.length === 1) break;
        }
      }

      bestCandidates.sort((leftIndex, rightIndex) => {
        const left = placements[leftIndex];
        const right = placements[rightIndex];
        return shapeCounts[left.shapeIndex] - shapeCounts[right.shapeIndex]
          || left.shapeIndex - right.shapeIndex
          || Number(left.mask - right.mask);
      });

      const solutionCountBefore = solutions.length;
      for (const placementIndex of bestCandidates) {
        const placement = placements[placementIndex];
        shapeCounts[placement.shapeIndex] -= 1;
        path.push(placementIndex);
        const reachedLimit = search(occupiedMask | placement.mask);
        path.pop();
        shapeCounts[placement.shapeIndex] += 1;
        if (reachedLimit) return true;
      }

      if (solutions.length === solutionCountBefore) deadStates.add(key);
      return false;
    }

    search(0n);
    const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();

    return {
      ok: solutions.length > 0,
      code: solutions.length > 0 ? "SOLVED" : "NO_SOLUTION",
      message: solutions.length > 0
        ? `已从背包中找到 ${solutions.length}${solutions.length === settings.limit ? "+" : ""} 个可行方案。`
        : "背包中的形状虽然足够，但无法组合出恰好铺满当前棋盘的方案。",
      solutions,
      elapsedMs: Math.max(0, endedAt - startedAt),
      visitedStates,
      reachedLimit: solutions.length === settings.limit,
      boardCells: boardModel.sortedCells,
      availablePieces: validation.totalPieces,
      requiredPieces: validation.requiredPieces,
      surplusPieces: validation.surplusPieces,
    };
  }

  const api = {
    SHAPES,
    BOARD_LEVELS,
    SHAPE_ORIENTATIONS,
    normalizeCells,
    getOrientations,
    validateInventory,
    solveBoard,
  };

  globalScope.JijiaoSolver = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
