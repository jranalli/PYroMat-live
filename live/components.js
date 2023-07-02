// *********************************************
// * MODEL
// *********************************************

/**
 * Class that can handle notifying listeners when a change occurs
 */
class Subject {
    // Based on https://webdevstudios.com/2019/02/19/observable-pattern-in-javascript/
    static EVENT_ID_NULL = null;

    constructor() {
        this.listeners = [];
    }

    /**
     * Add a listener to the object
     * @param listener - Object: must contain listener.update(source, event, data)
     */
    addListener(listener) {
        this.listeners.push(listener);
    }

    removeListener(listener) {
        const removeIndex = this.listeners.findIndex(obs => {
            return listener === obs;
        });

        if (removeIndex !== -1) {
            this.listeners = this.listeners.slice(removeIndex, 1);
        }
    }

    /**
     * Notify all listeners of events
     * @param source - Object: the origin object that created the event
     * @param event - String: an indicator of the event type (or null)
     * @param data - Various: data associated with the event (or null)
     */
    notify(source, event=Subject.EVENT_ID_NULL, data=null) {
        if (this.listeners.length > 0) {
            this.listeners.forEach(listener => listener.update(source, event, data));
        }
    }
}


class UnitModel{

    constructor(valid_units, active_units){
        this.valid_units = valid_units;
        this.set_units = this.set_units.bind(this);
        this.get_units = this.get_units.bind(this);
        this.get_valid_units = this.get_valid_units.bind(this);
        this.get_units_for_prop = this.get_units_for_prop.bind(this);
        this.set_units(active_units);
    }

    /**
     * Change the current units. This invalidates all stored point data.
     * @param units - a dict of the current units. Keys are unit category,
     *                    values are the unit value
     */
    set_units(units){
        this.units = units;
    }

    /**
     * Get the current unit set
     * @returns units - a dict of the current units. Keys are unit category,
     *                  values are the unit value
     */
    get_units(){
        if (this.units != null) {
            return this.units;
        } else {
            return [];
        }
    }

     /**
     * Get all valid units for PMGI
     * @returns valid_units - dict of valid units, keys are unit category,
     *                             values are arrays of legal values
     */
    get_valid_units(){
        if (this.valid_units != null) {
            return this.valid_units;
        } else {
            return [];
        }
    }

    /**
     * Get the current unit strings for a list of properties
     * @returns units - a dict of the current units. Keys are property,
     *                  values are the unit value as a string
     */
    get_units_for_prop(props=[]){
        if (this.units === null) { return ""; }

        let unitstrs = {}
        props.forEach((prop) => {
            let propstr;
            // Case it out by the property
            if (prop === 'T') {
                propstr = this.units['temperature'];
            } else if (prop === 'p') {
                propstr = this.units['pressure'];
            } else if (prop === 'd') {
                propstr = this.units['matter'] + '/' + this.units['volume'];
            } else if (prop === 'v') {
                propstr = this.units['volume'] + '/' + this.units['matter'];
            } else if (prop === 'e' || prop === 'h') {
                propstr = this.units['energy'] + '/' + this.units['matter'];
            } else if (prop === 's' || prop === 'cp' || prop === 'cv') {
                propstr = this.units['energy'] + '/ (' + this.units['matter'] + ' ' + this.units['temperature'] + ')';
            } else {
                propstr = '-';
            }
            unitstrs[prop] = propstr;
        });
        if (props.length === 1) {
            return unitstrs[props[0]];
        } else {
            return unitstrs;
        }
    }
}


/**
 * Class to hold data about the thermodynamic substance including a list of
 * values that has been computed
 */
class DataModel extends Subject{
    // Several event IDs thrown by this
    static EVENT_POINT_ADD = 'point_add' // Data will be the added point
    static EVENT_POINT_DELETE = 'point_delete' // Data will be id of deleted point
    static EVENT_INIT_POINTS = 'init_pts'; // Data will be null
    static EVENT_INIT_AUXLINE = 'init_aux'; // Data will be null
    static EVENT_AUXLINE_ADD = 'auxline_add'; // data will be the added line
    static EVENT_AUXLINE_DELETE = 'auxline_del'; // data will be the id of the deleted line

    ALL_PROPS = ["T","p","v","d","e","h","s","x","cp","cv","gam"];
    DEFAULT_PROP_OUT_SHORTLIST=["T","p","v","d","e","h","s","x"];
    DEFAULT_PROP_IN_SHORTLIST=["T","p","v","d","e","h","s","x"];
    INIT_PT_ID = 1;
    INIT_AUX_ID = 1;

    constructor(substance) {
        super();

        // Init this.points and this.auxlines
        this.substance = substance;
        this.init_auxlines();
        this.init_points();
    }

    /**
     * Clear all auxiliary lines stored and get ready to start over
     */
    init_auxlines() {
        this.aux_id = this.INIT_AUX_ID;
        this.aux_lines = {}
        this.aux_lines['global'] = []

        this.notify(this, DataModel.EVENT_INIT_AUXLINE, null);
    }

