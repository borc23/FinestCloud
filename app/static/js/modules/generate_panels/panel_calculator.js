export class PanelCalculator {
    #currentModule = 'standard';
    #maxSunshineHoursPerYear = 1300; // Updated average for Germany (peak sun hours)
    #currentPanelCount = 0;
    
    constructor() {}
    
    setCurrentModule(moduleId) {
      this.#currentModule = moduleId;
    }
    
    setMaxSunshineHoursPerYear(hours) {
      this.#maxSunshineHoursPerYear = hours;
    }
    
    /**
     * Set current panel count
     * @param {number} count - Number of panels
     */
    setCurrentPanelCount(count) {
        this.#currentPanelCount = count;
    }
    
    /**
     * Get current panel count
     * @returns {number} Current panel count
     */
    getCurrentPanelCount() {
        return this.#currentPanelCount;
    }
    
    /**
     * Calculate system power in kW based on panel count and module type
     * @param {number} panelCount - Number of panels (optional, uses current count if not provided)
     * @returns {number} System power in kW
     */    getSystemPower(panelCount = null) {
        const panels = panelCount !== null ? panelCount : this.#currentPanelCount;
        if (!panels) return 0;
        
        let powerRating = 0;
        
        switch(this.#currentModule) {
            case 'standard':
                powerRating = 400; // watts per panel
                break;
            case 'premium':
                powerRating = 450;
                break;
            case 'compact':
                powerRating = 350;
                break;
            default:
                powerRating = 400;
        }
        
        // Convert to kW
        const systemPowerKw = (panels * powerRating) / 1000;
        return systemPowerKw;
    }    calculateYearlyEnergy(panelCount) {
      let powerRating = 0;
      
      switch(this.#currentModule) {
        case 'standard':
          powerRating = 400; // watts per panel
          break;
        case 'premium':
          powerRating = 450;
          break;
        case 'compact':
          powerRating = 350;
          break;
        default:
          powerRating = 400;
      }
      
      // Convert to kW
      const powerRatingKw = powerRating / 1000;
      
      // Use set sunshine hours or default to 1000 for Germany
      const sunshineHours = this.#maxSunshineHoursPerYear;
      
      // Calculate total system energy
      // For Germany, typical performance ratio is ~0.85 (accounting for losses)
      const performanceRatio = 0.85;
      
      const yearlyEnergy = panelCount * powerRatingKw * sunshineHours * performanceRatio;
      
      return Math.round(yearlyEnergy);
    }
      /**
     * Get yearly energy for current panel count
     * @returns {number} Yearly energy in kWh
     */
    getYearlyEnergy() {
        return this.calculateYearlyEnergy(this.#currentPanelCount);
    }

    /**
     * Reset calculator state to defaults
     */
    resetState() {
        this.#currentModule = 'standard';
        this.#maxSunshineHoursPerYear = 1300;
        this.#currentPanelCount = 0;
    }
  }
