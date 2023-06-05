// Global storage of the PYroMat data
var infodata;

// Models
var unitModel;
var dataModel;

// User Controls
var propEntryForm;
var tableControlsModal;
var substancePickerModal;
var unitControlsModal
var plotControlsModal;

// Views
var plotView;
var tableView;


/**
 * Equivalent to document.ready(). Run when the page loads. Begin
 * initialization by loading the general information.
 */
$(function(){

//     $('#plotpopover').attr("data-content",`<form>
//   <div class='form-group'>
//     <label for='exampleInputEmail1'>Email address</label>
//     <input type='email' class='form-control' id='exampleInputEmail1' aria-describedby='emailHelp' placeholder='Enter email'>
//     <small id='emailHelp' class='form-text text-muted'>We'll never share your email with anyone else.</small>
//   </div>
//   <div class='form-group'>
//     <label for='exampleInputPassword1'>Password</label>
//     <input type='password' class='form-control' id='exampleInputPassword1' placeholder='Password'>
//   </div>
//   <div class='form-group form-check'>
//     <input type='checkbox' class='form-check-input' id='exampleCheck1'>
//     <label class='form-check-label' for='exampleCheck1'>Check me out</label>
//   </div>
//   <button type='submit' class='btn btn-primary'>Submit</button>
// </form>`);
//
//
//     $('#plotpopover').popover({
//     html: true,
//     sanitize: false
// });

    // infodata holds the basic info about PYroMat substances.
    // Check if the infodata has been created and saved to our localStorage
    infodata = localStorage.getItem("infodata");
    if (infodata === null){  // Data not stored, load it from ajax
        ajax_info((data)=>{
            // Data ready. Save to localStorage, and copy to variable
            localStorage.setItem("infodata", JSON.stringify(data));
            infodata = data;
            init();
        });
    } else {
        infodata = JSON.parse(infodata); // parse the data from localStorage
        init();
    }
});


/**
 * Execute the initialization of the page. Requires that infodata has already
 * been initialized.
 */
function init(){
    if (!infodata){
        alert("Error in page initialization. Please report as a bug!")
    }
    // Infodata is definitely initialized

    // Load the substance and units from the cookies
    let subid = load_substance_cookie();
    let units = load_units_cookie();

    // Change the Substance Display Text
    display_substance(subid);

    // Create the models that will hold onto the data
    dataModel = new DataModel(subid);
    unitModel = new UnitModel(infodata.data.legalunits, units);

    // Compute the isoline data for the plot
    calculate_plot_isolines();

    // Substance Gear
    substancePickerModal = new SubstancePicker('modal_substancepicker',
        'modal_substance.html',
        infodata.data.substances,
        change_substance);

    // Units Gear
    unitControlsModal = new UnitPicker($('#modal_unitspicker'),
        "unitspicker.html",
        infodata.data.legalunits,
        units,
        infodata.units,
        change_units);

    // Table Gear
    tableControlsModal = new TableControls($("#property_selection_outer"),
        "table_options.html",
        dataModel.get_output_properties());

    // Plot Gear
    plotControlsModal = new PlotControls($("#plot_controls"),
        "plot_options.html");

    // Create the Property Input Form
    propEntryForm = new PropEntryView("prop-entry",
        dataModel.get_input_properties(),
        unitModel.get_units_for_prop(dataModel.get_input_properties()),
        compute_point);

    // Create plot, have it listen to the other objects
    plotView = new PlotView("plot_display",
        dataModel,
        unitModel.get_units_for_prop(dataModel.get_output_properties()),
        compute_point);
    dataModel.addListener(plotView);
    tableControlsModal.addListener(plotView);
    plotControlsModal.addListener(plotView);

    // Create table, have it listen to the other objects
    tableView = new TableView('property_table',
        dataModel,
        dataModel.get_output_properties(),
        unitModel.get_units_for_prop(dataModel.get_output_properties()));
    dataModel.addListener(tableView);
    tableControlsModal.addListener(tableView);
}


// **********************************************************
// *  Toggle Button functionality
// **********************************************************

