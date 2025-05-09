export class SearchService {
    #elements = {};
    #services = {};
    #searchDebounceTimer = null;

    constructor(mapService) {
        this.#initializeServices(mapService);
        this.#cacheElements();
        this.setupAutocomplete();
        this.setupEventListeners();
    }

    #initializeServices(mapService) {
        this.#services = {
            map: mapService,
            geocoder: new google.maps.Geocoder(),
            autocomplete: new google.maps.places.AutocompleteService(),
            places: new google.maps.places.PlacesService(mapService.map)
        };
    }

    #cacheElements() {
        // Cache all frequently accessed DOM elements
        this.#elements = {
            searchInput: document.getElementById('searchInput'),
            searchResults: document.createElement('div'),
            searchButton: document.querySelector('.search-button')
        };
        
        // Set up search results container
        this.#elements.searchResults.className = 'search-results';
    }

    setupAutocomplete() {
        const { searchInput, searchResults } = this.#elements;
        if (searchInput?.parentNode) {
            searchInput.parentNode.insertBefore(searchResults, searchInput.nextSibling);
        }
    }

    setupEventListeners() {
        const { searchInput, searchButton } = this.#elements;

        if (searchInput) {
            searchInput.addEventListener('input', this.#handleSearchInput.bind(this));
            searchInput.addEventListener('keydown', this.#handleKeyboardNavigation.bind(this));
        }

        if (searchButton) {
            searchButton.addEventListener('click', () => this.searchAddress());
        }

        // Global click handler for closing search results
        document.addEventListener('click', (e) => {
            const { searchInput, searchResults } = this.#elements;
            if (!searchInput?.contains(e.target) && !searchResults?.contains(e.target)) {
                this.clearSearchResults();
            }
        });
    }

    #handleSearchInput() {
        clearTimeout(this.#searchDebounceTimer);
        this.#searchDebounceTimer = setTimeout(() => {
            this.handleSearchInput();
        }, 100);
    }

    #handleKeyboardNavigation(e) {
        const { searchResults } = this.#elements;
        const items = searchResults.getElementsByClassName('search-result-item');
        const activeItem = searchResults.querySelector('.active');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.navigateResults(items, activeItem, 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.navigateResults(items, activeItem, -1);
                break;
            case 'Enter':
                if (activeItem) {
                    activeItem.click();
                } else {
                    this.searchAddress();
                }
                break;
            case 'Escape':
                this.clearSearchResults();
                break;
        }
    }

    async searchAddress() {
        const { searchInput } = this.#elements;
        const address = searchInput.value;
        if (!address) return;
    
        try {
            const results = await this.geocodeAddress(address);
            const location = results[0].geometry.location;
            this.#services.map.setCenter(location, 22);
        } catch (error) {
            console.error('Geocode error:', error);
        }
    }

    geocodeAddress(address) {
        return new Promise((resolve, reject) => {
            this.#services.geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK') {
                    resolve(results);
                } else {
                    reject(new Error('Geocode failed: ' + status));
                }
            });
        });
    }

    async handleSearchInput() {
        const { searchInput } = this.#elements;
        const query = searchInput.value.trim();
        if (!query) {
            this.clearSearchResults();
            return;
        }

        try {
            const predictions = await this.getPlacePredictions(query);
            this.displaySearchResults(predictions);
        } catch (error) {
            console.error('Autocomplete error:', error);
        }
    }

    getPlacePredictions(query) {
        return new Promise((resolve, reject) => {
            this.#services.autocomplete.getPlacePredictions(
                {
                    input: query,
                    types: ['geocode', 'establishment'],
                },
                (predictions, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        resolve(predictions);
                    } else {
                        reject(status);
                    }
                }
            );
        });
    }

    displaySearchResults(predictions) {
        const { searchResults } = this.#elements;
        this.clearSearchResults();
        
        predictions.forEach(prediction => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            
            const icon = document.createElement('i');
            icon.className = 'fas fa-map-marker-alt';
            
            const textContent = document.createElement('span');
            textContent.textContent = prediction.description;
            
            item.appendChild(icon);
            item.appendChild(textContent);
            
            item.addEventListener('click', () => {
                this.handleResultClick(prediction);
            });
            
            searchResults.appendChild(item);
        });
        
        searchResults.style.display = 'block';
    }

    async handleResultClick(prediction) {
        const { searchInput } = this.#elements;
        searchInput.value = prediction.description;
        this.clearSearchResults();
        
        try {
            const place = await this.getPlaceDetails(prediction.place_id);
            const location = place.geometry.location;
            this.#services.map.setCenter(location, 18);
        } catch (error) {
            console.error('Place details error:', error);
        }
    }

    getPlaceDetails(placeId) {
        return new Promise((resolve, reject) => {
            this.#services.places.getDetails(
                { placeId, fields: ['name', 'geometry', 'formatted_address'] },
                (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        resolve(place);
                    } else {
                        reject(status);
                    }
                }
            );
        });
    }

    navigateResults(items, activeItem, direction) {
        if (!items.length) return;
        
        if (!activeItem) {
            items[0].classList.add('active');
            return;
        }
        
        const currentIndex = Array.from(items).indexOf(activeItem);
        const nextIndex = (currentIndex + direction + items.length) % items.length;
        
        activeItem.classList.remove('active');
        items[nextIndex].classList.add('active');
        items[nextIndex].scrollIntoView({ block: 'nearest' });
    }

    clearSearchResults() {
        const { searchResults } = this.#elements;
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
    }

    async getCurrentLocation() {
        try {
            const position = await this.getUserPosition();
            const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            this.#services.map.setCenter(pos, 12);
        } catch (error) {
            this.handleLocationError(error);
        }
    }

    getUserPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Browser doesn't support geolocation"));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
    }

    handleLocationError(error) {
        console.error('Location error:', error);
    }
}
