/**
 * Handler functions for creating and executing AJAX requests to the PYroMat
 * API.
 *
 * Requires jQuery
 */


/**
 * Acquire the universal PYroMat info from API, asynchronous
 *
 * Fields in response are:
 *  - args (copy of args passed to request, blank here)
 *  - data (holder for various request data)
 *    - legalunits (units that can be assigned by category)
 *    - substances (detailed info about each substance)
 *    - versions (software version info)
 *  - message (related to erros)
 *  - units (active units)
 *
 * @param callback - function handle to be called on completion of ajax
 *   request. Data type will be JSON.
 *
 * Usage example:
 * ajax_info((data)=> {
 *    console.log(data['data']['substances']['mp.H2O']);
 * });
 *
 */
function ajax_info(callback){
    $.get("/info",  // route
        callback,  // callback function handle
        'json');  // Data type of the response.
}


/**
 * Acquire state data from PYroMat API.
 *
 * Fields in response are:
 *  - args (copy of args passed to request)
 *  - data (arrays of state data by property)
 *    - T (array of T)
 *    - p (array of p)
 *    - ...
 *  - message (related to erros)
 *  - units (active units)
 *
 * @param substance - str, the substance id (e.g. mp.H2O)
 * @param state_props - dict of properties to send (e.g. {T:300, p:1}
 * @param units - dict of the units to apply
 * @param callback - function to be called upon completion. Must accept
 *  argument as callback(response).
 * @param ignore_err - bool, if true, errors are ignored to be handled by the
 *  callback.
 */
function ajax_point(substance, state_props=null, units=null, callback=null, ignore_err=false){
    let requestroute = "/state";
    let postData = build_postData(substance, state_props, units);
    ajax_route(requestroute, postData, callback, ignore_err)
}


/**
 * Acquire isoline data from PYroMat API.
 *
 * Fields in response are:
 *  - args (copy of args passed to request)
 *  - data (varies based on args, see below)
 *  - message (related to erros)
 *  - units (active units)
 *
 * If state_props contained a single isoline (e.g. {T:300}), the data field is
 * arrays by property
 *  - data
 *    - T (array of T)
 *    - p (array of p)
 *    - ...
 *
 * If state_props contained the 'default' flag (e.g. {T:null, default:true}),
 * or state_props asked for an array (e.g. {T=[300,400]}
 * an array of lines is returned in the data field.
 *  - data is array of lines
 *    - data[0]
 *      - T (array of T)
 *      - p (array of p)
 *      - ...
 *    - data[1]
 *      - T (array of T)
 *      - p (array of p)
 *      - ...
 *
 * @param substance - str, the substance id (e.g. mp.H2O)
 * @param state_props - dict of properties to send (e.g. {T:300}
 * @param units - dict of the units to apply
 * @param callback - function to be called upon completion. Must accept
 *  argument as callback(response).
 * @param ignore_err - bool, if true, errors are ignored to be handled by the
 *  callback.
 */
function ajax_isoline(substance, state_props=null, units=null, callback=null, ignore_err=false){
    let requestroute = "/isoline";
    let postData = build_postData(substance, state_props, units);
    ajax_route(requestroute, postData, callback, ignore_err)
}


/**
 * Acquire saturation data from PYroMat API.
 *
 * Fields in response are:
 *  - args (copy of args passed to request)
 *  - data (arrays of state data by property)
 *    - liquid (props on sat liquid line)
 *      - T (array of T)
 *      - p (array of p)
 *      - ...
 *    - vapor (props on sat vapor line)
 *      - T (array of T)
 *      - p (array of p)
 *      - ...
 *  - message (related to erros)
 *  - units (active units)
 *
 *  If the state_props dict is empty (i.e. {}), the entire steam dome will be
 *  returned.
 *
 * @param substance - str, the substance id (e.g. mp.H2O)
 * @param state_props - dict of properties to send (e.g. {T:300}
 * @param units - dict of the units to apply
 * @param callback - function to be called upon completion. Must accept
 *  argument as callback(response).
 * @param ignore_err - bool, if true, errors are ignored to be handled by the
 *  callback.
 */
function ajax_saturation(substance, state_props=null, units=null, callback=null, ignore_err=false){
    let requestroute = "/saturation";
    let postData = build_postData(substance, state_props, units);
    ajax_route(requestroute, postData, callback, ignore_err)
}


/**
 * Perform the actual ajax call for pyromat routines
 * @param route - the string for the requestroute
 * @param postData - dict, the data to send with the POST request
 * @param callback - function handle, must accept argument of callback(response)
 * @param ignore_err - bool, suppress default error handling. Set true to handle
 *  errors within callback.
 */
function ajax_route(route, postData, callback, ignore_err=false){
    let requestroute = route;

    $.ajax({
        url: requestroute,
        type: "POST",
        data: JSON.stringify(postData),
        dataType: "json",
        contentType: 'application/json; charset=utf-8',
        success: (response) => {
            // Pass errors
            if (response.message.error && !ignore_err) {
                handle_error(response);
            } else {
                // Send data to callback
                if (callback) {
                    callback(response);
                }
            }
        },
    });
}


/**
 * Simplify construction of the postData dict for basic arguments
 *
 * @param substance - str, the substance id (e.g. mp.H2O)
 * @param state_props - dict of properties to send (e.g. {T:300, p:1}
 * @param units - dict of the units to apply
 * @returns postData - dict suitable for passing to pyromat ajax_route requests
 */
function build_postData(substance, state_props=null, units=null){
    let postData = Object.assign({}, state_props); // clone prop dict

    // append substance and units (if applicable) to the postdata
    postData.id = substance;
    if(units){
        postData.units = units;
    }
    return postData;
}


/**
 * Basic error handling for PYroMat requests
 * @param data - JSON object reply from PYroMat API
 */
function handle_error(response){
    alert(response.message.message);
}