    /**
     * Clear all points stored and get ready to start over.
     */
    init_points(){
        this.points = {};
        this.point_id = this.INIT_PT_ID;

        let keys = this.get_output_properties();
        keys.push('ptid');
        keys.forEach((key) =>{
            this.points[key] = [];
        });

        // Keep the global aux lines (i.e. assume substance constant)
        let gl = this.aux_lines['global'];
        this.aux_lines = {};
        this.aux_lines['global'] = gl;

        this.notify(this, DataModel.EVENT_INIT_POINTS, null);
    }

    /**
     * Return the properties possible for the current substance
     * @returns {*} array of properties represented by strings
     */
    get_output_properties(){
        if (this.substance.startsWith('ig')){
            let props = [...this.ALL_PROPS];
            props.splice(props.indexOf('x'), 1);
            return props
        } else {
            return [...this.ALL_PROPS];
        }
    }

    /**
     * Returns the input properties possible for the current substance
     * @returns {*} array of properties represented by strings
     */
    get_input_properties(){
        if (this.substance.startsWith('ig')){
            let props = [...this.DEFAULT_PROP_IN_SHORTLIST]
            props.splice(props.indexOf('x'), 1);
            return props
        } else {
            return this.DEFAULT_PROP_IN_SHORTLIST;
        }
    }

    /**
     * Returns the current substance set
     * @returns substance - a string with the substance id.
     */
    get_substance(){
        return this.substance;
    }

    /**
     * Get all currently calculated points
     * @returns points - dict of arrays, where each array row is a single point.
     *                        dict is keyed by property name. Dict includes
     *                        an extra field ['ptid'] with a non-repeating
     *                        integer id for the points.
     */
    get_points(){
        return this.points;
    }


    /**
     * Get all currently computed aux iso lines
     * @returns lines - dict of arrays, key of parent dict is the parent of
     *                        the lines being reported ('global' for general
     *                        lines like the steamdome, etc.). The array values
     *                        of the dict contain two keys: 'type' and 'data'.
     *                        The string 'type' represents the property
     *                        associated with this particular line (e.g. 'p'
     *                        for an isobar. 'data' is a dict, keyed by
     *                        property name and whose values are arrays of
     *                        values making up the whole line.
     *
     *                        lines['global'][0]['data']['p'] gets the pressure
     *                        values for a given line in global at index 0.
     */
    get_auxlines(id=null){
        if (id == null) {
            return this.aux_lines;
        } else if (id in this.aux_lines){
            return {id: this.aux_lines[id]};
        }
    }

    /**
     * Add a new point to the list
     * @param point - A dict keyed by property. An integer ID will be added to
     *                  the point for internal tracking.
     */
    add_point(point){
        if (Object.keys(point).length == 0){
            return;
        }
        let pt = Object.assign({}, point);  // Copy object
        pt['ptid'] = this.point_id;  // Append the id to the point

        // Push to the existing array
        for (const key in pt) {
            this.points[key].push(pt[key]);
        }
        // Increment the id and notify
        this.point_id++;
        this.notify(this, DataModel.EVENT_POINT_ADD, pt);
    }

    /**
     * Remove a point based on its integer id
     * @param id - the integer id of the point (via 'ptid' property)
     */
    delete_point(id){
        // Points is a dict keyed by property, with arrays
        let index = this.points['ptid'].indexOf(parseInt(id));
        for (const key in this.points) {
            this.points[key].splice(index, 1);
        }
        this.delete_auxlines(id);

        // If this was the last point, we want to clear things out.
        if (this.points['ptid'].length === 0){
            this.init_points();
        } else {
            this.notify(this, DataModel.EVENT_POINT_DELETE, id);
        }
    }

    /**
     * Add a new auxiliary line
     * @param type - string, iso-property
     * @param data - dict of property value arrays
     * @param parent - ptid of parent point being represented, or 'global'
     */
    add_auxline(type, data, parent='global'){
        // If it's a new parent, the array might not exist yet, initialize
        if (!(parent in this.aux_lines)){
            this.aux_lines[parent] = [];
        }
        let line = {'type': type, 'id': this.aux_id, 'data': data};
        this.aux_id++;
        this.aux_lines[parent].push(line);
        this.notify(this, DataModel.EVENT_AUXLINE_ADD, line);
    }

    /**
     * * Remove an auxiliary line its parent point integer id
     * @param id - the integer id of the parent point (via 'ptid' property)
     */
    delete_auxlines(id){
        // Make sure we've computed auxlines for this point first
        if (id in this.aux_lines){
            delete this.aux_lines[id];
            this.notify(this, DataModel.EVENT_AUXLINE_DELETE, id);
        }
    }
}

// *********************************************
// * VIEWS
// *********************************************

class ObservableDropdown extends Subject{
    static EVENT_DROPDOWN_CHANGE = 'newdropdown';
    constructor(target_sel, event_type, labeltxt, entries, defval) {
        super();
        this.event_type = event_type;

        this.target = target_sel;



        this.onChange = this.onChange.bind(this);

        // Create a div to put the buttons within
        let subdiv = $("<div></div>");
        let label = $("<label>").text(labeltxt).attr({labelfor: labeltxt+"_sel"});
        let sel = $("<select/>").attr({id: labeltxt+"_sel", value: defval});
        entries.forEach((opt) =>{
           let newopt = $("<option>").val(opt).text(opt);
           sel.append(newopt);
        });
        sel.val(defval).change();
        sel.on("change", this.onChange)
        subdiv.append(label);
        subdiv.append(sel);
        this.sel = sel;
        this.target.append(subdiv);
    }

