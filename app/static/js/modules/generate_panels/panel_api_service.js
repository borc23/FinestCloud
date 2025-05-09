export class PanelApiService {
    #geometryUtils;
    
    constructor(geometryUtils) {
      this.#geometryUtils = geometryUtils;
    }
    
    async fetchSolarApiData(mapBounds) {
      try {
        const apiUrl = `/solar_api_proxy?latitude=${mapBounds.center.lat}&longitude=${mapBounds.center.lng}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        return {
          roofSegments: data?.solarPotential?.roofSegmentStats || [],
          maxSunshineHoursPerYear: data?.solarPotential?.maxSunshineHoursPerYear || 0
        };
      } catch (error) {
        console.error("Error fetching solar API data:", error);
        return {
          roofSegments: [],
          maxSunshineHoursPerYear: 0
        };
      }
    }
    
    async updatePanelCount(panelCount, mapBounds, resolution) {
      try {
        console.log('Updating panel count with params:', {
          panelCount,
          mapBounds,
          resolution
        });

        const requestBody = {
          panel_count: panelCount,
          mapBounds,
          resolution
        };

        const response = await fetch('/update_panel_count', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Request-ID': Date.now().toString()
          },
          body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();

        return responseData;
      } catch (error) {
        console.error('Error updating panel count:', {
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    }

    async generatePanelsAPI(roofs, objects, module, resolution, mapBounds, mapDimensions) {
      try {
        // console.log('Generating panels with params:', {
        //   roofCount: roofs?.length,
        //   objectCount: objects?.length,
        //   module,
        //   resolution,
        //   mapBounds,
        //   mapDimensions
        // });

        const requestBody = {
          roofs,
          objects,
          module,
          resolution,
          mapBounds,
          mapDimensions,
        };

        // console.log('Generate panels request:', JSON.stringify(requestBody, null, 2));

        const response = await fetch('/generate_panels', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Request-ID': Date.now().toString()
          },
          body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();

        return responseData;
      } catch (error) {
        console.error('Error generating panels:', {
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    }
}
