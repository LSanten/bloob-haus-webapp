(() => {
  // lib/visualizers/checkbox-tracker/browser.js
  var UNDO_WINDOW_MS = 6e4;
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
    const checkboxes = document.querySelectorAll(
      '.task-list-item input[type="checkbox"], ul > li > input[type="checkbox"], ul > li > p > input[type="checkbox"]'
    );
    if (checkboxes.length === 0) return;
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
    checkboxes.forEach((checkbox, index) => {
      checkbox.removeAttribute("disabled");
      const checkboxId = "checkbox-" + index;
      checkbox.dataset.checkboxId = checkboxId;
      if (savedStates[checkboxId]) {
        checkbox.checked = true;
      }
      checkbox.addEventListener("change", function() {
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
    button.addEventListener("click", function() {
      if (isInUndoWindow) {
        if (previousStates) {
          checkboxes.forEach((checkbox) => {
            checkbox.checked = !!previousStates[checkbox.dataset.checkboxId];
          });
          saveCheckboxStates(previousStates);
        }
        cancelUndoWindow();
        updateButtonVisibility();
      } else {
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
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCheckboxes);
  } else {
    initCheckboxes();
  }
})();
//# sourceMappingURL=checkbox-tracker.js.map