    getValue(){
        return this.sel.val();
    }

    onChange(){
        this.notify(this, ObservableDropdown.EVENT_DROPDOWN_CHANGE, this.getValue());
    }
}

class PlotControls extends Subject{
    static EVENT_ISOLINE_VISIBILITY = 'isoline_change';
    static EVENT_AXIS_UPDATE = 'plot_axis_change';
    static EVENT_SUBCOMPONENT_ISOLINE = 'subcom_isoline_change';

    def_iso = ['T','p','h'];
    def_x = 's';
    def_y = 'T';

    isoopts = ['T','p','h','d','s','x'];
    xopts = ['T', 's', 'v', 'h'];
    yopts = ['T', 'p'];

    xsel;
    ysel;
    checks;

    constructor(target_sel, isoopts=null, xopts=null, yopts=null) {
        super();

        if (isoopts){
            this.isoopts = isoopts;
        }
        if (xopts){
            this.xopts = xopts;
        }
        if (yopts){
            this.yopts = yopts;
        }

        // Select the target div and load the html
        this.$outer = target_sel;

        let $checks = $("#checkboxes", this.$outer);
        let $xsel = $("#xdropdown", this.$outer);
        let $ysel = $("#ydropdown", this.$outer);

        this.checks = new PropChooserView($checks, PlotControls.EVENT_SUBCOMPONENT_ISOLINE, this.isoopts);
        this.xsel = new ObservableDropdown($xsel, ObservableDropdown.EVENT_DROPDOWN_CHANGE, "X Axis: ", this.xopts, this.def_x);
        this.ysel = new ObservableDropdown($ysel, ObservableDropdown.EVENT_DROPDOWN_CHANGE, "Y Axis: ", this.yopts, this.def_y);

        this.xsel.addListener(this);
        this.ysel.addListener(this);
        this.checks.addListener(this);

        this.init(this.isoopts);


    }

    init(isoline_properties){
        this.checks.init(isoline_properties, this.def_iso);
    }

    update(source, event, data){
        if (event === ObservableDropdown.EVENT_DROPDOWN_CHANGE) {
            this.notify(this, PlotControls.EVENT_AXIS_UPDATE, [this.xsel.getValue(), this.ysel.getValue()]);
        } else if (event === PlotControls.EVENT_SUBCOMPONENT_ISOLINE){
            this.notify(this, PlotControls.EVENT_ISOLINE_VISIBILITY, data);
        }
    }

}
class TableControls extends Subject{
    static EVENT_SUBCOMPONENT_CHECKS = "propcheckchange";
    static EVENT_COLUMN_CHANGE = "columnchange";

    def_colopts = ['T','p','v','d','e','h','s','x'];

    colopts = ['T','p','v','d','e','h','s','x','cp','cv','gam'];

    checks;

    constructor(target_sel, colopts=null) {
        super();

        if (colopts){
            this.colopts = colopts;
        }

        // Select the target div and load the html
        this.$outer = target_sel;
        this.$outer.append(this.$inner);

        let $checks = $("#checkboxes", this.$outer);

        this.checks = new PropChooserView($checks, TableControls.EVENT_SUBCOMPONENT_CHECKS, this.colopts);

        this.checks.addListener(this);

        this.init(this.colopts);

    }

    init(col_props){
        this.checks.init(col_props, this.def_colopts);
    }

    update(source, event, data){
        if (event === TableControls.EVENT_SUBCOMPONENT_CHECKS) {
            this.notify(this, TableControls.EVENT_COLUMN_CHANGE, data);
        }
    }
}


/**
 * A class for controlling the form that allows the user to specify units.
 * Must link to an HTML file from which the layout will be loaded.
 * HTML File should contain:
 * - A form where the all the selects will be added as <li's>(with ID: unit_form)
 * - Buttons for: apply, revert, default, cancel (with IDs: unit_apply, unit_revert, unit_default, unit_cancel)
 */
class UnitPicker {
    basic_set = {'temperature':1, 'pressure':1, 'volume':1, 'matter':1, "energy":1};
    basic_mode = true;
    constructor(target_sel, button_apply, button_default, button_cancel, valid_units, currentval, defaultval, set_callback, basic_mode=true) {
        this.change_units_callback = set_callback;
        this.currentval = currentval;
        this.defaultval = defaultval;

        this.basic_mode = basic_mode;

        this.unit_form = target_sel

        // Select the target div and load the html
        this.$outer = target_sel;

        this.button_apply = button_apply;
        this.button_default = button_default;
        this.button_cancel = button_cancel;

        // Attach the apply, revert and cancel buttons
        this.apply_onclick = this.apply_onclick.bind(this);
        this.button_apply.on("click", this.apply_onclick);

        this.default_onclick = this.default_onclick.bind(this);
        this.button_default.on("click", this.default_onclick);

        this.cancel_onclick = this.cancel_onclick.bind(this);
        this.button_cancel.on("click", this.cancel_onclick);

        this.get_values = this.get_values.bind(this);
        this.init(valid_units, this.currentval);
    }

