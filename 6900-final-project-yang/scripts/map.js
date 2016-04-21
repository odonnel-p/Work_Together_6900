var width = d3.select('#plot').node().clientWidth,
    height = d3.select('#plot').node().clientHeight,
    centered, mapped_trips,
    zoomed = false,
    switch_a = false;

var selected_station,
    trips_from,
    trips_to;

var from_or_two,
    time_of_day,
    long_or_short;

//SVG FOR MAP
var svg = d3.select( "#plot" )
  .append( "svg" )
  .attr( "width", width )
  .attr( "height", height );


svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .style('fill', 'none')
    .on("click", clicked);

var g = svg.append( "g" );

//PROJECTION 
var albersProjection = d3.geo.albers()
  .scale( 260000 )
  .rotate( [71.087,0] )
  .center( [0, 42.33] )
  .translate( [width/2,height/2] );

//DRAWING THE PATHS OF geoJSON OBJECTS
var geoPath = d3.geo.path()
    .projection( albersProjection )

d3.send_station_to_module = function() {
  console.log(selected_station);
  return selected_station;
}

d3_queue.queue()
    .defer(d3.csv,'data/hubway_stations.csv', parse_stations)
    .defer(d3.json, 'data/neighborhoods.json') //boston
    .defer(d3.json, 'data/camb_zipcode.json') //cambridge
    .defer(d3.json, 'data/somerville_wards.json') //sommerville
    .defer(d3.json, 'data/brookline_zips.json') //brookline
    .defer(d3.csv, 'data/hubway_trips_reduced.csv', parse_trips)
    .await(dataLoaded)

function dataLoaded(err, stations, bos, cam, som, bro, trips) {
  console.log('WOW DATA IS LOADED');
  // console.log(stations);
  // console.log(bos);
  // console.log(cam);
  // console.log(som);
  //console.log(trips);

  //
  // STATION SELECT DROP DOWN MENU
  // populate drop down menu for stations
  //

  // var select = d3.select("#dropdown")

  //   select
  //     .on("change", function(d) {
  //       var value = d3.select(this).property("value");
  //       //alert(value);
  //     });

  //   select.selectAll("option")
  //     .data(stations)
  //     .enter()
  //       .append("option")
  //       .attr("value", function (d) { return d.id; })
  //       .text(function (d) { return d.id+": "+d.fullName; });

  // var button_select = d3.selectAll("button")

  // button_select.forEach( function(e) {
  //   this.addEventListener('click', function(d){
      
  //     var elemID = e.id
      
  //     if (elemID=="se1" || "se2"){
  //       selected_station = elemID;
  //       time_of_day = null;
  //       long_or_short = null;
  //     } 

  //     if (elemID=="tod1"||"tod2"||"tod3"){
  //       from_or_two = null;
  //       time_of_day = null;
  //       long_or_short = null;
  //     }
  //   });
  // })
  
    

  //
  // DATA ARCHITECTURE
  // set up data so that when clickec a station dot can point to all trips from/to station
  //

    var cross_trips = crossfilter(trips);
    var tripsByStartSt = cross_trips.dimension(function(d){return d.startStation}),
        tripsByEndSt = cross_trips.dimension(function(d){return d.endStation});
  
    var nest_start_trips, nest_end_trips;
      
    nest_start_trips = d3.nest()
        .key(function(d) { return d.startStation; })
        .entries(trips);
    nest_end_trips = d3.nest()
        .key(function(d) { return d.endStation; }) 
        .entries(trips)

    mapped_start_trips = d3.map(nest_start_trips, function (d) { return d.key });
    mapped_end_trips = d3.map(nest_end_trips, function (d) { return d.key });


  // console.log(nest_start_trips);
  // console.log(nest_end_trips);



  //
  // PLOT MAP AND STATIONS
  // use .json to make map visual
  //

  g.selectAll( ".boston" )
    .data( bos.features )
    .enter()
    .append('path')
    .attr('class', 'boston neighborhoods')
    .attr( 'd', geoPath )
    .style('fill', '#888') //boston
    .on("click", clicked);

  g.selectAll( ".cambridge" )
    .data( cam.features )
    .enter()
    .append('path')
    .attr('class', 'cambridge neighborhoods')
    .attr( "d", geoPath )
    .style('fill', '#999') //cambridge
    .on("click", clicked);

  g.selectAll( ".somerville" )
    .data( som.features )
    .enter()
    .append('path')
    .attr('class', 'somerville neighborhoods')
    .attr( "d", geoPath )
    .style('fill', '#aaa')
    .on("click", clicked); //somerville

  g.selectAll( ".brookline" )
    .data( bro.features )
    .enter()
    .append('path')
    .attr('class', 'brookline neighborhoods')
    .attr( "d", geoPath )
    .style('fill', '#bbb')
    .on("click", clicked); //somerville

  g.selectAll('.station_dot')
    .data( stations )
    .enter()
    .append('circle')
    .attr('class', 'station_dot')
    .attr('station_num', function(d) { return d.id })
    .attr('id', function(d) { return d.fullName })
    .attr('cx', function(d) {
      var xy = albersProjection(d.lngLat);
      return xy[0]; })
    .attr('cy', function(d) {
      var xy = albersProjection(d.lngLat);
      return xy[1]; })
    .attr('r', sc_rad)
    .style('fill', 'blue')
    .style('stroke-width', 0)
    .on('click', get_data);

  svg.append('rect')
    .attr('x', 300)
    .attr('y', 662)
    .attr('height', 30)
    .attr('width', 400)
    .style('fill', "#ffffff")
    .style('opacity', .75)

  svg.append('text')
    .text('Boston, Brookline, Cambridge, Sommerville')
    .attr("font-family", "serif")
    .attr("font-size", "20px")
    .attr("fill", "black")
    .attr("font-weight", "bold")
    .attr('x', 310)
    .attr('y', 682);

};