function onclick_toggle_substancecontrols(){
    substancePickerModal.toggle();
    unitControlsModal.hide();
    plotControlsModal.hide();
    tableControlsModal.hide();
}

function onclick_toggle_unitcontrols(){
    unitControlsModal.toggle();
    substancePickerModal.hide()
    plotControlsModal.hide();
    tableControlsModal.hide();
}

function onclick_toggle_plotcontrols(){
    plotControlsModal.toggle();
    substancePickerModal.hide();
    unitControlsModal.hide();
    tableControlsModal.hide();
}

function onclick_toggle_tablecontrols(){
    tableControlsModal.toggle();
    plotControlsModal.hide();
    substancePickerModal.hide();
    unitControlsModal.hide();
}

// **********************************************************
// *  Handle user requests to reconfigure page
// **********************************************************

/**
 * Call when the user requests a change to the substance.
 * Reloads page.
 * @param substance - the substance id string
 */
function change_substance(substance){
    set_substance_cookie(substance);
    location.reload();
}

/**
 * Call when the user requests a change to the units.
 * Reloads page.
 * @param units - the units dictionary keyed by unit type
 */
function change_units(units){
    set_units_cookie(units)
    location.reload()
}

/**
 * Update the Indicator that shows the currently active substance;
 * @param sub - the substance id
 */
function display_substance(sub){
    let label;
    if (infodata.data.substances[sub].nam[0]) {
        label = infodata.data.substances[sub].nam[0] + " ("+sub+")";
    } else {
        label = sub;
    }
    $("#sub_string").text(label);
}

/**
 * Decides which isolines to compute and passes the request along.
 */
function calculate_plot_isolines(){
    if (dataModel.get_substance().startsWith('mp')){
        compute_steamdome();
        compute_auxline({'x': 0, 'default': true});
    }

    // Add a few types of lines
    ['p', 'T', 'd', 'h', 's'].forEach((prop_val)=>{
        // Have to manually add property due to variable name
        compute_args = {}
        compute_args[prop_val] = 0;
        compute_args['default'] = true;
        compute_auxline(compute_args);
    });
}

// **********************************************************
// *  Wrappers for API calls
// **********************************************************

/**
 * Wrapper for computing isolines. Automatically adds result as an
 * auxline to datamodel.
 * @param props - Dict with keys of property and numeric values
 */
function compute_auxline(props={}){
    ajax_isoline(dataModel.get_substance(),
        props,
        unitModel.get_units(),
        (response) => {
            // Get the property that this line was for (maybe remove default)
            let keys = Object.keys(props);
            if (keys.indexOf("default") > -1){
                keys.splice(keys.indexOf("default", 1))
            }
            let prop = keys[0];

            // If it had multiple lines, loop over to add each individually
            if (Array.isArray(response.data)){
                response.data.forEach((line)=> {
                    dataModel.add_auxline(prop, line, 'global');
                });
            } else {
                // Add the line
                dataModel.add_auxline(prop, line, 'global');
            }

    });
}

/**
 * Wrapper for computing the steamdome isoline. Automatically adds as an
 * auxline to datamodel.
 */
function compute_steamdome(){
    ajax_saturation(dataModel.get_substance(),
        {},
        unitModel.get_units(),
        (response) => {
            // We get separate liquid and vapor lines back
            let sll = response.data['liquid'];
            let svl = response.data['vapor'];

            // concatenate vapor onto liquid so we have a single line
            Object.keys(svl).forEach(key => {
                for (let i = svl[key].length; i > -1; i--) {
                    sll[key].push(svl[key][i]);
                }
            });

            // Add the line to the model
            dataModel.add_auxline('steamdome', sll,parent='global');
    });
}


/**
 * Wrapper for calls to PYroMat API. Used as a callback by several of the Views
 * @param state_props - Dict with keys of property and numeric values
 */
function compute_point(state_props){
    ajax_point(
        dataModel.get_substance(),
        state_props,
        unitModel.get_units(),
        (response) => {
            dataModel.add_point(response.data);
        });
}
