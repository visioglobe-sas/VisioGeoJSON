/* globals _, UIkit */
import VisioGeoJSON from './VisioGeoJSON.js';
import './getURLParameters.js';
import { getURLParameters } from './getURLParameters.js';

window.addEventListener('load', init);
window.addEventListener('beforeunload', destroy);

var visiogeojson;

const primary = '#00c5eb';
const parameters = Object.assign({hash: '1f6e2327a641ebc204591684b18793431e9af433'}, getURLParameters());

function init() {

    visiogeojson = new VisioGeoJSON({element: 'container'});
    visiogeojson.setParameters({parameters});

    setupSpinner();
    
    visiogeojson.init()
    .then(() => {
        setupSelectors();
        setupSearch();

        // visiogeojson.addMarker({
        //     position: {lat: 45.21986928005298, lon: 5.803818394907695}, 
        //     iconOptions: {
        //         iconUrl: 'https://i1.wp.com/www.gauss-friends.org/wp-content/uploads/2020/04/location-pin-connectsafely-37.png?ssl=1',
        //         iconSize: [64, 64],
        //         iconAnchor: [32, 64],
        //         popupAnchor: [0,-64]
        //     },
        //     description: 'the pin.', 
        //     onclick: () => alert('clicked the pin!')
        // });
    })
    .catch(console.log);
};

function destroy() {
    if (visiogeojson) {
        visiogeojson.destroy();
    }
};

function addListItem(listItem, list, action) {
    let item = document.createElement('li');
    let link = document.createElement('a');
    link.classList.add(...['uk-flex', 'uk-flex-middle']);
    item.appendChild(link);
    list.appendChild(item);
    let textPadding = '';
    if (listItem.icon) {
        if (listItem.icon !== 'placeholder') {
            let img = document.createElement('img');
            img.src = listItem.icon;
            img.style.width = '32px';
            img.style.height = '32px';
            img.style.margin = '0px 8px';
            link.appendChild(img);
        }
        else {
            textPadding = '0 0 0 48px';
        }
    }
    if (listItem.name) {
        let span = document.createElement('span');
        let text = document.createTextNode(listItem.name);
        span.style.padding = textPadding;
        span.appendChild(text);
        link.appendChild(span);
    }
    if (listItem.detail) {
        let spacer = document.createElement('div');
        spacer.classList.add('uk-flex-1');
        link.appendChild(spacer);
        let span = document.createElement('span');
        let text = document.createTextNode(listItem.detail);
        span.classList.add(...['uk-text-muted', 'uk-text-small', 'uk-padding-small', 'uk-padding-remove-vertical']);
        span.appendChild(text);
        link.appendChild(span);
    }
    if (listItem.id) {
        item.id = listItem.id;
    }
    UIkit.util.on(link, 'click', action);
};

function setupSpinner() {
    let spinner = document.getElementById('spinner');
    spinner.style.display = '';
    const interval = setInterval(() => {
        if (visiogeojson && !visiogeojson.isLoading()) {
            spinner.style.display = 'none';
            clearInterval(interval);
        }
    }, 1000);
};

