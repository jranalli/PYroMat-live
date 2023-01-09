const DEFAULT_IDSTR = "mp.H2O";
const DEFAULT_UNITS = {
    energy: "kJ",
    force: "N",
    length: "m",
    mass: "kg",
    matter: "kg",
    molar: "kmol",
    pressure: "bar",
    temperature: "K",
    time: "s",
    volume: "m3"
};
const SUBST_COOKIE_ID = "idstr";
const UNITS_COOKIE_ID = "units";


// *****************************************************************
// * PYroMat Cookie Management Functions
// *    Functions for setting and getting cookies germane to common PYroMat
// *    tasks.
// *****************************************************************



/**
 * Load the substance id from a cookie
 * @returns {*|string} - the id string (e.g. mp.H2O)
 */
function load_substance_cookie(){
    let sub = get_cookie(SUBST_COOKIE_ID);

    // If not set, initialize
    if (sub === "") {
        sub = DEFAULT_IDSTR;
        set_substance_cookie(sub);
    }
    return sub;
}


/**
 * Load the units configuration from a cookie
 * @returns dict - the units as a dictionary
 */
function load_units_cookie() {
    let actual = get_cookie(UNITS_COOKIE_ID);

    // If the unit data isn't set, initialize it.
    if (actual === "") {
        actual = DEFAULT_UNITS;
        set_units_cookie(actual);
    } else {
        // Cookie is stringified, so we need to parse it out
        actual = JSON.parse(actual);
    }
    return actual;
}


/**
 * Set the substance cookie using an id string
 * @param substance - str, id string (e.g. mp.H2O)
 */
function set_substance_cookie(substance){
    set_cookie(SUBST_COOKIE_ID, substance);
}


/**
 * sSet the units cookie using a dict of units
 * @param units_dict - dict, keyed by unit (see DEFAULT_UNITS) for example.
 */
function set_units_cookie(units_dict){
    set_cookie(UNITS_COOKIE_ID, JSON.stringify(units_dict));
}


// *****************************************************************
// * Generic Cookie Management Functions
// *    Functions for setting and getting cookies without any specificity to
// *    the PYroMat library.
// *****************************************************************


/**
 * Set a cookie value
 *      set_cookie(param,value)
 *
 * This assigns a value to the string parameter name, param.  The cookie
 * expiration is set to one hour.
 *
 * @param param - str, name for the cookie
 * @param value - any, the value to store
 */
function set_cookie(param, value){
    // Set the cookie to expire in one hour
    set_cookie_exp(param, value,3600000);
}


/**
 * Set a cookie value
 *      set_cookie_exp(param, value, exp)
 *
 * This assigns a value to the string parameter name, param.  The cookie
 * expiration is set to one hour. To delete a cookie, pass a negative value to
 * exp.
 *
 * @param param - str, name for the cookie
 * @param value - any, the value to store
 * @param exp - int, the expiration in milliseconds
 */
function set_cookie_exp(param, value, exp){
    // Set the cookie to expire in one hour
    time = new Date();
    time.setTime(time.getTime() + exp);
    cookiestr = param + '=' + value + ';expires=' + time.toGMTString() + ';path=/'+';SameSite=Lax';
    document.cookie= cookiestr;

}


/**
 * Get value for a cookie by name
 *      get_cookie(param)
 *
 * Recovers the value associated with a cookie with the string name,
 * param.  If no cookie with a matching param name is found, an empty
 * string is returned.
 *
 * @param param - str, name for the cookie
 * @returns {string|string|jQuery|*|string} - the value from the cookie
 */
function get_cookie(param){
    let pairs = decodeURIComponent(document.cookie).split(';');
    let tparam, declare, value;
    // Loop over the parameter-value pairs
    for(declare of pairs){
        // Split by =
        pair = declare.split('=')
        if(pair.length == 2){
            tparam = pair[0].trim();
            value = pair[1].trim();
            if(tparam==param){
                return value;
            }
        }
    }
    return '';
}
