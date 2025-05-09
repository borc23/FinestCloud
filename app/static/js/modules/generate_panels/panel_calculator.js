export class PanelCalculator {
    #currentModule = 'standard';
    #maxSunshineHoursPerYear = 0;
    
    constructor() {}
    
    setCurrentModule(moduleId) {
      this.#currentModule = moduleId;
    }
    
    setMaxSunshineHoursPerYear(hours) {
      this.#maxSunshineHoursPerYear = hours;
    }
    
    calculateYearlyEnergy(panelCount) {
      let powerRating = 0;
      let efficiency = 0;
      
      switch(this.#currentModule) {
        case 'standard':
          powerRating = 400;
          efficiency = 20.4;
          break;
        case 'premium':
          powerRating = 450;
          efficiency = 22.8;
          break;
        case 'compact':
          powerRating = 350;
          efficiency = 19.2;
          break;
        default:
          powerRating = 400;
          efficiency = 20.4;
      }
      
      powerRating = powerRating / 1000;
      efficiency = efficiency / 100;
      
      const yearlyEnergy = panelCount * powerRating * this.#maxSunshineHoursPerYear * efficiency;
      
      return Math.round(yearlyEnergy);
    }
  }
  