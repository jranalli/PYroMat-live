// Global storage of the PYroMat data
var infodata;

// Models
var unitModel;
var dataModel;

// User Controls
var propEntryForm;
var tableControlsModal;
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
    let subid = "mp.H2O";
    let units = load_units_cookie();

    // Change the Substance Display Text
    display_substance(subid);

    // Create the models that will hold onto the data
    //TODO New DataModel
    dataModel = new DataModel(subid);
    unitModel = new UnitModel(infodata.data.legalunits, units);

    config_unit_labels(unitModel.get_units());

    // Compute the isoline data for the plot
    calculate_plot_isolines();

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

    //TODO REVISE THIS FORM
    // Create the Property Input Form
    // propEntryForm = new PropEntryView("property_controls",
    //     dataModel.get_input_properties(),
    //     unitModel.get_units_for_prop(dataModel.get_input_properties()),
    //     compute_cycle);

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
    alert("Sorry! Only water can be used as a substance for this tool.")
}

function onclick_toggle_unitcontrols(){
    unitControlsModal.toggle();
    plotControlsModal.hide();
    tableControlsModal.hide();
}

function onclick_toggle_plotcontrols(){
    plotControlsModal.toggle();
    unitControlsModal.hide();
    tableControlsModal.hide();
}

function onclick_toggle_tablecontrols(){
    tableControlsModal.toggle();
    plotControlsModal.hide();
    unitControlsModal.hide();
}

// **********************************************************
// *  Handle user requests to reconfigure page
// **********************************************************

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
 * Update the labels that show the current units
 */
function config_unit_labels(units){
    let ids = ["lbllowPress", "lblhiPress", "lblhiTemp", "lblmdot"]
    let unit_pair = {"lbllowPress":units["pressure"], "lblhiPress":units["pressure"], "lblhiTemp":units["temperature"], "lblmdot":units["matter"]+"/s"};
    ids.forEach((id)=>{
        let txt = $("#"+id).text();
        $("#"+id).text(txt+ " ("+unit_pair[id]+"):");
    });
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
                dataModel.add_auxline(prop, response.data, 'global');
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


function compute_cycle(){
    clear_cycle();

    let FuelCost = 7e-6 // $/J ($0.007/MJ)
    let EnergyValue = 2.8e-5 // $/kJ ($0.10/kWh)
    let EnergyValue_kWh = 0.1
    let nyrs = 5;

    let items = $("input","#cycle-params");
    let formData = {};
    items.each((id, box) =>{
        if (box.type === 'number') {
            formData[box.id] = parseFloat(box.value);
        }
    });

    let p1, p2s, p2, p3, p4s, p4
    let sub = dataModel.get_substance();
    let units = unitModel.get_units();
    ajax_point(sub,{p:formData['lowPress'], x:0}, units)
        .then((response) => {
            p1 = response.data;
            return ajax_point(sub,{p:formData['hiPress'], s:p1['s']}, units);  // Compute P2s
        }).then((response) =>{
            p2s = response.data;
            let h2a = (p2s['h'] - p1['h'])/formData['pumpEff'] + p1['h'];
            return ajax_point(sub,{p:formData['hiPress'], h:h2a}, units);  // Compute P2a
        }).then((response) =>{
            p2 = response.data;
            return ajax_point(sub,{p:formData['hiPress'], T:formData['hiTemp']}, units); // Compute P3
        }).then((response) =>{
            p3 = response.data;
            return ajax_point(sub,{p:formData['lowPress'], s:p3['s']}, units); // Compute P4s
        }).then((response)=>{
            p4s = response.data;
            let h4a = p3['h'] - (p3['h'] - p4s['h'])*formData['turbEff'];
            return ajax_point(sub,{p:formData['lowPress'], h:h4a}, units); // Compute P4a
        }).then((response)=>{
            // All points are done
            p4 = response.data;
            dataModel.add_point(p1, "1");
            dataModel.add_point(p2s, "2s");
            dataModel.add_point(p2, "2a");
            dataModel.add_point(p3, "3");
            dataModel.add_point(p4s, "4s");
            dataModel.add_point(p4, "4a");
            compute_processline({p1:p1, p2:p2, props:['T', 's']});
            compute_processline({p1:p2, p2:p3});
            compute_processline({p1:p3, p2:p4, props:['T', 's']});
            compute_processline({p1:p4, p2:p1});

            let qhi = p3['h'] - p2['h'];
            let qlo = p4['h'] - p1['h'];
            let wnet = (p3['h'] - p4['h']) - (p2['h'] - p1['h']);
            let eff = wnet/qhi;
            let life_fc = (formData['mdot'] * qhi)/formData['fuelEff'] * FuelCost * 60*60*24*365*nyrs;
            let life_tc = life_fc + formData['cost'];
            let life_svg = formData['mdot'] * wnet * EnergyValue_kWh * 24*365*nyrs;

            $("#out_efficiency").text((eff*100).toLocaleString('en-US', {maximumFractionDigits: 1}));
            $("#out_power").text((wnet*formData['mdot']).toLocaleString('en-US', {maximumFractionDigits: 0}));
            $("#out_energy").text((wnet*formData['mdot']*24*365).toLocaleString('en-US', {maximumFractionDigits: 0}));
            $("#out_annfuel").text((life_fc/nyrs).toLocaleString('en-US', {maximumFractionDigits: 0}));
            $("#out_annearn").text((life_svg/nyrs).toLocaleString('en-US', {maximumFractionDigits: 0}));
            $("#out_annprofit").text(((life_svg-life_fc)/nyrs).toLocaleString('en-US', {maximumFractionDigits: 0}));
            $("#output_data").show();
    });
}

function clear_cycle() {
    $("#output_data").hide();
    dataModel.init_points();
    dataModel.delete_auxlines('process');
}
function compute_processline(states={}){
    ajax_processline(dataModel.get_substance(),
        states,
        unitModel.get_units(),
        (response) => {
            // Get the property that this line was for (maybe remove default)
            let keys = Object.keys(states);
            if (keys.indexOf("default") > -1){
                keys.splice(keys.indexOf("default", 1))
            }
            let prop = keys[0];

            // Add the line
            dataModel.add_auxline(prop, response.data, 'process');

    });
}