//
// CLICK TO GET INFO ON STATION
// now assign this console log to a global variable
//

function get_data (d) {

  selected_station = d.id;
  trips_from = mapped_start_trips.get(d.id)
  trips_to = mapped_end_trips.get(d.id)

  // console.log(mapped_start_trips.get(d.id));
  // console.log(mapped_end_trips.get(d.id));
  //console.log(d.station_num);

  console.log(selected_station);
  console.log(trips_to);
  console.log(trips_from);

} 


//
// ZOOMING AND CLICKING FUNCTIONS OF MAP
// click area to zoom in on it
//

var sc_rad = function scaleradius () {
    
    if (zoomed == true){
      radius = 5;
      return radius
    }
    if (zoomed == false){
      radius = 2;
      return radius
    }
    
}

function clicked(d) {
  var x, y, k;

  if (d && centered !== d) {
    var centroid = geoPath.centroid(d);
    x = centroid[0];
    y = centroid[1];
    k = 4;
    zoomed = true;
    centered = d;
  } else {
    x = width / 2;
    y = height / 2;
    k = 1;
    zoomed = false;
    centered = null;
  }

  g.selectAll(".neighborhoods")
      .classed("active", centered && function(d) { return d === centered; });

  g.transition()
      .duration(750)
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
      //.style("stroke-width", 1.5 / k + "px");
}

function parse_stations(d){

    return {
        id: d.id,
        fullName: d.station,
        lngLat: [+d.lng, +d.lat]
    };

}

function parse_trips(d){
  if(+d.duration<60) return;

    return {
        duration: +d.duration,
        startTime: parseDate(d.start_date),
        endTime: parseDate(d.end_date),
        startStation: d.strt_statn,
        endStation: d.end_statn
    }
}

function parseDate(date){
    var day = date.split(' ')[0].split('/'),
        time = date.split(' ')[1].split(':');

    return new Date(+day[2],+day[0]-1, +day[1], +time[0], +time[1]);
}