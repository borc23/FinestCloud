/**
 * Example usage of the centralized color system
 * This file demonstrates how to use the new StyleConfig color system
 */

import { StyleConfig } from './StyleConfig.js';

// Example 1: Basic color usage
function exampleBasicColors() {
    // Get default colors
    const roofColor = StyleConfig.getRoofColor('default');      // #27ae60
    const objectColor = StyleConfig.getObjectColor('default');  // #e74c3c
    
    // Get selected state colors
    const roofSelected = StyleConfig.getRoofColor('selected');  // #219a52
    const objectSelected = StyleConfig.getObjectColor('selected'); // #c0392b
    
    // Get hover state colors
    const roofHover = StyleConfig.getRoofColor('hover');        // #2ecc71
    const objectHover = StyleConfig.getObjectColor('hover');    // #f56565
    
    console.log('Roof colors:', { roofColor, roofSelected, roofHover });
    console.log('Object colors:', { objectColor, objectSelected, objectHover });
}

// Example 2: Generic polygon color getter
function examplePolygonColors() {
    const isRoof = true;
    
    // Get colors based on polygon type and state
    const defaultColor = StyleConfig.getPolygonColor(isRoof, 'default');
    const selectedColor = StyleConfig.getPolygonColor(isRoof, 'selected');
    const hoverColor = StyleConfig.getPolygonColor(isRoof, 'hover');
    
    console.log('Polygon colors:', { defaultColor, selectedColor, hoverColor });
}

// Example 3: Panel/Module colors
function examplePanelColors() {
    // Get module colors
    const standardPanel = StyleConfig.getModuleColor('STANDARD');  // #1a1a1a
    const premiumPanel = StyleConfig.getModuleColor('PREMIUM');    // #0d0d0d
    const compactPanel = StyleConfig.getModuleColor('COMPACT');    // #262626
    
    console.log('Panel colors:', { standardPanel, premiumPanel, compactPanel });
}

// Example 4: Convert colors to rgba
function exampleRgbaConversion() {
    const roofColor = StyleConfig.getRoofColor('default');
    
    // Convert to rgba with different opacities
    const semiTransparent = StyleConfig.hexToRgba(roofColor, 0.5);  // rgba(39, 174, 96, 0.5)
    const veryTransparent = StyleConfig.hexToRgba(roofColor, 0.2);  // rgba(39, 174, 96, 0.2)
    const opaque = StyleConfig.hexToRgba(roofColor, 1.0);           // rgba(39, 174, 96, 1)
    
    console.log('RGBA conversions:', { semiTransparent, veryTransparent, opaque });
}

// Example 5: Get all colors for configuration export
function exampleGetAllColors() {
    const allColors = StyleConfig.getAllColors();
    
    console.log('All colors configuration:', allColors);
    
    // This returns:
    // {
    //   roof: { default: '#27ae60', selected: '#219a52', hover: '#2ecc71' },
    //   object: { default: '#e74c3c', selected: '#c0392b', hover: '#f56565' },
    //   panel: { stroke: '#ffffff', standard: '#1a1a1a', premium: '#0d0d0d', compact: '#262626' }
    // }
}

// Example 6: Dynamic color updates
function exampleDynamicColors() {
    // Save current colors
    const originalColors = StyleConfig.getAllColors();
    
    // Update some colors
    StyleConfig.setColors({
        roof: {
            default: '#2ecc71',    // Change roof default to a lighter green
            selected: '#27ae60'    // Change roof selected to the old default
        },
        object: {
            default: '#f39c12'     // Change object default to orange
        }
    });
    
    // Get the updated colors
    const newRoofColor = StyleConfig.getRoofColor('default');
    const newObjectColor = StyleConfig.getObjectColor('default');
    
    console.log('Updated colors:', { newRoofColor, newObjectColor });
    
    // Restore original colors if needed
    StyleConfig.setColors(originalColors);
}

// Example 7: Using colors in polygon creation
function examplePolygonCreation(isRoof, isSelected = false) {
    // Get appropriate colors for the polygon state
    const strokeColor = StyleConfig.getPolygonColor(isRoof, isSelected ? 'selected' : 'default');
    const fillColor = StyleConfig.getPolygonColor(isRoof, isSelected ? 'selected' : 'default');
    const fillOpacity = isSelected ? 0.4 : 0.2;
    
    // Create polygon options object
    const polygonOptions = {
        strokeColor: strokeColor,
        strokeOpacity: 0.9,
        strokeWeight: isSelected ? 3 : 2,
        fillColor: fillColor,
        fillOpacity: fillOpacity,
        editable: isSelected,
        draggable: isSelected
    };
    
    return polygonOptions;
}

// Example 8: CSS variable integration
function exampleCSSIntegration() {
    // For cases where you need to update CSS custom properties from JavaScript
    const roofColor = StyleConfig.getRoofColor('default');
    const objectColor = StyleConfig.getObjectColor('default');
    
    // Update CSS variables
    document.documentElement.style.setProperty('--roof-color', roofColor);
    document.documentElement.style.setProperty('--object-color', objectColor);
    
    // Or read CSS variables to sync with JavaScript
    const cssRoofColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--roof-color').trim();
    
    console.log('CSS roof color:', cssRoofColor);
}

// Example 9: Theme switching
function exampleThemeSwitch(theme) {
    const themes = {
        default: {
            roof: { default: '#27ae60', selected: '#219a52', hover: '#2ecc71' },
            object: { default: '#e74c3c', selected: '#c0392b', hover: '#f56565' }
        },
        dark: {
            roof: { default: '#52c41a', selected: '#389e0d', hover: '#73d13d' },
            object: { default: '#ff4d4f', selected: '#cf1322', hover: '#ff7875' }
        },
        highContrast: {
            roof: { default: '#00ff00', selected: '#00cc00', hover: '#33ff33' },
            object: { default: '#ff0000', selected: '#cc0000', hover: '#ff3333' }
        }
    };
    
    if (themes[theme]) {
        StyleConfig.setColors(themes[theme]);
        console.log(`Switched to ${theme} theme`);
    }
}

// Run examples
export function runColorExamples() {
    console.log('=== StyleConfig Color System Examples ===');
    
    exampleBasicColors();
    examplePolygonColors();
    examplePanelColors();
    exampleRgbaConversion();
    exampleGetAllColors();
    exampleDynamicColors();
    
    // Test polygon creation
    const roofPolygonOptions = examplePolygonCreation(true, false);
    const selectedObjectOptions = examplePolygonCreation(false, true);
    console.log('Roof polygon options:', roofPolygonOptions);
    console.log('Selected object options:', selectedObjectOptions);
    
    // Test theme switching
    exampleThemeSwitch('dark');
    exampleThemeSwitch('default');
    
    console.log('=== Examples Complete ===');
}

// Export for use in other modules
export {
    exampleBasicColors,
    examplePolygonColors,
    examplePanelColors,
    exampleRgbaConversion,
    exampleGetAllColors,
    exampleDynamicColors,
    examplePolygonCreation,
    exampleCSSIntegration,
    exampleThemeSwitch
};
