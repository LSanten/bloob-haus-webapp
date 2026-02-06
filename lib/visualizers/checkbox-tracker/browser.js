/**
 * Checkbox Tracker — Browser Runtime
 *
 * Side effects: DOM manipulation, localStorage.
 * This is the only file that touches the DOM or browser APIs.
 *
 * Enables clickable checkboxes in markdown task lists with:
 * - Persistent state via localStorage
 * - Floating reset button (appears when boxes are checked)
 * - Undo window after reset (configurable, default 60 seconds)
 */

const UNDO_WINDOW_MS = 60000;

function getStorageKey() {
  return "bloob-haus-checkmarks:" + window.location.pathname;
}

function loadCheckboxStates() {
  const saved = localStorage.getItem(getStorageKey());
  return saved ? JSON.parse(saved) : {};
}

function saveCheckboxStates(states) {
  const key = getStorageKey();
  if (Object.keys(states).length === 0) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(states));
  }
}

function hasCheckedBoxes(checkboxes) {
  return Array.from(checkboxes).some((cb) => cb.checked);
}

function createFloatingButton() {
  const button = document.createElement("button");
  button.className = "checkbox-reset-btn";
  button.textContent = "Reset checkboxes";
  button.type = "button";
  return button;
}

function initCheckboxes() {
  // Select checkboxes in both tight lists (li > input) and loose lists (li > p > input)
  const checkboxes = document.querySelectorAll(
    'ul > li > input[type="checkbox"], ul > li > p > input[type="checkbox"]',
  );

  if (checkboxes.length === 0) return;

  // Add classes for CSS styling (more reliable than :has())
  checkboxes.forEach((checkbox) => {
    const ul = checkbox.closest("ul");
    if (ul) ul.classList.add("task-list");
    const li = checkbox.closest("li");
    if (li) li.classList.add("task-list-item");
  });

  const savedStates = loadCheckboxStates();
  let previousStates = null;
  let undoTimeout = null;
  let isInUndoWindow = false;

  const button = createFloatingButton();
  document.body.appendChild(button);

  // Initialize each checkbox
  checkboxes.forEach((checkbox, index) => {
    checkbox.removeAttribute("disabled");

    const checkboxId = "checkbox-" + index;
    checkbox.dataset.checkboxId = checkboxId;

    if (savedStates[checkboxId]) {
      checkbox.checked = true;
    }

    checkbox.addEventListener("change", function () {
      const states = loadCheckboxStates();
      if (this.checked) {
        states[this.dataset.checkboxId] = true;
      } else {
        delete states[this.dataset.checkboxId];
      }
      saveCheckboxStates(states);

      if (isInUndoWindow) {
        cancelUndoWindow();
      }

      updateButtonVisibility();
    });
  });

  function updateButtonVisibility() {
    if (hasCheckedBoxes(checkboxes) || isInUndoWindow) {
      button.classList.add("visible");
    } else {
      button.classList.remove("visible");
    }
    button.textContent = isInUndoWindow ? "Undo clearing" : "Reset checkboxes";
  }

  function cancelUndoWindow() {
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      undoTimeout = null;
    }
    isInUndoWindow = false;
    previousStates = null;
  }

  button.addEventListener("click", function () {
    if (isInUndoWindow) {
      // Undo: restore previous states
      if (previousStates) {
        checkboxes.forEach((checkbox) => {
          checkbox.checked = !!previousStates[checkbox.dataset.checkboxId];
        });
        saveCheckboxStates(previousStates);
      }
      cancelUndoWindow();
      updateButtonVisibility();
    } else {
      // Reset: clear all, start undo window
      previousStates = loadCheckboxStates();
      checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
      });
      saveCheckboxStates({});

      isInUndoWindow = true;
      updateButtonVisibility();

      undoTimeout = setTimeout(() => {
        isInUndoWindow = false;
        previousStates = null;
        updateButtonVisibility();
      }, UNDO_WINDOW_MS);
    }
  });

  updateButtonVisibility();
}

// Run when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCheckboxes);
} else {
  initCheckboxes();
}
