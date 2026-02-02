/**
 * Checkbox Tracker Visualizer
 *
 * Enables clickable checkboxes in markdown task lists with:
 * - Persistent state via localStorage
 * - Floating reset button (appears when boxes are checked)
 * - Undo window after reset (60 seconds to restore)
 */

(function () {
  "use strict";

  const UNDO_WINDOW_MS = 60000; // 60 seconds

  // Generate a unique key for this page's checkboxes
  function getStorageKey() {
    return "bloob-haus-checkmarks:" + window.location.pathname;
  }

  // Load saved checkbox states from localStorage
  function loadCheckboxStates() {
    const key = getStorageKey();
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  }

  // Save checkbox states to localStorage
  function saveCheckboxStates(states) {
    const key = getStorageKey();
    if (Object.keys(states).length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(states));
    }
  }

  // Check if any checkboxes are currently checked
  function hasCheckedBoxes(checkboxes) {
    return Array.from(checkboxes).some((cb) => cb.checked);
  }

  // Count checked boxes
  function countChecked(checkboxes) {
    return Array.from(checkboxes).filter((cb) => cb.checked).length;
  }

  // Initialize checkboxes
  function initCheckboxes() {
    const checkboxes = document.querySelectorAll(
      'ul > li > input[type="checkbox"]',
    );

    if (checkboxes.length === 0) return;

    const savedStates = loadCheckboxStates();
    let previousStates = null; // For undo functionality
    let undoTimeout = null;
    let isInUndoWindow = false;

    // Create floating button (hidden initially)
    const button = createFloatingButton();
    document.body.appendChild(button);

    // Initialize each checkbox
    checkboxes.forEach((checkbox, index) => {
      // Remove the disabled attribute so checkboxes are clickable
      checkbox.removeAttribute("disabled");

      // Give each checkbox a unique ID for storage
      const checkboxId = "checkbox-" + index;
      checkbox.dataset.checkboxId = checkboxId;

      // Restore saved state
      if (savedStates[checkboxId]) {
        checkbox.checked = true;
      }

      // Add click handler to save state
      checkbox.addEventListener("change", function () {
        const states = loadCheckboxStates();
        if (this.checked) {
          states[this.dataset.checkboxId] = true;
        } else {
          delete states[this.dataset.checkboxId];
        }
        saveCheckboxStates(states);

        // Cancel undo window if user manually checks a box
        if (isInUndoWindow) {
          cancelUndoWindow();
        }

        updateButtonVisibility();
      });
    });

    // Update button visibility based on current state
    function updateButtonVisibility() {
      if (hasCheckedBoxes(checkboxes) || isInUndoWindow) {
        button.classList.add("visible");
      } else {
        button.classList.remove("visible");
      }

      // Update button text based on state
      if (isInUndoWindow) {
        button.textContent = "Undo clearing";
      } else {
        button.textContent = "Reset checkboxes";
      }
    }

    // Cancel undo window
    function cancelUndoWindow() {
      if (undoTimeout) {
        clearTimeout(undoTimeout);
        undoTimeout = null;
      }
      isInUndoWindow = false;
      previousStates = null;
    }

    // Handle button click
    button.addEventListener("click", function () {
      if (isInUndoWindow) {
        // UNDO: Restore previous states
        if (previousStates) {
          checkboxes.forEach((checkbox) => {
            const checkboxId = checkbox.dataset.checkboxId;
            checkbox.checked = !!previousStates[checkboxId];
          });
          saveCheckboxStates(previousStates);
        }
        cancelUndoWindow();
        updateButtonVisibility();
      } else {
        // RESET: Clear all checkboxes, start undo window
        previousStates = loadCheckboxStates();

        checkboxes.forEach((checkbox) => {
          checkbox.checked = false;
        });
        saveCheckboxStates({});

        isInUndoWindow = true;
        updateButtonVisibility();

        // Auto-hide after undo window expires
        undoTimeout = setTimeout(() => {
          isInUndoWindow = false;
          previousStates = null;
          updateButtonVisibility();
        }, UNDO_WINDOW_MS);
      }
    });

    // Initial visibility check
    updateButtonVisibility();
  }

  // Create the floating reset button
  function createFloatingButton() {
    const button = document.createElement("button");
    button.className = "checkbox-reset-btn";
    button.textContent = "Reset checkboxes";
    button.type = "button";
    return button;
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCheckboxes);
  } else {
    initCheckboxes();
  }
})();
