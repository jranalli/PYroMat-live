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

    // Initialize the substance display text
    display_substance(subid);

    // Create the models that will hold onto the data
    dataModel = new DataModel(subid);
    unitModel = new UnitModel(infodata.data.legalunits, units);

    substancePickerModal = new ModalSubstancePicker('modal_substancepicker',
        '../static/modal_substance.html',
        infodata.data.substances,
        change_substance);

    unitControlsModal = new UnitFormView($('#modal_unitspicker'),
        "../static/unitspicker.html",
        infodata.data.legalunits,
        units,
        infodata.units,
        change_units);


    calculate_plot_isolines();

    propEntryForm = new PropEntryView("property_controls",
        dataModel.get_input_properties(),
        unitModel.get_units_for_prop(dataModel.get_input_properties()),
        compute_point);



    tableControlsModal = new TableControls($("#property_selection_outer"),
        "../static/table_options.html",
        true);
    tableControlsModal.init(dataModel.get_output_properties());

    plotControlsModal = new PlotControls($("#plot_controls"),
        "../static/plot_options.html",
        true);
    plotControlsModal.init(dataModel.get_output_properties());

    plotView = new PlotView("plot_display",
        dataModel,
        unitModel.get_units_for_prop,
        compute_point);
    dataModel.addListener(plotView);
    tableControlsModal.addListener(plotView);
    plotControlsModal.addListener(plotView);
    plotView.init();

    // Assign views to listen to the main model
    tableView = new TableView('property_table',
        dataModel,
        unitModel.get_units_for_prop);
    dataModel.addListener(tableView);
    tableControlsModal.addListener(tableView);
    tableView.init(dataModel.get_output_properties());



}





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

function change_substance(substance){
    set_substance_cookie(substance);
    location.reload();
}

function change_units(units){
    set_units_cookie(units)
    location.reload()
}

function display_substance(sub){
    let label = "";
    if (infodata.data.substances[sub].nam[0]) {
        label = infodata.data.substances[sub].nam[0] + " ("+sub+")";
    } else {
        label = sub;
    }
    $("#sub_string").text(label);
}

function calculate_plot_isolines(){
    if (dataModel.get_substance().startsWith('mp')){
        compute_steamdome();
        compute_auxline({'x': 0, 'default': true});
    }

    // Add a few types of lines
    ['p', 'T', 'd', 'h', 's'].forEach((prop_val)=>{
        compute_args = {};
        compute_args[prop_val] = 0;
        compute_args["default"] = true;
        compute_auxline(compute_args);
    });
}


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