    /**
     * Create the selects for the unit form
     * @param valid_units Expects an Object with keys of the unit categories
     *                      and values of arrays of the allowable unit values
     *                      for that unit category
     * @param current_values Expects an Object with keys of the unit categories
     *                          and values of the current unit for that unit
     *                          category
     */
    init(valid_units, current_values){
        // to show all units, we should loop over valid_units
        // to show just a subset, we should loop over basic_set
        let looplist = null;
        if (this.basic_mode){
            looplist = this.basic_set;
        } else {
            looplist = valid_units;
        }

        let $table = $("<table>");
        // Loop over all the configured unit types
        Object.keys(looplist).forEach(unit_cat => {
            // The form will be a list of labelled select boxes
            let $tr = $("<tr>");
            let capital_name = unit_cat.charAt(0).toUpperCase() + unit_cat.slice(1);
            let $td1 = $("<td>");
            let $label = $('<label>'+capital_name+'</label>', {});
            $td1.append($label)
            let $td2 = $("<td>");
            let $select = $('<select/>', {'name': unit_cat});
            $td2.append($select);

            // Loop over each valid unit within the given unit category
            valid_units[unit_cat].forEach(unit_opt => {
                // Add an option to the select that corresponds to it
                $select.append($("<option>").val(unit_opt).text(unit_opt));
            });

            // Add the objects to the form
            $tr.append($td1).append($td2);
            $table.append($tr);
        });
        this.unit_form.append($table);
        // Set all the values
        this.set_values(current_values);
    }

    /**
     * Set the active values of the selects
     * @param units - a dict keyed by unit category and string values
     */
    set_values(units){
        // Copy the values from a dict
        Object.keys(units).forEach(key => {
            let selobj = $('[name="'+key+'"]', this.$outer);
            selobj.val(units[key]);
        });
    }

    /**
     * Get the current values in the form
     * @returns dict keyed by unit category, with string values for the selection
     */
    get_values(){
        // Convert the values to a dict
        return Object.fromEntries(new FormData(this.unit_form[0]));
    }

    /**
     * User clicks the apply button
     * @returns {boolean}
     */
    apply_onclick(){
        // Confirm
        let success = confirm('Changing the units will reset all data. Are you sure?');
        if(success){
            // Pass the units to the controller
            this.change_units_callback(this.get_values())
        } else {
            // do nothing and let the user figure it out
            return false;
        }
    }

    /**
     * User clicks the revert button
     */
    revert_vals(){
        // revert back to what was set previously
        this.set_values(this.currentval);
    }

    /**
     * User clicks the default button
     */
    default_onclick(){
        this.set_values(this.defaultval);
    }

    /**
     * User clicks the cancel button
     * @returns {boolean}
     */
    cancel_onclick(){
        this.revert_vals();
    }
}

/**
 * A class for managing the form that consists of property data entry
 */
class PropEntryView{
    prop_names = {
        'T': 'Temperature',
        'p': 'Pressure',
        'v': 'Specific Volume',
        'd': 'Density',
        'e': 'Specific Internal Energy',
        'h': 'Specific Enthalpy',
        's': 'Specific Entropy',
        'x': 'Quality'
    }

    constructor(formHTMLid, input_properties, prop_strings, compute_callback) {
        this.target = $("#"+formHTMLid);
        this.prop_inner_name = "propinner";
        this.prop_form_name = "propform";
        this.post_button_name = "post_props";
        this.layout = "col";  // "row" or "col"

        this.props = input_properties;
        this.compute_callback = compute_callback;

        let propform = $('<form/>').attr({id: this.prop_form_name});
        this.target.append(propform);
        this.prop_form = $("#"+this.prop_form_name, this.target);

        let propinner = $('<div/>').attr({id: this.prop_inner_name});
        this.target.append(propinner);
        this.prop_inner = $("#"+this.prop_inner_name, this.target);

        this.create_propform(this.props, prop_strings);

        let postbutton = $('<input/>').attr({type: 'button', id: this.post_button_name, value: "Compute"});
        this.target.append(postbutton);
        this.post_button = $("#"+this.post_button_name, this.target);
        this.post_onclick = this.post_onclick.bind(this);
        this.post_button.on("click", this.post_onclick);

    }

    /**
     * Build the form. Note that an extra HTML attribute of propvalue will be
     * used to specify the actual property string separate from the name.
     * @param props - an array of property strings
     * @param units - an dict of unit strings by prop
     */
    create_propform(props, units=null) {
        // Always start from scratch
        this.prop_inner.empty();

        if (this.layout === "row"){
            //this.prop_form.append();
        } else if (this.layout === "col"){
            props.forEach((prop) => {

                let div = $('<div class="form-group mb-2 row">');
                let propname = `${prop}`;


                let proplbl = prop;
                if (units != null) {
                    proplbl = proplbl + " (" + units[prop] + "):";
                }
                let lbltxt = `<label htmlFor="${prop}_input" class="col-sm-4 col-form-label">${proplbl}</label>`;
                div.append(lbltxt);
                // Use string formatting to prevent insanity
                let inputbox = `<input type="text" propvalue="${prop}" id="${prop}_input" name="${prop}_input" class="form-control col-sm-8">`;
                div.append(inputbox);
                this.prop_form.append(div);
            });

        }
    }