function setupSelectors() {
	const venueLayout = visiogeojson.getVenueLayout();
    if (_.keys(venueLayout.buildings).length > 0) {
        var globalIcon = document.querySelector('.uk-navbar .visio-global');
        var floorIcon = document.querySelector('.uk-navbar .visio-floor');
        if (venueLayout.layer !== '' && !visiogeojson.parameters.mapview.nooutside) {
            globalIcon.style.color = primary;
            UIkit.util.on('#global_button > a', 'click', () => {
                visiogeojson.goToGlobal();
                globalIcon.style.color = primary;
                floorIcon.style.color = 'inherit';
            });
        }
        else {
            document.querySelector('#global_button').style.display = 'none';
        }

        var currentBuildingElement = document.getElementById('buildingName');
        var buildingsElement = document.getElementById('buildings');
        var currentFloorElement = document.getElementById('floorName');
        var floorsElement = document.getElementById('floors');
        UIkit.util.on('#building_selector > a', 'click', () => {
            visiogeojson.goToBuilding();
            globalIcon.style.color = 'inherit';
            floorIcon.style.color = primary;        
        });
        UIkit.util.on('#floor_selector > a', 'click', () => {
            visiogeojson.goToFloor();
            globalIcon.style.color = 'inherit';
            floorIcon.style.color = primary;
        });
        
        visiogeojson.on({event: 'buildingChange', listener: id => currentBuildingElement.innerText = id});
        visiogeojson.on({event: 'floorChange', listener: id => currentFloorElement.innerText = id});

        if (visiogeojson.parameters.mapview.nooutside) {
            visiogeojson.goToBuilding({id: venueLayout.defaultBuilding});
        }
        else {
            visiogeojson.goToGlobal();
            visiogeojson.setCurrentBuilding({id: venueLayout.defaultBuilding});
            visiogeojson.setCurrentFloor({id: venueLayout.buildings[venueLayout.defaultBuilding].defaultFloor});
        }
    
        if (_.keys(venueLayout.buildings).length > 1) {
            var buildingIDs = _.keys(venueLayout.buildings);
            var listElement = buildingsElement.querySelector('ul');
            let selectBuilding = id => () => {
                visiogeojson.goToBuilding({id});
                globalIcon.style.color = 'inherit';
                floorIcon.style.color = primary;

                floorsElement.querySelectorAll('ul > li').forEach(item => item.remove());
                insertFloors(id);
            };
            _.each(buildingIDs, id => addListItem({id, name: id}, listElement, selectBuilding(id)));
        }
        else {
            buildingsElement.remove();
        }
    
        let insertFloors = function(buildingID) {
            const floors = venueLayout.buildings[buildingID].floors;
            if (_.keys(floors).length > 1) {
                const sortedFloors = _.reverse(_.sortBy(floors, 'levelIndex'));
                const floorIDs = _.map(sortedFloors, 'layer');
                var listElement = floorsElement.querySelector('ul');
                let selectFloor = id => () => {
                    visiogeojson.goToFloor({id});
                    globalIcon.style.color = 'inherit';
                    floorIcon.style.color = primary;
                };
                _.each(floorIDs, id => addListItem({id, name: id}, listElement, selectFloor(id)));
                floorsElement.style.display = '';
            }
            else {
                floorsElement.style.display = 'none';
            }
        };
        
        insertFloors(venueLayout.defaultBuilding);
    }
    else {
        document.querySelector('#global_button').style.display = 'none';
        document.querySelector('#building_selector').style.display = 'none';
        document.querySelector('#floor_selector').style.display = 'none';
    }

    var currentModeElement = document.getElementById('modeName');
    var modesElement = document.getElementById('modes');
    var modes = visiogeojson.getModes();
    currentModeElement.innerText = modes[0].text;
    let selectMode = index => () => {
        visiogeojson.setCurrentMode({index});
        currentModeElement.innerText = modes[index].text;
    };
    var listElement = modesElement.querySelector('ul');
    _.each(modes, (mode, index) => addListItem({name: mode.text}, listElement, selectMode(index)));
};

