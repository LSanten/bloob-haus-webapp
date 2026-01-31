/**
 * Interactive Features for Bloob Haus
 *
 * This file contains FUNCTIONAL JavaScript for interactive elements.
 * It should survive template changes - keeps checkmark state in localStorage.
 */

(function() {
    'use strict';

    // Generate a unique key for this page's checkboxes
    function getStorageKey() {
        return 'bloob-haus-checkmarks:' + window.location.pathname;
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
        localStorage.setItem(key, JSON.stringify(states));
    }

    // Initialize checkboxes
    function initCheckboxes() {
        const checkboxes = document.querySelectorAll('ul > li > input[type="checkbox"]');

        if (checkboxes.length === 0) return;

        const savedStates = loadCheckboxStates();

        checkboxes.forEach((checkbox, index) => {
            // Remove the disabled attribute so checkboxes are clickable
            checkbox.removeAttribute('disabled');

            // Give each checkbox a unique ID for storage
            const checkboxId = 'checkbox-' + index;
            checkbox.dataset.checkboxId = checkboxId;

            // Restore saved state
            if (savedStates[checkboxId]) {
                checkbox.checked = true;
            }

            // Add click handler to save state
            checkbox.addEventListener('change', function() {
                const states = loadCheckboxStates();
                if (this.checked) {
                    states[this.dataset.checkboxId] = true;
                } else {
                    delete states[this.dataset.checkboxId];
                }
                saveCheckboxStates(states);
            });
        });

        // Add reset button if there are checkboxes
        addResetButton(checkboxes);
    }

    // Add the "Reset - I'm done cooking" button
    function addResetButton(checkboxes) {
        // Find the main content area
        const mainContent = document.querySelector('.recipe-content') ||
                           document.querySelector('.site-main') ||
                           document.querySelector('main');

        if (!mainContent) return;

        // Create the reset container and button
        const container = document.createElement('div');
        container.className = 'recipe-reset-container';

        const button = document.createElement('button');
        button.className = 'recipe-reset-btn';
        button.textContent = 'Reset - I\'m done cooking';
        button.type = 'button';

        button.addEventListener('click', function() {
            // Uncheck all checkboxes
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });

            // Clear localStorage for this page
            localStorage.removeItem(getStorageKey());

            // Optional: brief visual feedback
            button.textContent = 'Reset complete!';
            setTimeout(() => {
                button.textContent = 'Reset - I\'m done cooking';
            }, 1500);
        });

        container.appendChild(button);
        mainContent.appendChild(container);
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCheckboxes);
    } else {
        initCheckboxes();
    }
})();