    /**
     * Convert the form values to a dict of output data
     * @returns data - a dict keyed by property and string vals
     */
    get_values() {
        let outdata = {}; // A dict of specified props

        // Loop over each input box
        $('input', this.prop_form).each((id, box) =>{
            let value = box.value;
            if (value !== ""){ // If specified, add it to the prop dict
                let prop = box.attributes['propvalue'].nodeValue;
                outdata[prop] = value;
            }
        });
        return outdata;
    }

    /**
     * A callback to execute computing a point based on the form data.
     */
    post_onclick(){
        this.compute_callback(this.get_values());
    }

}

/**
 * A class for managing the form that allows a user to specify which properties
 * to show.
 * Data stored by this object, technically not just a View?
 */
class PropChooserView extends Subject{
    static EVENT_PROPERTY_VISIBILITY = 'propvis'; // When the checkboxes change
    static EVENT_ISOLINE_VISIBILITY = 'isolinevis'; // When the checkboxes change
    constructor(target_selector, event_type, shortlist = null) {
        super();
        this.event_type = event_type;
        this.shortlist = shortlist;

        this.prop_checks_name = "propchecks";

        // Initialize selectors for the components that make up this control
        this.$outer = target_selector;

        this.$inner = $("<div></div>");
        this.$outer.append(this.$inner);


        // Create a <ul> to hold the checklist
        let checklist = $('<form>').attr({id: this.prop_checks_name});

        this.$inner.append(checklist);

        // Get its selector
        this.prop_checks = $('#'+this.prop_checks_name, this.$outer);

        // Since these will be used as callbacks, they need to be bound
        this.checkbox_onchange = this.checkbox_onchange.bind(this);
    }


    /**
     * Initialize
     * @param valid_properties - an array of valid property strings
     * @param show_properties - an array of properties that are true
     */
    init(valid_properties, show_properties) {
        this.create_checkboxes(valid_properties);
        this.set_checkbox_values(show_properties);

        this.notify(this, this.event_type, this.get_checkbox_values());
    }

    /**
     * Build the checkboxes
     * @param valid_properties - an array of valid property strings
     */
    create_checkboxes(valid_properties) {
        this.prop_checks.empty();
        // Loop over all properties
        valid_properties.forEach(prop => {
            if (this.shortlist == null || this.shortlist.includes(prop)) {
                // The form will be a list of labelled check boxes
                let $label = $('<label for="'+prop+'_box">' + prop + '</label>', {});

                // Add this checkbox
                let $checkbox = $('<input>', {
                    type: "checkbox",
                    value: prop,
                    id: prop + '_box',
                    name: prop + '_box'
                });

                // add the callback
                $checkbox.on("click", this.checkbox_onchange);

                // Add the objects to the form
                this.prop_checks.append($checkbox).append($label).append($("<br>"));
            }
        });
    }

    /**
     * Callback for when one of the checkboxes is changed
     */
    checkbox_onchange(){
        let disp_props = this.get_checkbox_values();
        this.notify(this, this.event_type, disp_props);
    }

    /**
     * Get the values of the checkboxes
     * @returns names - an array of property strings that are checked
     */
    get_checkbox_values() {
        let names = [];
        $('input:checked', this.prop_checks).each((id, box) => {
            names.push(box.value);
        });
        return names;
    }

    /**
     * Set the values of the checkboxes
     * @param show_properties - an array of property strings that should be checked
     */
    set_checkbox_values(show_properties) {

        $('input', this.prop_checks).each((id, box) => {
            let prop = box.value;
            let checked = show_properties.includes(prop);
            if (checked) {
                box.checked = true;
            } else {
                box.checked = false;
            }
        });
    }
}


/**
 * A helper for dealing with the plot positions. In number between min & max?
 */
Number.prototype.between = function(min, max) {
    return this >= min && this <= max;
};

/**
 * A plot of the data
 */
class PlotView{
    TRACEORDER = ['steamdome','p','T','d', 'h', 's', 'x', 'user']
    TRACENAMES = ['User Data', 'Steam Dome', 'Const. p', 'Const. T', 'Const. d', 'Const. h', 'Const. s', 'Const. x']
    TRACECOLORS = ['']

    constructor(divTarget, datasource, units, pointcallback) {
        // TODO - plot prettiness
        this.dispprops = ['T','s','p','v'];
        this.dispisos = ['T', 'p', 'h'];
        this.target = $("#"+divTarget);
        this.plot_div_name = "plot";

        this.x_prop = "s";
        this.y_prop = "T";

        // Create the div for the plot
        let plot = $("<div/>").attr({id: this.plot_div_name});
        this.target.append(plot);
        this.plot = $("#"+this.plot_div_name, this.target);

        this.traces = [];

        this.units = units;
        this.pointcallback = pointcallback;
        this.datasource = datasource;

        this.init();
    }

