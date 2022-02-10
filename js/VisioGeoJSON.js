/* globals _, axios, L */

const defaultParameters = {
    baseURL: 'https://mapserver.visioglobe.com/',
    hash: '1f6e2327a641ebc204591684b18793431e9af433',
    mapview: {
        nooutside: false,
        activeColor: '#00ff00',
        fillOpacity: null,
        strokeWidth: null,
        strokeOpacity: null 
    }
};
export default class VisioGeoJSON {
    constructor({element}) {
        this._element = element;
        this._parameters = _.cloneDeep(defaultParameters);

        this._latlonBounds = {};
        this._geojson;

        this._modes = [
            {
                text: 'OpenStreetMap',
                provider: 'osm',
                variant: 'mapnik'
            }, {
                text: 'Google Maps - streets', 
                provider: 'google',
                variant: 'm'
            }, {
                text: 'Google Maps - hybrid', 
                provider: 'google',
                variant: 's,h'
            }, {
                text: 'Google Maps - satellite', 
                provider: 'google',
                variant: 's'
            }, {
                text: 'Google Maps - terrain', 
                provider: 'google',
                variant: 'p'
            }
        ];
        this._currentMode = 0;
        this._map = null;
        this._tileLayer = null;
        this._surfaceLayers = [];

        this._venueLayout;
        this._currentBuildingID = null;
        this._currentFloorID = null;
        this._currentFloorIsLoaded = false;
        this._activePlace = null;

        this._listeners = {
            'buildingChange': [],
            'floorChange': []
        };

        this._places = {};

        this._loading = false;
    }

    static get defaultParameters() { return _.cloneDeep(defaultParameters);};

    get parameters() {
        return _.cloneDeep(this._parameters);
    }

    setParameters({parameters}) {
        this._parameters = _.merge(this._parameters, parameters);
    }

    init() {
        return this._loadTiles()
        .then(() => new Promise(resolve => requestAnimationFrame(resolve)))
        .then(() => this._getGeoJSON())
        .then(() => this._loadPlaces())
        .then(() => {
            if (this._venueLayout.layer !== '' && !this._parameters.mapview.nooutside) {
                this._loadGeoJSONFeatures({floor: this._venueLayout.layer});
            }
        });
    }

    destroy() {
        if (this._map) {
            this._removeSurfaceLayers({all: true});
            this._map.remove();
            this._surfaceLayers = [];
        }
    }

