(function startApp() {
  "use strict";

  const { SHAPES, BOARD_LEVELS, BOARD_TEMPLATE_CELLS, solveBoard } = window.JijiaoSolver;
  const CHINESE_NUMERALS = ["壹", "贰", "叁", "肆", "伍", "陆", "柒"];
  const MAX_INVENTORY_PER_SHAPE = 99;
  const PIECE_COLORS = [
    "#72ad99",
    "#c19d5f",
    "#7c9fc4",
    "#b27a69",
    "#8c82b5",
    "#93a965",
    "#c17f96",
    "#66a3ad",
    "#b88a54",
    "#829b7f",
  ];
  const ROTATION_LABELS = {
    0: "原向",
    90: "顺转 90°",
    180: "旋转 180°",
    270: "逆转 90°",
  };

  const elements = {
    levelPicker: document.querySelector("#levelPicker"),
    cellCountBadge: document.querySelector("#cellCountBadge"),
    levelHint: document.querySelector("#levelHint"),
    shapeInventory: document.querySelector("#shapeInventory"),
    exampleButton: document.querySelector("#exampleButton"),
    selectedCount: document.querySelector("#selectedCount"),
    neededCount: document.querySelector("#neededCount"),
    inventoryMessage: document.querySelector("#inventoryMessage"),
    inventorySummary: document.querySelector(".inventory-summary"),
    summaryProgress: document.querySelector("#summaryProgress"),
    solveButton: document.querySelector("#solveButton"),
    board: document.querySelector("#board"),
    emptyState: document.querySelector("#emptyState"),
    resultSubtitle: document.querySelector("#resultSubtitle"),
    resultMessage: document.querySelector("#resultMessage"),
    solutionNav: document.querySelector("#solutionNav"),
    previousSolution: document.querySelector("#previousSolution"),
    nextSolution: document.querySelector("#nextSolution"),
    solutionIndex: document.querySelector("#solutionIndex"),
    solutionTotal: document.querySelector("#solutionTotal"),
    placementGuide: document.querySelector("#placementGuide"),
    placementList: document.querySelector("#placementList"),
    solveStats: document.querySelector("#solveStats"),
  };

  const state = {
    levelIndex: 3,
    inventory: Object.fromEntries(SHAPES.map((shape) => [shape.id, 0])),
    result: null,
    solutionIndex: 0,
    isSolving: false,
  };

  const allBoardCells = BOARD_TEMPLATE_CELLS;

  function coordinateKey(row, column) {
    return `${row},${column}`;
  }

  function currentLevel() {
    return BOARD_LEVELS[state.levelIndex];
  }

  function levelCellCount(level) {
    return level.targetCellCount ?? level.cells.length;
  }

  function requiredPieceCount() {
    return currentLevel().cells.length / 4;
  }

  function selectedPieceCount() {
    return SHAPES.reduce((total, shape) => total + state.inventory[shape.id], 0);
  }

  function configureInventorySummaryHeading() {
    const heading = elements.inventorySummary.querySelector(":scope > div:first-child");
    const label = heading.querySelector("span");
    const value = heading.querySelector("strong");
    label.textContent = "背包内机巧石";
    value.replaceChildren(
      document.createTextNode("共 "),
      elements.selectedCount,
      document.createTextNode(" 块 · 盘面需 "),
      elements.neededCount,
      document.createTextNode(" 块"),
    );
  }

  function createShapePreview(shape) {
    const preview = document.createElement("span");
    preview.className = "shape-preview";
    preview.setAttribute("aria-hidden", "true");
    preview.style.setProperty("--shape-color", shape.color);
    shape.cells.forEach(([row, column]) => {
      const cell = document.createElement("i");
      cell.className = "shape-dot";
      cell.style.gridRow = String(row + 1);
      cell.style.gridColumn = String(column + 1);
      preview.append(cell);
    });
    return preview;
  }

  function renderLevelPicker() {
    elements.levelPicker.replaceChildren();
    BOARD_LEVELS.forEach((level, index) => {
      const isLocked = Boolean(level.locked);
      const cellCount = levelCellCount(level);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `level-button${index === state.levelIndex ? " active" : ""}${
        !level.confirmed && !isLocked ? " unconfirmed" : ""
      }${isLocked ? " locked" : ""}`;
      button.dataset.levelIndex = String(index);
      button.disabled = isLocked;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", index === state.levelIndex ? "true" : "false");
      button.setAttribute("aria-disabled", isLocked ? "true" : "false");
      button.setAttribute(
        "aria-label",
        `${level.level} 级机巧盘，${cellCount} 格${isLocked ? "，开放位置待确认" : ""}`,
      );

      const numeral = document.createElement("b");
      numeral.textContent = CHINESE_NUMERALS[index];
      const count = document.createElement("small");
      count.textContent = String(cellCount);
      button.append(numeral, count);
      elements.levelPicker.append(button);
    });
  }

  function renderInventory() {
    elements.shapeInventory.replaceChildren();
    SHAPES.forEach((shape) => {
      const row = document.createElement("div");
      row.className = "shape-row";
      row.dataset.shapeId = shape.id;
      row.append(createShapePreview(shape));

      const info = document.createElement("span");
      info.className = "shape-info";
      const name = document.createElement("strong");
      name.textContent = shape.name;
      const description = document.createElement("small");
      description.textContent = "占 4 格 · 可旋转";
      info.append(name, description);

      const stepper = document.createElement("span");
      stepper.className = "stepper";
      const minusButton = document.createElement("button");
      minusButton.type = "button";
      minusButton.dataset.action = "decrease";
      minusButton.dataset.shapeId = shape.id;
      minusButton.setAttribute("aria-label", `减少${shape.name}`);
      minusButton.textContent = "−";
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = String(MAX_INVENTORY_PER_SHAPE);
      input.step = "1";
      input.value = String(state.inventory[shape.id]);
      input.dataset.shapeId = shape.id;
      input.setAttribute("aria-label", `${shape.name}背包数量`);
      const plusButton = document.createElement("button");
      plusButton.type = "button";
      plusButton.dataset.action = "increase";
      plusButton.dataset.shapeId = shape.id;
      plusButton.setAttribute("aria-label", `增加${shape.name}`);
      plusButton.textContent = "+";
      stepper.append(minusButton, input, plusButton);

      row.append(info, stepper);
      elements.shapeInventory.append(row);
    });
  }

  function updateInventoryControls() {
    elements.shapeInventory.querySelectorAll(".shape-row").forEach((row) => {
      const shapeId = row.dataset.shapeId;
      const input = row.querySelector("input");
      const decrease = row.querySelector('[data-action="decrease"]');
      const increase = row.querySelector('[data-action="increase"]');
      input.max = String(MAX_INVENTORY_PER_SHAPE);
      input.value = String(state.inventory[shapeId]);
      decrease.disabled = state.inventory[shapeId] <= 0;
      increase.disabled = state.inventory[shapeId] >= MAX_INVENTORY_PER_SHAPE;
    });
  }

  function updateLevelSummary() {
    const level = currentLevel();
    elements.cellCountBadge.textContent = `${level.cells.length} 格`;
    elements.levelHint.textContent = level.confirmed
      ? `${level.level} 级 · ${level.note}`
      : `${level.level} 级 · ${level.note}（橙点标记）`;
    elements.levelHint.classList.toggle("pending", !level.confirmed);
    elements.neededCount.textContent = String(requiredPieceCount());
  }

  function updateInventorySummary() {
    const selected = selectedPieceCount();
    const needed = requiredPieceCount();
    const difference = needed - selected;
    elements.selectedCount.textContent = String(selected);
    elements.neededCount.textContent = String(needed);
    elements.summaryProgress.style.width = `${Math.min(100, (selected / needed) * 100)}%`;
    elements.inventorySummary.classList.toggle("complete", difference <= 0);
    elements.inventorySummary.classList.remove("over");

    if (difference > 0) {
      elements.inventoryMessage.textContent = `背包数量不足，还差 ${difference} 块`;
    } else if (difference === 0) {
      elements.inventoryMessage.textContent = "数量刚好，可以开始推演";
    } else {
      elements.inventoryMessage.textContent = `数量充足，将自动从 ${selected} 块中选用 ${needed} 块`;
    }

    elements.solveButton.disabled = difference > 0 || state.isSolving;
  }

  function getPieceColor(pieceIndex) {
    return PIECE_COLORS[pieceIndex % PIECE_COLORS.length];
  }

  function renderBoard(solution) {
    const activeKeys = new Set(currentLevel().cells.map(([row, column]) => coordinateKey(row, column)));
    const pieceByCell = new Map();
    const anchorByPiece = new Map();

    if (solution) {
      solution.forEach((placement, pieceIndex) => {
        const sorted = [...placement.cells].sort(
          ([rowA, columnA], [rowB, columnB]) => rowA - rowB || columnA - columnB,
        );
        anchorByPiece.set(pieceIndex, coordinateKey(sorted[0][0], sorted[0][1]));
        placement.cells.forEach(([row, column]) => {
          pieceByCell.set(coordinateKey(row, column), { placement, pieceIndex });
        });
      });
    }

    elements.board.replaceChildren();
    allBoardCells.forEach(([row, column]) => {
      const key = coordinateKey(row, column);
      const cell = document.createElement("span");
      const piece = pieceByCell.get(key);
      cell.className = `board-cell${activeKeys.has(key) ? "" : " locked"}${piece ? " filled" : ""}`;
      cell.style.gridRow = String(row + 1);
      cell.style.gridColumn = String(column + 1);

      if (piece) {
        const pieceColor = getPieceColor(piece.pieceIndex);
        cell.style.setProperty("--piece-color", pieceColor);
        cell.style.setProperty("--piece-index", String(piece.pieceIndex));
        if (anchorByPiece.get(piece.pieceIndex) === key) {
          const label = document.createElement("b");
          label.className = "piece-number";
          label.textContent = String(piece.pieceIndex + 1);
          cell.append(label);
        }
      }

      elements.board.append(cell);
    });
  }

  function setEmptyState(title, message) {
    elements.emptyState.querySelector("strong").textContent = title;
    elements.emptyState.querySelector("p").textContent = message;
    elements.emptyState.hidden = false;
  }

  function clearResult(reason) {
    state.result = null;
    state.solutionIndex = 0;
    elements.solutionNav.hidden = true;
    elements.placementGuide.hidden = true;
    elements.resultMessage.hidden = true;
    elements.resultMessage.className = "result-message";
    elements.resultSubtitle.textContent = reason || "录入背包数量后，方案将在此呈现";
    renderBoard(null);

    if (selectedPieceCount() >= requiredPieceCount()) {
      setEmptyState("库存已录入", "点击“开始推演”自动挑选并寻找铺法");
    } else {
      setEmptyState("静候推演", "左侧录入背包库存，数量足够后即可开始");
    }
  }

  function displayCoordinateList(cells) {
    const minRow = Math.min(...currentLevel().cells.map(([row]) => row));
    const minColumn = Math.min(...currentLevel().cells.map(([, column]) => column));
    return [...cells]
      .sort(([rowA, columnA], [rowB, columnB]) => rowA - rowB || columnA - columnB)
      .map(([row, column]) => `${row - minRow + 1}-${column - minColumn + 1}`)
      .join("、");
  }

  function renderPlacementGuide(solution) {
    elements.placementList.replaceChildren();
    solution.forEach((placement, index) => {
      const shape = SHAPES.find((candidate) => candidate.id === placement.shapeId);
      const item = document.createElement("article");
      item.className = "placement-item";
      item.style.setProperty("--piece-color", getPieceColor(index));

      const number = document.createElement("b");
      number.textContent = String(index + 1);
      const details = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = shape.name;
      const coordinates = document.createElement("small");
      coordinates.textContent = `格位 ${displayCoordinateList(placement.cells)}`;
      details.append(name, coordinates);
      const rotation = document.createElement("span");
      rotation.textContent = ROTATION_LABELS[placement.rotation] || `${placement.rotation}°`;

      item.append(number, details, rotation);
      elements.placementList.append(item);
    });
  }

  function describeUsedPieces(solution) {
    const counts = Object.fromEntries(SHAPES.map((shape) => [shape.id, 0]));
    solution.forEach((placement) => { counts[placement.shapeId] += 1; });
    return SHAPES
      .filter((shape) => counts[shape.id] > 0)
      .map((shape) => `${shape.name} × ${counts[shape.id]}`)
      .join("、");
  }

  function showSolution(index) {
    if (!state.result || state.result.solutions.length === 0) return;
    state.solutionIndex = Math.max(0, Math.min(index, state.result.solutions.length - 1));
    const solution = state.result.solutions[state.solutionIndex];
    const available = selectedPieceCount();
    const needed = requiredPieceCount();
    elements.emptyState.hidden = true;
    elements.solutionIndex.textContent = String(state.solutionIndex + 1);
    elements.solutionTotal.textContent = `${state.result.solutions.length}${state.result.reachedLimit ? "+" : ""}`;
    elements.previousSolution.disabled = state.solutionIndex === 0;
    elements.nextSolution.disabled = state.solutionIndex === state.result.solutions.length - 1;
    elements.resultMessage.textContent = available > needed
      ? `本方案从背包 ${available} 块中选用 ${needed} 块：${describeUsedPieces(solution)}。`
      : `本方案使用：${describeUsedPieces(solution)}。`;
    renderBoard(solution);
    renderPlacementGuide(solution);
  }

  function displayResult(result) {
    state.result = result;
    state.solutionIndex = 0;
    elements.resultMessage.hidden = false;

    if (!result.ok) {
      elements.solutionNav.hidden = true;
      elements.placementGuide.hidden = true;
      elements.resultMessage.className = "result-message";
      elements.resultMessage.textContent = `${result.message} 可以继续补充库存，或调整现有形状数量。`;
      elements.resultSubtitle.textContent = "未找到能从当前背包中选出的铺法";
      renderBoard(null);
      setEmptyState("此路不通", "现有形状无法组合出完整盘面");
      return;
    }

    elements.resultMessage.className = "result-message success";
    elements.resultSubtitle.textContent = `${currentLevel().level} 级机巧盘 · 已自动选出 ${requiredPieceCount()} 块铺满`;
    elements.solutionNav.hidden = result.solutions.length <= 1;
    elements.placementGuide.hidden = false;
    elements.solveStats.textContent = `检索 ${result.visitedStates.toLocaleString("zh-CN")} 个状态 · ${result.elapsedMs.toFixed(1)} ms`;
    showSolution(0);
  }

  function updateInventory(shapeId, nextValue) {
    const parsed = Number.parseInt(nextValue, 10);
    state.inventory[shapeId] = Number.isFinite(parsed)
      ? Math.max(0, Math.min(MAX_INVENTORY_PER_SHAPE, parsed))
      : 0;
    updateInventoryControls();
    updateInventorySummary();
    clearResult("背包库存已更新，等待重新推演");
  }

  function selectLevel(nextIndex) {
    const nextLevel = BOARD_LEVELS[nextIndex];
    if (!nextLevel || nextLevel.locked || nextIndex === state.levelIndex) return;
    state.levelIndex = nextIndex;
    renderLevelPicker();
    updateLevelSummary();
    updateInventoryControls();
    updateInventorySummary();
    clearResult(`${currentLevel().level} 级机巧盘 · 等待推演`);
  }

  function fillExample() {
    SHAPES.forEach((shape) => { state.inventory[shape.id] = 0; });
    state.inventory.line = requiredPieceCount();
    updateInventoryControls();
    updateInventorySummary();
    clearResult("已填入一组必定可铺满的示例库存");
  }

  function handleSolve() {
    if (state.isSolving || selectedPieceCount() < requiredPieceCount()) return;
    state.isSolving = true;
    elements.solveButton.disabled = true;
    elements.solveButton.querySelector("span:nth-child(2)").textContent = "推演中…";
    elements.solveButton.querySelector("small").textContent = "正在挑选并遍历合法摆法";
    elements.resultSubtitle.textContent = "正在从背包库存中挑选可用组合…";

    window.setTimeout(() => {
      const result = solveBoard(currentLevel().cells, state.inventory, { limit: 12 });
      state.isSolving = false;
      elements.solveButton.querySelector("span:nth-child(2)").textContent = "重新推演";
      elements.solveButton.querySelector("small").textContent = "自动挑选并生成方案";
      updateInventorySummary();
      displayResult(result);
    }, 30);
  }

  elements.levelPicker.addEventListener("click", (event) => {
    const button = event.target.closest(".level-button");
    if (!button) return;
    selectLevel(Number(button.dataset.levelIndex));
  });

  elements.shapeInventory.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-shape-id]");
    if (!button) return;
    const { shapeId, action } = button.dataset;
    const delta = action === "increase" ? 1 : -1;
    updateInventory(shapeId, state.inventory[shapeId] + delta);
  });

  elements.shapeInventory.addEventListener("change", (event) => {
    if (!event.target.matches("input[data-shape-id]")) return;
    updateInventory(event.target.dataset.shapeId, event.target.value);
  });

  elements.exampleButton.addEventListener("click", fillExample);
  elements.solveButton.addEventListener("click", handleSolve);
  elements.previousSolution.addEventListener("click", () => showSolution(state.solutionIndex - 1));
  elements.nextSolution.addEventListener("click", () => showSolution(state.solutionIndex + 1));

  configureInventorySummaryHeading();
  renderLevelPicker();
  renderInventory();
  updateLevelSummary();
  updateInventoryControls();
  updateInventorySummary();
  clearResult();
})();