    init(){
        this.set_layout();
        // Create the plot trace
        this.traces = [];

        this.traces.push({
            x: [],
            y: [],
            mode: 'lines',
            type: 'scatter',
            name: 'Steam Dome',
            hovertemplate: " ",
            showlegend: false,
            line: {
                shape: "spline",
                color: 'rgb(0, 0, 0)',
                width: 3
            }
        });
        this.traces.push({
            x: [],
            y: [],
            mode: 'lines',
            type: 'scatter',
            name: 'isolines p',
            hovertemplate: "<b>Isobar</b><br>"+
                "p: %{customdata:.5g} "+this.units["p"],
            showlegend: false,
            line: {
                dash: "dot",
                color: 'rgb(0, 100, 0)',
                width: 1
            }
        });
        this.traces.push({
            x: [],
            y: [],
            mode: 'lines',
            type: 'scatter',
            name: 'isolines T',
            hovertemplate: "<b>Isotherm</b><br>"+
                "T: %{customdata:#.4g} "+this.units["T"],
            showlegend: false,
            line: {
                dash: "dot",
                color: 'rgb(155, 0, 0)',
                width: 1
            }
        });
        this.traces.push({
            x: [],
            y: [],
            mode: 'lines',
            type: 'scatter',
            name: 'isolines d',
            hovertemplate: "<b>Iso-d Line</b><br>"+
                "d: %{customdata:#.4g} "+this.units["d"],
            showlegend: false,
            line: {
                dash: "dot",
                color: 'rgb(0, 155, 155)',
                width: 1
            }
        });
        this.traces.push({
            x: [],
            y: [],
            mode: 'lines',
            type: 'scatter',
            name: 'isolines h',
            hovertemplate: "<b>Iso-h Line</b><br>"+
                "h: %{customdata:#.4g} "+this.units["h"],
            showlegend: false,
            line: {
                dash: "dot",
                color: 'rgb(155, 155, 0)',
                width: 1
            }
        });
        this.traces.push({
            x: [],
            y: [],
            mode: 'lines',
            type: 'scatter',
            name: 'isolines s',
            hovertemplate: "<b>Iso-s line</b><br>"+
                "s: %{customdata:#.3g} "+this.units["s"],
            showlegend: false,
            line: {
                dash: "dash",
                color: 'rgb(0, 0, 155)',
                width: 1
            }
        });
        this.traces.push({
            x: [],
            y: [],
            mode: 'lines',
            type: 'scatter',
            name: 'isolines x',
            hovertemplate: "<b>Iso-x line</b><br>"+
                "x: %{customdata:#.2g}",
            showlegend: false,
            line: {
                dash: "dot",
                color: 'rgb(155, 0, 155)',
                width: 1
            }
        });
        this.traces.push({ // hovertemplate created in updatePoints
            x: [],
            y: [],
            customdata: [],
            mode: 'markers',
            name: "User Points",
            type: 'scatter',
            marker: {
                color: 'rgb(175, 0, 0)',
                size: 10,
                line: {
                    color: 'rgb(175, 0, 0)',
                    width: 0
                }
            },
        });
        // Create the plot object
        Plotly.newPlot(this.plot.get()[0], this.traces, this.layout, {responsive: true});
        this.setupPlotClickListener();
    }

    /**
     * Details for styling the plot
     */
    set_layout(){
        let x_scale;
        let y_scale;
        if (this.x_prop === 'v' || this.x_prop === 'p'){
            x_scale = 'log';
        } else {
            x_scale = 'linear';
        }
        if (this.y_prop === 'p'){
            y_scale = 'log';
        } else {
            y_scale = 'linear';
        }

        this.layout = {
            xaxis: {
                title: this.x_prop + " (" + this.units[this.x_prop]+")",
                type: x_scale,
                autorange: true
            },
            yaxis: {
                title: this.y_prop + " (" + this.units[this.y_prop]+")",
                type: y_scale,
                autorange: true
            },
            margin: { t: 0 },
            showlegend: false,
            modebar: {orientation: "v"}
        };
    }

    /**
     * A listener for dealing with the user clicking to add a point
     */
    setupPlotClickListener(){
        let myPlot = this.plot.get()[0];
        let myPlotContainer = this;
        d3.select(".plotly").on('click', function(d, i) {
            let e = d3.event;
            let bgrect = document.getElementsByClassName('gridlayer')[0].getBoundingClientRect();
            let x = 0;
            let y = 0;
            let betweenx = false;
            let betweeny = false;
            // X Axis
            if (myPlotContainer.layout['xaxis']['type'] === 'linear') {
                x = ((e.x - bgrect['x']) / (bgrect['width'])) * (myPlot.layout.xaxis.range[1] - myPlot.layout.xaxis.range[0]) + myPlot.layout.xaxis.range[0];
                betweenx = x.between(myPlot.layout.xaxis.range[0], myPlot.layout.xaxis.range[1]);
            } else if (myPlotContainer.layout['xaxis']['type'] === 'log'){
                x = 10**(((e.x - bgrect['x']) / (bgrect['width'])) * (myPlot.layout.xaxis.range[1] - myPlot.layout.xaxis.range[0]) + myPlot.layout.xaxis.range[0]);
                betweenx = Math.log10(x).between(myPlot.layout.xaxis.range[0], myPlot.layout.xaxis.range[1]);
            }
            // Y Axis (flipped coords)
            if (myPlotContainer.layout['yaxis']['type'] === 'linear') {
                y = ((e.y - bgrect['y']) / (bgrect['height'])) * (myPlot.layout.yaxis.range[0] - myPlot.layout.yaxis.range[1]) + myPlot.layout.yaxis.range[1];
                betweeny = y.between(myPlot.layout.yaxis.range[0], myPlot.layout.yaxis.range[1]);
            } else if (myPlotContainer.layout['yaxis']['type'] === 'log') {
                y = 10 ** (((e.y - bgrect['y']) / (bgrect['height'])) * (myPlot.layout.yaxis.range[0] - myPlot.layout.yaxis.range[1]) + myPlot.layout.yaxis.range[1]);
                betweeny = Math.log10(y).between(myPlot.layout.yaxis.range[0], myPlot.layout.yaxis.range[1]);
            }

            if (betweenx && betweeny) {
                // Build the data and send to the controller
                let formData = {}
                formData[myPlotContainer.x_prop] = x
                formData[myPlotContainer.y_prop] = y
                myPlotContainer.pointcallback(formData);
            }
        });
    }

