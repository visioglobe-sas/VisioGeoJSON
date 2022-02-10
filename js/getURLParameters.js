/**
 * @name isNumeric
 * @description
 * Checks if the string represents a number
 * 
 * @param {String} n 
 * @returns {Boolean} true if n is a number
 */
 var isNumeric = function(n) {
    var regex = new RegExp('-?\\d+(\\.{1}\\d+)?(e{1}-?\\d+)?');
    var matches = regex.exec(n);
    return matches !== null && matches[0].length === (n + '').length;
};

/**
 * @name getURLParameters
 * @description
 * Breaks down a "search" string typically used to encode arguments or parameters in a URL
 * and returns an object whose properties are the keys or names of these parameters/flags.
 *  
 * @param {string} search the search string to decompose. Default: window.location.search.
 * @returns {Object} a collection of parameters
 */
export const getURLParameters = function(search) {
    var setParameterValue = function (parameters, name, value) {
        var parameterRegex = new RegExp('([^\\[\\]]+)((\\[([^\\[\\]])\\])*)', 'g');
        var matches;
        var subParameter = parameters;
        var properties = [];
        do {
            matches = parameterRegex.exec(name);
            if (matches !== null && typeof (matches[1]) !== 'undefined') {
                properties.push(decodeURIComponent(matches[1]));
            }
        } while (matches);
        for (var i = 0; i < properties.length - 1; i++) {
            if (typeof (subParameter[properties[i]]) === 'undefined') {
                subParameter[properties[i]] = {};
            }
            subParameter = subParameter[properties[i]];
        }
        subParameter[properties[properties.length - 1]] = value;
    };
    var urlSearch = (typeof search === 'undefined') ? window.location.search : search;
    var searchRegex = new RegExp('[\?|\&]?([^\=\&#]+)=?([^\&#]+)?', 'g');
    var matches;
    var parameters = {};
    do {
        matches = searchRegex.exec(urlSearch);
        if (matches !== null) {
            var name = decodeURIComponent(matches[1]);
            var value = (typeof matches[2] !== 'undefined') ?
                decodeURIComponent(matches[2].replace(/\+/g, ' ')) : true;
            if (isNumeric(value)) {
                value = parseFloat(value);
            }
            setParameterValue(parameters, name, value);
        }
    } while (matches);
    if (typeof (parameters.params64) !== 'undefined') {
        parameters = JSON.parse(atob(parameters.params64));
    }
    return parameters;
};