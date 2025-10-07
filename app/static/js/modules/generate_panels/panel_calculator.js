import { PVWattsService } from './pvwatts_service.js';

export class PanelCalculator {
    #currentModule = 'standard';
    #maxSunshineHoursPerYear = 1300; // Updated average for Germany (peak sun hours)
    #currentPanelCount = 0;
    #pvwattsService = null;
    #pvwattsData = null;
    #locationData = null;
    #usePVWatts = true; // Flag to enable/disable PVWatts

    constructor() {
        this.#pvwattsService = new PVWattsService();
    }
    
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
     * Set location data for PVWatts calculations
     * @param {number} latitude - Site latitude
     * @param {number} longitude - Site longitude
     * @param {number} tilt - Roof tilt/pitch angle
     * @param {number} azimuth - Roof azimuth (direction)
     */
    setLocation(latitude, longitude, tilt = 20, azimuth = 180) {
        this.#locationData = { latitude, longitude, tilt, azimuth };
        // Clear cached PVWatts data when location changes
        this.#pvwattsData = null;
        if (this.#pvwattsService) {
            this.#pvwattsService.clearCache();
        }
    }

    /**
     * Enable or disable PVWatts API usage
     * @param {boolean} enabled - Whether to use PVWatts
     */
    setPVWattsEnabled(enabled) {
        this.#usePVWatts = enabled;
    }

    /**
     * Calculate yearly energy using PVWatts API or fallback to simple calculation
     * @param {number} panelCount - Number of panels
     * @returns {Promise<number>} Yearly energy in kWh
     */
    async calculateYearlyEnergyAsync(panelCount) {
        // If PVWatts is enabled and we have location data, use it
        if (this.#usePVWatts && this.#locationData) {
            try {
                const panelWattage = this.#getPanelWattage();

                const pvwattsData = await this.#pvwattsService.calculateProduction({
                    latitude: this.#locationData.latitude,
                    longitude: this.#locationData.longitude,
                    panelCount: panelCount,
                    panelWattage: panelWattage,
                    tilt: this.#locationData.tilt,
                    azimuth: this.#locationData.azimuth
                });

                // Cache the PVWatts data
                this.#pvwattsData = pvwattsData;

                return Math.round(pvwattsData.annual_production);
            } catch (error) {
                console.warn('PVWatts calculation failed, falling back to simple calculation:', error);
                // Fall through to simple calculation
            }
        }

        // Fallback to simple calculation
        return this.calculateYearlyEnergy(panelCount);
    }

    /**
     * Get monthly production data from PVWatts
     * @returns {Array<Object>|null} Monthly production data or null if not available
     */
    getMonthlyProduction() {
        if (!this.#pvwattsData) {
            return null;
        }

        return this.#pvwattsService.formatMonthlyData(
            this.#pvwattsData.monthly_production
        );
    }

    /**
     * Get detailed PVWatts data
     * @returns {Object|null} PVWatts data or null
     */
    getPVWattsData() {
        return this.#pvwattsData;
    }

    /**
     * Get panel wattage based on current module
     * @private
     * @returns {number} Panel wattage in watts
     */
    #getPanelWattage() {
        switch(this.#currentModule) {
            case 'standard':
                return 400;
            case 'premium':
                return 450;
            case 'compact':
                return 350;
            default:
                return 400;
        }
    }

    /**
     * Reset calculator state to defaults
     */
    resetState() {
        this.#currentModule = 'standard';
        this.#maxSunshineHoursPerYear = 1300;
        this.#currentPanelCount = 0;
        this.#pvwattsData = null;
        this.#locationData = null;
    }
  }