    update(source, event, data){
        if (event === DataModel.EVENT_POINT_ADD || event === DataModel.EVENT_POINT_DELETE){
            this.updatePoints(source.get_points());
        } else if (event === DataModel.EVENT_INIT_POINTS) {
            this.init();
            this.draw_auxlines(source.get_auxlines());
        } else if (event === unitModel.EVENT_UNIT) {
            this.init();
            this.draw_auxlines(this.datasource.get_auxlines())
        } else if (event === TableControls.EVENT_COLUMN_CHANGE) {
            this.dispprops = data;
            this.updatePoints(this.datasource.get_points());
        } else if (event === PlotControls.EVENT_ISOLINE_VISIBILITY){
            this.dispisos = data;
            this.draw_auxlines(this.datasource.get_auxlines());
        } else if (event === DataModel.EVENT_AUXLINE_ADD) {
            this.draw_auxlines(source.get_auxlines());
        } else if (event === PlotControls.EVENT_AXIS_UPDATE) {
            let [xprop, yprop] = data;
            this.setAxes(xprop, yprop);
        }
    }

    setAxes(xprop, yprop){
        this.x_prop = xprop;
        this.y_prop = yprop;
        this.init();
        this.draw_auxlines(this.datasource.get_auxlines());
        this.updatePoints(this.datasource.get_points());
    }


    /**
     * Handle updates to the auxiliary lines on the plot (i.e. isobars, dome)
     * @param data - the isolines dict corresponding to PointModel.get_auxlines()
     */
    draw_auxlines(data){
        // Loop over every iso-trace that we put in the diagram
        this.TRACEORDER.forEach((prop) =>{

            // Establish the index in the order of the traces
            let ind = this.TRACEORDER.indexOf(prop);
            if (ind >= 0) { // ind 0 is the user points

                // Make a placeholder for the updates
                let iso_update = null;

                if (prop === 'steamdome' ||
                    (this.x_prop !== prop && this.y_prop !== prop &&
                        this.dispisos.includes(prop))
                ) {
                    // Loop over all the aux lines that are in the "global" category
                    data['global'].forEach((line) => {

                        if (line['type'] === prop) {

                            // Initialize the trace update on the first call
                            if (iso_update == null) {
                                iso_update = {};
                                Object.keys(line['data']).forEach((key) => {
                                    iso_update[key] = [];
                                });
                            }

                            // Add the line to the trace property by property
                            Object.keys(line['data']).forEach((key) => {
                                iso_update[key] = iso_update[key].concat(line['data'][key]);
                                iso_update[key].push(null);
                            });
                        }
                    });
                }

                // Send the updated traces to the actual plot
                let update = {
                        x: [null],
                        y: [null],
                        customdata: [null]  // Display their text
                    };
                if (iso_update != null) {
                    update = {
                        x: [iso_update[this.x_prop]],
                        y: [iso_update[this.y_prop]],
                        customdata: [iso_update[prop]]  // Display their text
                    };
                }
                Plotly.restyle(this.plot.get()[0], update, [ind]);
            }
        });
    }