    on({event, listener}) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(listener);
    }

    _removeSurfaceLayers({all}) {
        _.each(this._surfaceLayers, function(layer) {
            if (all || !this._isOutside({layer})) {
                layer.remove();
            }
        }.bind(this));
        this._currentFloorIsLoaded = false;
    }

    getVenueLayout() {
        return _.cloneDeep(this._venueLayout);
    }

    getModes() {
        return _.cloneDeep(this._modes);
    }

    getPlaces() {
        return _.map(_.cloneDeep(this._places), place => {
            delete place.layer;
            return place;
        });
    }

    isLoading() {
        return this._loading;
    }

    setActivePlace({id}) {
        if (this._places[id] && this._places[id].layer && (!this._activePlace || this._activePlace.id !== id)) {
            this.resetActivePlace();
            this._activePlace = this._places[id];
            this._activePlace.layer.setStyle({fillColor: this._parameters.mapview.activeColor});
            this._activePlace.layer.openPopup();
        }
    }

    getActivePlace() {
        if (this._activePlace) {
            let activePlace = _.cloneDeep(this._activePlace);
            delete activePlace.layer;
            return activePlace;
        }
        return null;
    }

    resetActivePlace() {
        if (this._activePlace && this._activePlace.layer) {
            this._activePlace.layer.setStyle({fillColor: this._activePlace.fillColor});
            this._activePlace = null;
        }
    }

    setCurrentMode({index}) {
        this._currentMode = index;
        this._loadTiles();
    }

    setCurrentBuilding({id}) {
        this._currentBuildingID = id;
        _.each(this._listeners['buildingChange'], listener => listener(id));
    }

    setCurrentFloor({id}) {
        if (this._currentFloorID !== id) {
            this._currentFloorID = id;
            let buildingID = _.findKey(this._venueLayout.buildings, building => _.keys(building.floors).indexOf(id) !== -1);
            if (buildingID !== this._currentBuildingID) {
                this.setCurrentBuilding({id: buildingID});
            }
            _.each(this._listeners['floorChange'], listener => listener(id));
            this._removeSurfaceLayers({all: false});
            this.resetActivePlace();
        }
        if (!this._currentFloorIsLoaded && this._geojson) {
            this._loadGeoJSONFeatures({floor: id});
            this._currentFloorIsLoaded = true;
        }
    }

    goToGlobal() {
        if (this._venueLayout.layer === '' || this._parameters.mapview.nooutside) {
            this.goToFloor({});
        }
        this._removeSurfaceLayers({all: false});
        if (this._latlonBounds[this._venueLayout.layer] && this._latlonBounds[this._venueLayout.layer].isValid()) {
            this._map.fitBounds(this._latlonBounds[this._venueLayout.layer]);
        }
    }

    goToBuilding({id}) {
        if (!id) {
            id = this._currentBuildingID;
        }
        this.setCurrentBuilding({id});
        this.goToFloor({id: this._venueLayout.buildings[this._currentBuildingID].defaultFloor});
    }

    goToFloor({id}) {
        if (!id) {
            id = this._currentFloorID;
        }
        this.setCurrentFloor({id});
        if (this._latlonBounds[id] && this._latlonBounds[id].isValid()) {
            this._map.fitBounds(this._latlonBounds[id]);
        }
    }

    goToPlace({id}) {
        if (this._places[id]) {
            this.setCurrentFloor({id: this._places[id].floor});
            this._map.fitBounds(this._places[id].bounds);
        }
    }

    addMarker({position, iconOptions, description, onclick}) {
        let options = {};
        if (iconOptions) {
            options.icon = L.icon(iconOptions);
        }
        let marker = L.marker([position.lat, position.lon], options);
        if (description) {
            marker.bindPopup(description);
        }
        if (onclick) {
            marker.on('click', onclick);
        }
        marker.addTo(this._map);
        return marker;
    }

    _getGeoJSON() {
        this._loading = true;
        return axios.get(this._parameters.baseURL + this._parameters.hash + '/map.json')
            .then(function(response) {
                this._loading = false;
                if (response.status === 200) {
                    this._geojson = response.data;
                    if (this._geojson) {
                        const venueLayoutFeature = _.find(this._geojson.features, feature => feature.properties.venue_layout !== undefined);
                        if (venueLayoutFeature) {
                            this._venueLayout = venueLayoutFeature.properties.venue_layout;
                        }
                        else {
                            return Promise.reject();
                        }
                    }
                }
                else {
                    return Promise.reject();
                }
            }.bind(this));
    }

    _loadPlaces() {
        const features = _.filter(this._geojson.features, feature => (feature.properties['vg-id'] && !feature.properties['vg-footprint']));
        _.each(features, function(feature) {
            const id = feature.properties['vg-id'];
            if (id) {
                const name = feature.properties['vg-name'] || id;
                const floor = feature.properties['vg-floor'];
                this._places[id] = {
                    id,
                    floor,
                    name,
                    fillColor: feature.properties['fill'],
                    categories: [], // TODO read this from CMS / place data
                    description: 'place\'s description' // TODO read this from CMS / place data
                };
            }
        }.bind(this));
    }

    _loadGeoJSONFeatures({floor}) {
        const features = _.filter(this._geojson.features, feature => (!feature.properties['vg-footprint']));
        const fillOpacity = _.isNumber(this._parameters.mapview.fillOpacity) ? this._parameters.mapview.fillOpacity : null;
        const strokeOpacity = _.isNumber(this._parameters.mapview.strokeOpacity) ? this._parameters.mapview.strokeOpacity : null;
        const strokeWidth = _.isNumber(this._parameters.mapview.strokeWidth) ? this._parameters.mapview.strokeWidth : null;
        _.each(features, function(feature) {
            if (feature.properties['vg-floor'] && feature.properties['vg-floor'] === floor) {
                const id = feature.properties['vg-id'];
                if (id && this._places[id]) {
                    if (!this._places[id].layer) {
                        let layer = L.geoJSON(feature, {
                            style: {
                                color: feature.properties['fill'],
                                opacity: strokeOpacity,
                                fillColor: feature.properties['fill'],
                                fillOpacity: fillOpacity || feature.properties['fill-opacity'],
                                weight: strokeWidth || feature.properties['stroke-width']
                            },
                            floor
                        });
                        this._surfaceLayers.push(layer);
                        this._places[id].layer = layer;
                        layer.bindPopup('<h3>'+this._places[id].name+'</h3><p>'+this._places[id].description+'</p>');
                        layer.on('click', () => this.setActivePlace({id}));
                        layer.on('popupclose', () => this.resetActivePlace());

                        const bounds = layer.getBounds();
                        if (!this._latlonBounds[floor] || !this._latlonBounds[floor].isValid()) {
                            this._latlonBounds[floor] = bounds;
                        }
                        else {
                            this._latlonBounds[floor].extend(bounds);
                        }
                        this._places[id].bounds = bounds;
                    }
                    this._places[id].layer.addTo(this._map);
                }
                else {            
                    let layer = L.geoJSON(feature, {
                        style: {
                            color: feature.properties['fill'],
                            opacity: strokeOpacity,
                            fillColor: feature.properties['fill'],
                            fillOpacity: this._parameters.mapview.fillOpacity || feature.properties['fill-opacity'],
                            weight: strokeWidth || feature.properties['stroke-width']
                        },
                        floor
                    });
                    this._surfaceLayers.push(layer);

                    const bounds = layer.getBounds();
                    if (!this._latlonBounds[floor] || !this._latlonBounds[floor].isValid()) {
                        this._latlonBounds[floor] = bounds;
                    }
                    else {
                        this._latlonBounds[floor].extend(bounds);
                    }
                    layer.addTo(this._map);
                }
            }
        }.bind(this));
    }

    _loadTiles() {
        if (!this._map) {
            this._map = L.map(this._element);
        }
        if (this._tileLayer) {
            this._tileLayer.remove();
        }
        const currentMode = this._modes[this._currentMode];
        switch(currentMode.provider) {
            case 'google':
                this._tileLayer = L.tileLayer('http://{s}.google.com/vt/lyrs='+currentMode.variant+'&x={x}&y={y}&z={z}', {
                    maxZoom: 20,
                    subdomains:['mt0','mt1','mt2','mt3'],
                    attribution: '&copy; <a href="https://www.google.com/intl/en_fr/help/terms_maps/">Google Maps</a>'
                });
                break;
            case 'osm':
            default:
                this._tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                });
                break;
        }
        this._tileLayer.addTo(this._map);
        return Promise.resolve();
    }

    _isOutside({layer}) {
        return layer.options && layer.options.floor && layer.options.floor === this._venueLayout.layer;
    }
};