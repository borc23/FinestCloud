/**
 * KeyboardShortcuts.js - Manages keyboard shortcut functionality for FinestCloud Solar
 */

class KeyboardShortcutsService {
    constructor() {
        this.shortcuts = {};
        this.isEnabled = true;
        this.activeModifiers = {
            ctrl: false,
            alt: false,
            shift: false
        };
        this._boundKeyDown = this._handleKeyDown.bind(this);
        this._boundKeyUp = this._handleKeyUp.bind(this);
        this.helpDialogVisible = false;
    }

    /**
     * Initialize the keyboard shortcuts service
     */
    initialize() {
        this._setupDefaultShortcuts();
        this._addEventListeners();
        console.log('Keyboard shortcuts service initialized');
    }

    /**
     * Register a new shortcut
     * @param {string} key - The key for the shortcut (e.g., 'c', 'e')
     * @param {object} options - Options for the shortcut
     * @param {boolean} options.ctrl - Whether Control key is required
     * @param {boolean} options.alt - Whether Alt key is required
     * @param {boolean} options.shift - Whether Shift key is required
     * @param {string} options.description - Description of what the shortcut does
     * @param {Function} callback - Function to execute when shortcut is triggered
     */
    register(key, options, callback) {
        const shortcutKey = this._getShortcutKey(key, options);
        this.shortcuts[shortcutKey] = {
            key,
            ...options,
            callback
        };
        
        return this; // For chaining
    }

    /**
     * Unregister an existing shortcut
     * @param {string} key - The key to unregister
     * @param {object} options - The modifier options (ctrl, alt, shift)
     */
    unregister(key, options = {}) {
        const shortcutKey = this._getShortcutKey(key, options);
        if (this.shortcuts[shortcutKey]) {
            delete this.shortcuts[shortcutKey];
        }
        
        return this; // For chaining
    }

    /**
     * Enable keyboard shortcuts
     */
    enable() {
        this.isEnabled = true;
    }

    /**
     * Disable keyboard shortcuts
     */
    disable() {
        this.isEnabled = false;
    }

    /**
     * Get all registered shortcuts
     * @returns {Array} List of all registered shortcuts
     */
    getShortcuts() {
        return Object.values(this.shortcuts);
    }