    /**
     * Handling points being added to the list of points
     * @param points
     */
    updatePoints(points) {
        // Build the customdata object for the tooltip according to the API
        // Object takes the form [[h1,v1,s1,...],[h2,v2,s2,...],[h3,v3,s3,...]]

        // Loop over all the points
        let allkeys = Object.keys(points);
        if (allkeys.length >0) {  // Only if there are points
            let customdataset = [];  // The custom data that will be added to the tooltip
            let keylist = [];
            for (let i = 0; i < points['ptid'].length; i++) {  // Loop over all points
                let arr = [] // Build an array of all props for this index.
                arr.push(points['ptid'][i]); // Make the index the very first datapoint.

                allkeys.forEach(key => {
                    if (key !== this.x_prop &&
                        key !== this.y_prop &&
                        this.dispprops.includes(key)) {
                        if (i === 0) {
                            keylist.push(key);
                        }
                        arr.push(points[key][i]);
                    }
                });
                customdataset.push(arr);
            }

            // customdataset is now ordered as (ptid, T, p, v, ...)

            // Build the strings that represent the tooltip
            let customrows = "";
            for (let i = 0; i < keylist.length; i++) {
                let unitstr = "";
                if (keylist[i] !== "x") {
                    unitstr = this.units[keylist[i]];
                }
                customrows = customrows + keylist[i] + ": %{customdata[" + (i + 1) + "]:#.5g} "+unitstr+"<br>";
            }

            // Fully replace User Point trace, including the custom data
            let update = {
                x: [points[this.x_prop]],
                y: [points[this.y_prop]],
                customdata: [customdataset],
                hovertemplate: "<b>Point %{customdata[0]}</b><br>" +
                    this.x_prop + ": %{x} "+this.units[this.x_prop]+"<br>" +
                    this.y_prop + ": %{y} "+this.units[this.y_prop]+"<br>" +
                    customrows,
            }

            let ind = this.TRACEORDER.indexOf('user');
            Plotly.restyle(this.plot.get()[0], update, [ind])
        }
    }
}

/**
 * A class for managing the interactive table
 */
class TableView{
    // delete rows? https://stackoverflow.com/questions/64526856/how-to-add-edit-delete-buttons-in-each-row-of-datatable
    // showhide columns https://datatables.net/examples/api/show_hide.html
    constructor(divTarget, datasource, props, units) {
        this.target = $("#"+divTarget);

        // create a <table> within the div that we'll operate on
        this.tabletarget = $("<table class='table' id='proptable' width='100%'></table>");
        this.target.append(this.tabletarget);

        this.proptext_to_id = {};
        this.table = null

        this.datasource = datasource;
        this.units = units;

        this.init(props);
    }

    init(props){
        let myDatasource = this.datasource;

        this.dispprops = [...props]; // copy of props
        if (!this.dispprops.includes('ptid')){
            this.dispprops.unshift("ptid");// ptid should be in the table but not the prop list
        }

        if (this.table == null){
            this.tabletarget.empty();
            let $head = $('<thead></thead>');
            let $foot = $('<tfoot></tfoot>'); // Havent figured out the footer
            let $r = $('<tr></tr>')
            this.proptext_to_id = {};
            this.dispprops.forEach((prop) =>{
                let propstr = prop;
                if (prop !== 'ptid'){
                    propstr = propstr + " ("+this.units[prop]+")";
                    this.proptext_to_id[propstr] = prop;
                }
                let $th = $('<th>'+propstr+'</th>');
                $r.append($th);
            });
            $r.append('<th>Ctrl</th>');
            $head.append($r);
            //$foot.append($r);
            this.tabletarget.append($head);
            //$tablediv.append($foot);


            // Build the data table with null content. Insert the delete button in the extra column.
            let table = new DataTable(this.tabletarget, {
                "columnDefs": [ {
                    "targets": -1,
                    "data": null,
                    "defaultContent": "<button id='click2del'>Delete</button>"
                } ]
            });

            // Click handler for each row's delete button
            $('tbody', this.tabletarget).on( 'click', 'button', function () {
                let data = table.row( $(this).parents('tr') ).data();
                myDatasource.delete_point(data[0]);
            } );
            this.table = table;
        } else {
            this.table.destroy();
            this.table = null;
            this.init(props);
        }

        // Redraw
        this.table.columns.adjust().draw();
    }

    update(source, event, data){
        if (event === DataModel.EVENT_POINT_ADD || event === DataModel.EVENT_POINT_DELETE){
            this.updatePoints(source.get_points());
        } else if (event === DataModel.EVENT_INIT_POINTS) {
            this.init(this.datasource.get_output_properties());
        } else if (event === TableControls.EVENT_COLUMN_CHANGE) {
            this.columnVisibility(data);
        }
    }

    /**
     * Change visibility of columns
     * @param columns - an array of property names to display
     */
    columnVisibility(columns){

        this.table.columns().every((ind) => {
            let col = this.table.column(ind);
            let name = col.header().textContent
            // Always display ptid and ctrl columns
            if (name==="ptid" || name==="Ctrl" || columns.includes(this.proptext_to_id[name]) ){
                col.visible(true);
            } else {
                col.visible(false);
            }
        });

    }

    /**
     * The points changed, redraw the table
     * @param points - All the points. Dict keyed by property, valued by array
     *                  of individual point values.
     */
    updatePoints(points) {

        // Clear them all
        this.table.rows().remove();

        let customdataset = [];
        for (let i=0; i<points['ptid'].length; i++ ){  // Loop over all points
            let arr = [] // Build an array of all props for this index.
            //arr.push(points['ptid'][i]); // Now included in points.
            // Loop over all props, add if exists
            this.dispprops.forEach(key => {
                if (key in points) {
                    arr.push(points[key][i].toLocaleString('en-US', {
                        maximumSignificantDigits: 5
                    }));
                }
            });
            customdataset.push(arr)
        }

        for (let i=0; i<customdataset.length; i++ ) {  // Loop over all rows
            this.table.row.add(customdataset[i]).draw(); // add to table
        }
    }
}
