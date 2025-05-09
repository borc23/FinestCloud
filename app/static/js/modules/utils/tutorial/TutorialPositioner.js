/**
 * TutorialPositioner.js
 * Handles accurate positioning of tutorial UI elements
 */

export class TutorialPositioner {
    /**
     * Position highlight and tooltip elements
     * @param {HTMLElement} targetElement - The element to highlight
     * @param {string} position - Desired tooltip position relative to target
     * @param {TutorialUI} ui - UI instance with elements
     */
    positionElements(targetElement, position, ui) {
        const elements = ui.getElements();
        
        // --- Tooltip: Always position at bottom-left of the viewport ---
        elements.tooltip.style.display = 'block';
        elements.tooltip.style.position = 'fixed';
        elements.tooltip.style.left = '80px';
        elements.tooltip.style.bottom = '20px';
        elements.tooltip.style.top = 'auto';
        elements.tooltip.style.right = 'auto';
        elements.tooltip.style.transform = 'none';

        // First try to apply CSS-based highlighting when possible
        const cssClassHighlight = this.applyCssHighlightIfPossible(targetElement);

        if (targetElement === document.body) {
            // For body-targeted steps (e.g., welcome message), no specific element is highlighted
            elements.highlight.style.display = 'none';
            // Tooltip is already positioned by the general rule above.
        } 
        // Only use the fallback highlight element if CSS-based highlighting wasn't applied
        else if (!cssClassHighlight) {
            const targetRect = targetElement.getBoundingClientRect();
            
            // Position highlight around the target element
            elements.highlight.style.display = 'block';
            elements.highlight.style.top = `${targetRect.top - 10}px`;
            elements.highlight.style.left = `${targetRect.left - 10}px`;
            elements.highlight.style.width = `${targetRect.width + 20}px`;
            elements.highlight.style.height = `${targetRect.height + 20}px`;
        } else {
            // If CSS-based highlighting was used, hide the highlight element
            elements.highlight.style.display = 'none';
        }
        
        // Ensure tooltip stays within viewport with reasonable margins
        const viewportWidth = window.innerWidth; 
        const viewportHeight = window.innerHeight; 
        const safeInset = Math.min(Math.max(viewportWidth * 0.05, 20), 50); // Between 20-50px
        this.adjustTooltipPosition(elements.tooltip, safeInset);
    }

    /**
     * Apply CSS-based highlight to target element
     * @param {HTMLElement} targetElement - The element to highlight
     * @returns {boolean} - Whether CSS highlighting was applied
     */
    applyCssHighlightIfPossible(targetElement) {
        if (!targetElement || targetElement === document.body) {
            return false;
        }

        // Check if this is a button or menu item that should use CSS-based highlighting
        const isButton = targetElement.tagName === 'BUTTON' || 
                         targetElement.classList.contains('menu-item') ||
                         targetElement.classList.contains('action-button') ||
                         targetElement.id === 'createPolygonBtn' ||
                         targetElement.id === 'detectButton' ||
                         targetElement.id === 'editButton';

        // If it's a button, apply the appropriate class
        if (isButton) {
            targetElement.classList.add('button-highlight');
            return true;
        }

        // For module selector specific elements
        if (targetElement.classList.contains('module-select-button') || 
            targetElement.closest('.module-select-button')) {
            const moduleBtn = targetElement.classList.contains('module-select-button') ? 
                targetElement : targetElement.closest('.module-select-button');
            moduleBtn.classList.add('module-selector-highlight');
            return true;
        }

        return false;
    }

    /**
     * Adjust tooltip position to ensure it's within the viewport
     * @param {HTMLElement} tooltipElement - The tooltip element
     * @param {number} insetAmount - The amount to inset from edges
     */
    adjustTooltipPosition(tooltipElement, insetAmount = 10) {
        const tooltipRect = tooltipElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Adjust horizontal position if needed
        if (tooltipRect.left < insetAmount) {
            tooltipElement.style.left = `${insetAmount}px`;
        } else if (tooltipRect.right > viewportWidth - insetAmount) {
            tooltipElement.style.left = `${viewportWidth - tooltipRect.width - insetAmount}px`;
        }
        
        // Adjust vertical position if needed
        if (tooltipRect.top < insetAmount) {
            tooltipElement.style.top = `${insetAmount}px`;
        } else if (tooltipRect.bottom > viewportHeight - insetAmount) {
            tooltipElement.style.top = `${viewportHeight - tooltipRect.height - insetAmount}px`;
        }
    }
}