    /**
     * Show or hide keyboard shortcuts help dialog
     */
    showHelp() {
        if (this.helpDialogVisible) {
            this.hideHelp();
            return;
        }
        
        // Create a shortcut help dialog
        const helpDialog = document.createElement('div');
        helpDialog.className = 'keyboard-shortcuts-help';
        helpDialog.id = 'keyboard-shortcuts-help';
        
        const dialogContent = document.createElement('div');
        dialogContent.className = 'keyboard-shortcuts-help-content';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'keyboard-shortcuts-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
            this.hideHelp();
        });
        
        const title = document.createElement('h2');
        title.textContent = 'Keyboard Shortcuts';
        
        const shortcutsList = document.createElement('div');
        shortcutsList.className = 'keyboard-shortcuts-list';
        
        // Group shortcuts by category
        const categories = {};
        Object.values(this.shortcuts).forEach(shortcut => {
            const category = shortcut.category || 'General';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(shortcut);
        });
        
        // Create shortcut list by category
        Object.entries(categories).forEach(([category, shortcuts]) => {
            const categoryEl = document.createElement('div');
            categoryEl.className = 'keyboard-shortcuts-category';
            
            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = category;
            categoryEl.appendChild(categoryTitle);
            
            const categoryShortcuts = document.createElement('ul');
            shortcuts.forEach(shortcut => {
                const shortcutItem = document.createElement('li');
                
                const keyCombo = document.createElement('span');
                keyCombo.className = 'keyboard-shortcut-combo';
                
                let comboText = '';
                if (shortcut.ctrl) comboText += 'Ctrl + ';
                if (shortcut.alt) comboText += 'Alt + ';
                if (shortcut.shift) comboText += 'Shift + ';
                comboText += shortcut.key.toUpperCase();
                
                keyCombo.textContent = comboText;
                
                const description = document.createElement('span');
                description.className = 'keyboard-shortcut-description';
                description.textContent = shortcut.description;
                
                shortcutItem.appendChild(keyCombo);
                shortcutItem.appendChild(description);
                categoryShortcuts.appendChild(shortcutItem);
            });
            
            categoryEl.appendChild(categoryShortcuts);
            shortcutsList.appendChild(categoryEl);
        });
        
        dialogContent.appendChild(closeButton);
        dialogContent.appendChild(title);
        dialogContent.appendChild(shortcutsList);
        helpDialog.appendChild(dialogContent);
        
        document.body.appendChild(helpDialog);
        this.helpDialogVisible = true;
    }

    /**
     * Hide the keyboard shortcuts help dialog
     */
    hideHelp() {
        const helpDialog = document.getElementById('keyboard-shortcuts-help');
        if (helpDialog) {
            document.body.removeChild(helpDialog);
        }
        this.helpDialogVisible = false;
    }

    /**
     * Clean up event listeners
     */
    cleanup() {
        this._removeEventListeners();
    }

    /**
     * Setup default keyboard shortcuts
     * @private
     */
    _setupDefaultShortcuts() {
        // General shortcuts
        this.register('h', { description: 'Show/hide keyboard shortcuts help', category: 'General' }, 
            () => this.showHelp())
            
        .register('esc', { description: 'Cancel current operation or exit capture mode', category: 'General' }, 
            () => {
                if (window.services && window.services.capture && window.services.capture.isSquareVisible) {
                    window.services.capture.toggle();
                    return;
                }
                
                if (typeof window.exitEditModeIfActive === 'function') {
                    window.exitEditModeIfActive();
                }
            });
        
        // Capture and detection
        this.register('u', { description: 'Upload image', category: 'Capture & Detection' }, 
            () => {
                if (typeof window.uploadImage === 'function') {
                    window.uploadImage();
                }
            })
            
        .register('d', { description: 'Detect roofs', category: 'Capture & Detection' }, 
            () => {
                if (typeof window.handleDetection === 'function') {
                    window.handleDetection();
                }
            });
        
        // Edit mode
        this.register('e', { description: 'Toggle edit mode', category: 'Edit' }, 
            () => {
                if (typeof window.editImage === 'function') {
                    window.editImage();
                }
            })
            
        .register('delete', { description: 'Delete selected polygon(s)', category: 'Edit' }, 
            () => {
                if (window.editService && typeof window.editService.deleteSelectedPolygons === 'function') {
                    window.editService.deleteSelectedPolygons();
                }
            });
        
        // Panel generation
        this.register('g', { description: 'Generate solar panels', category: 'Panels' }, 
            () => {
                if (typeof window.generateSolarPanels === 'function') {
                    window.generateSolarPanels();
                }
            })
            
        .register('x', { description: 'Clear all', category: 'General' }, 
            () => {
                if (typeof window.clearAll === 'function') {
                    window.clearAll();
                }
            });
    }

    /**
     * Add keyboard event listeners
     * @private
     */
    _addEventListeners() {
        document.addEventListener('keydown', this._boundKeyDown);
        document.addEventListener('keyup', this._boundKeyUp);
    }

    /**
     * Remove keyboard event listeners
     * @private
     */
    _removeEventListeners() {
        document.removeEventListener('keydown', this._boundKeyDown);
        document.removeEventListener('keyup', this._boundKeyUp);
    }

    /**
     * Handle keydown events
     * @param {KeyboardEvent} event 
     * @private
     */
    _handleKeyDown(event) {
        if (!this.isEnabled) return;
        
        // Don't trigger shortcuts when typing in form inputs
        const target = event.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        // Update modifier keys state
        this.activeModifiers.ctrl = event.ctrlKey || event.metaKey;
        this.activeModifiers.alt = event.altKey;
        this.activeModifiers.shift = event.shiftKey;

        // Get the pressed key in a normalized form
        const key = this._normalizeKey(event.key);
        
        // Check if this key combination matches any registered shortcuts
        const shortcutKey = this._getShortcutKeyFromEvent(key, this.activeModifiers);
        const shortcut = this.shortcuts[shortcutKey];
        
        if (shortcut) {
            shortcut.callback(event);
            event.preventDefault();
        }
    }

    /**
     * Handle keyup events
     * @param {KeyboardEvent} event 
     * @private
     */
    _handleKeyUp(event) {
        // Update modifier keys state
        this.activeModifiers.ctrl = event.ctrlKey || event.metaKey;
        this.activeModifiers.alt = event.altKey;
        this.activeModifiers.shift = event.shiftKey;
    }

    /**
     * Normalize key value
     * @param {string} key - Key value from event
     * @returns {string} - Normalized key value
     * @private
     */
    _normalizeKey(key) {
        // Handle special keys
        const specialKeys = {
            'Escape': 'esc',
            'Delete': 'delete',
            'Backspace': 'backspace',
            'Tab': 'tab',
            'Enter': 'enter',
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            ' ': 'space'
        };
        
        if (specialKeys[key]) {
            return specialKeys[key];
        }
        
        // For regular keys, convert to lowercase
        return key.toLowerCase();
    }

    /**
     * Generate a unique key for a shortcut based on key and modifiers
     * @param {string} key - The key
     * @param {object} options - Modifier options
     * @returns {string} - Unique shortcut key
     * @private
     */
    _getShortcutKey(key, options) {
        let shortcutKey = '';
        if (options.ctrl) shortcutKey += 'ctrl+';
        if (options.alt) shortcutKey += 'alt+';
        if (options.shift) shortcutKey += 'shift+';
        shortcutKey += key.toLowerCase();
        return shortcutKey;
    }

    /**
     * Generate a shortcut key from an event
     * @param {string} key - The pressed key
     * @param {object} modifiers - Active modifier keys
     * @returns {string} - Shortcut key
     * @private
     */
    _getShortcutKeyFromEvent(key, modifiers) {
        let shortcutKey = '';
        if (modifiers.ctrl) shortcutKey += 'ctrl+';
        if (modifiers.alt) shortcutKey += 'alt+';
        if (modifiers.shift) shortcutKey += 'shift+';
        shortcutKey += key.toLowerCase();
        return shortcutKey;
    }
}

// Create a singleton instance
const keyboardShortcuts = new KeyboardShortcutsService();

export default keyboardShortcuts;