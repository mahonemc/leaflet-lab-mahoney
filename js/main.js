//start Leaflet
function createMap() {
    //create baselayers
    
	//add OSM base tilelayer
    var OSMLayer = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    });
    
     //add black and white base tilelayer
    var blackAndWhite = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    
    //add stamen map
    var topo = L.tileLayer('http://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.{ext}', {
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> — Map data © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: 'abcd',
        minZoom: 0,
        maxZoom: 20,
        ext: 'png'
    });
	
	    
   //create basemap layer group for layer control
    var baseMaps = {
        "OpenStreetMap": OSMLayer,
        "Black and White": blackAndWhite,
        "Stamen Tiles": topo
        
    };

    //create map
    var map = L.map('map', {
        center: [37.848578, -77.962559],
        zoom: 7,
        layers: [OSMLayer],
		
		
	});
	let counties = L.layerGroup()
	
	// cycle through geojson to get an array
	jQuery.getJSON( "https://opendata.arcgis.com/datasets/f378875d0c0d4d72ad367ccc25245e3f_1.geojson", function(json){
		L.geoJSON(json, {
			onEachFeature: addMyData,
			 color: 'black',
			fillColor: 'white',
			fillOpacity: 0.2,
			weight: 1,
			opacity: 1
		})
	});
	// This function is run for every feature found in the geojson file. It adds the feature to the empty layer we created above
	function addMyData(feature, layer){
		counties.addLayer(layer)
        
	};
	var overlayMaps = {
		"Localities": counties
	};
        
	
	//control layers
	L.control.layers(baseMaps, overlayMaps).addTo(map);
	
   //get proportional symbols     
	getData(map);
	
	
   
};

   
var attributes;
var index;

//Create sequence controls
function createSequenceControls(map, attributes){
    //create range input element (slider)
	var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

       onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //create range input element (slider)
            $(container).append('<input class="range-slider" type="range">');

            //add skip buttons
            $(container).append('<button class="skip" id="reverse" title="Previous Year">Previous</button>');
            $(container).append('<button class="skip" id="forward" title="Next Year">Next</button>');

            $(container).on('mousedown dblclick', function(e){
				L.DomEvent.stopPropagation(e);
            });

            return container;
        }
    });

    map.addControl(new SequenceControl());
	
    //set slider attributes
    $('.range-slider').attr({
        max: 8,
        min: 0,
        value: 0,
        step: 1
        
    });
      
    $('.skip').click(function(){
        //get the old index value
        var index = $('.range-slider').val();
        
     //Step 6: increment or decrement depending on button clicked
        if ($(this).attr('id') == 'forward'){
            index++;
            //Step 9: pass new attribute to update symbols
            updatePropSymbols(map, attributes[index]);
			
            //Step 7: if past the last attribute, wrap around to first attribute
            index = index > 7 ? 0 : index;
        } else if ($(this).attr('id') == 'reverse'){
            index--;
            //Step 7: if past the first attribute, wrap around to last attribute
            index = index < 0 ? 7 : index;
            updatePropSymbols(map, attributes[index]);
		                                      
        };
       //Step 8: update slider
        $('.range-slider').val(index);
        updatePropSymbols(map, attributes[index]);
		                
        $('.range-slider').on('input', function(){
        //Step 6: get the new index value
        var index = $(this).val();
			updateLegend(map,attribute[index]);
			updatePropSymbols(map, attributes[index]);
						
            //check
            console.log(attributes)
        });
    });
};

//calculate function for proportional symbol
function calcPropRad(attValue) {
    //scale factor (small for state size area)
    var scaleFactor = .001;
    //area of marker, scale factor by attribute
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);

    return radius;
}

//Add circle markers for population data
//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];
    //check
    console.log(attribute);

    //create marker options
    var options = {
        fillColor: "#2665A9",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.75
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRad(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //build popup content string
    createPopup(feature.properties, attribute, layer, options.radius);
    
    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//Add circle markers for point features to the map
function createPropSymbols(data, map, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

      
//Import GeoJSON data
function getData(map){
    //load the data
    $.ajax("data/vapopdata.geojson", {
        dataType: "json",
        success: function(response){
            //create an attributes array
            var attributes = processData(response);

            createPropSymbols(response, map, attributes);
            createSequenceControls(map, attributes);
			createLegend(map, attributes);
			
        }
    });
};

           
//create the array that will help cycle through data attributes
function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("pop") > -1){
            attributes.push(attribute);
        };
    };
    //check result
    console.log(attributes);

    return attributes;
};
//function called to update the symbols and popup with slider and buttons
function updatePropSymbols(map,attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRad(props[attribute]);
            layer.setRadius(radius);
			updateLegend(map, attribute);			
            createPopup(props, attribute, layer, radius);
			
			
				
		};
	});
	
};

//create popup
function createPopup(properties, attribute, layer, radius){
    //add popup content string
	var popupContent = "<p><b>Locality:</b> " + properties.county + "</p>",
		//add formatted attribute to panel content string
		year = attribute.split("_")[1];
	
	popupContent += "<p><b>Population in " + year + ":</b> " + properties[attribute] + "</p>";
	//replace the layer popup
    layer.bindPopup(popupContent, {
		offset: new L.Point(0,-radius)
    });
};

function createLegend(map, attributes){
	var LegendControl = L.Control.extend({
		options: {
            position: 'bottomright'
        },

        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            //add temporal legend div to container
            $(container).append('<div id="temporal-legend">')
			
			var svg = '<svg id="attribute-legend" width="180px" height="80px">';
			//array of circle names to base loop on
			var circles = {
            max: 20,
            mean: 40,
            min: 60
        };

        //loop to add each circle and text to svg string
        for (var circle in circles){
            //circle string
            svg += '<circle class="legend-circle" id="' + circle + '" fill="#2665A9" fill-opacity="0.8" stroke="#000000" cx="30"/>';

            //text string
            svg += '<text id="' + circle + '-text" x="65" y="' + circles[circle] + '"></text>';
        };
			//add attribute legend svg to container			
			$(container).append(svg);			
            return container;
		}
	});

    map.addControl(new LegendControl());
	updateLegend(map, attributes[0]);
};


//Calculate the max, mean, and min values for a given attribute
function getCircleValues(map, attribute){
	//start with min at highest possible and max at lowest possible number
	var min = Infinity,
        max = -Infinity;

    map.eachLayer(function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attribute]);
			
			//test for min
			if (attributeValue < min){
                min = attributeValue;
            };

            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });

    //set mean
    var mean = (max + min) / 2;

    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};

//Example 3.7 line 1...Update the legend with new attribute
function updateLegend(map, attribute){
    //create dynamic title
    var year = attribute.split("_")[1];
    var content = "Population in " + year;

    //replace legend content
    $('#temporal-legend').html(content);

    //get the max, mean, and min values as an object
    var circleValues = getCircleValues(map, attribute);
	for (var key in circleValues){
        //get radius
        var radius = calcPropRad(circleValues[key]);

        $('#'+key).attr({
            cy: 55 - radius,
            r: radius
        });

        //Step 4: add legend text
        $('#'+key+'-text').text(Math.round((circleValues[key]*100)/100));
    };
};


$(document).ready(createMap);