function setupSearch() {
    let search = '';
    let places = visiogeojson.getPlaces();
    let categories = {};
    let categoryPlaces = Object.values(places);
    const categoriesTabNameElement = document.getElementById('categoriesTabName');
    const placesTabNameElement = document.getElementById('placesTabName');
    const resetCategoryButton = document.getElementById('resetCategory');
    const searchInput = document.getElementById('searchInput');

    categoriesTabNameElement.innerText =  'categories';
    placesTabNameElement.innerText =  'places';
    searchInput.placeholder = 'Search...';

    let filterPlacesByCategoryID = categoryID => {
        categoryPlaces = _.filter(places, place => place.categories.indexOf(categoryID) !== -1);
        updatePlaces();
    };

    let resetCategory = () => {
        categoryPlaces = Object.values(places);
        updatePlaces();
        placesTabNameElement.innerText =  'places';
        resetCategoryButton.style.display = 'none';
    };

    let closePanel = () => {
        UIkit.offcanvas('#searchPanel').hide();
        UIkit.tab('#searchTabs').show(0);
        searchInput.value = '';
        search = '';
        updateCategories();
        resetCategory();
    };

    let clearSearch = () => {
        if (search !== '' && searchInput.value !== '') {
            searchInput.value = '';
            search = '';
            updateCategories();
            updatePlaces();
        }
    };

    UIkit.util.on('#closePanel', 'click', closePanel);
    UIkit.util.on('#resetCategory', 'click', resetCategory);
    UIkit.util.on('#clearSearch', 'click', clearSearch);

    let addCategories = categories => {
        let categoryListElement = document.getElementById('categoryList');
        categoryListElement.querySelectorAll('li').forEach(item => item.remove());
        _.each(categories, category => {
            const nbPlacesDetail = category.nbPlaces + ' ' + 
                (category.nbPlaces > 1 ? 
                    'places' : 
                    'place');
            let categoryItem = {
                id: category.id,
                name: category.name,
                icon: category.icon,
                detail: nbPlacesDetail
            };
            addListItem(categoryItem, categoryListElement, () => {
                filterPlacesByCategoryID(category.id);
                UIkit.tab('#searchTabs').show(1);
                placesTabNameElement.innerText = category.name;
                resetCategoryButton.style.display = '';
            });
        });
    };

    let searchCategory = category => {
        const name = category.name.toLowerCase();
        const searchText = search.toLowerCase();
        return name.indexOf(searchText) > -1;
    };

    const venueLayout = visiogeojson.getVenueLayout();

    let updateCategories = () => addCategories(_.filter(categories, searchCategory));

    const buildingIDByFloorID = _.fromPairs(_.flatMap(venueLayout.buildings, (building, buildingID) => {
        return _.map(_.keys(building.floors), floorID => [
            floorID, 
            buildingID
        ]);
    }));

    let addPlaces = places => {
        let placeListElement = document.getElementById('placeList');
        placeListElement.querySelectorAll('li').forEach(item => item.remove());
        _.each(places, place => {
            let placeItem = {
                id: place.id, 
                name: place.name,
                icon: 'placeholder'
            };
            if (place.categories.length > 0) {
                const category = categories[place.categories[0]];
                if (category.icon && category.icon !== '') {
                    placeItem.icon = category.icon;
                }
            }
            const buildingName = buildingIDByFloorID[place.floor]; // TODO replace with actual building name
            if (buildingName !== undefined && buildingName !== 'default') {
                placeItem.detail = buildingName + ' / ';
            }
            const floorName = place.floor; // TODO replace with actual floor name
            if (floorName !== undefined) {
                placeItem.detail = (placeItem.detail || '') + floorName;
            }
            addListItem(placeItem, placeListElement, () => {
                visiogeojson.goToPlace({id: place.id});
                visiogeojson.setActivePlace({id: place.id});
                closePanel();
            });
        });
    };

    let searchPlace = place => {
        const name = place.name.toLowerCase();
        const id = place.id.toLowerCase();
        const categoryNames = place.categories ? _.map(place.categories, categoryID => categories[categoryID].name.toLowerCase()) : [];
        const searchText = search.toLowerCase();
        return id.indexOf(searchText) > -1 ||
            name.indexOf(searchText) > -1 ||
            categoryNames.some(categoryName => categoryName.indexOf(searchText) > -1);
    };

    let updatePlaces = () => addPlaces(_.filter(categoryPlaces, searchPlace));

    let update = () => {
        updateCategories();
        updatePlaces();
        if (document.querySelectorAll('#categoryList > li').length < 2) {
            UIkit.tab('#searchTabs').show(1);
        }
    };

    searchInput.addEventListener('input', _.debounce(e => {
        search = e.target.value;
        update();
    }, 500, {maxWait: 2000}));
    
    update();
};
