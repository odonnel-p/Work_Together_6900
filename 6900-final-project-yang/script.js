/**
 * Created by yangmuhe on 3/22/16.
 */
var w = d3.select('.plot').node().clientWidth,
    h = d3.select('.plot').node().clientHeight;

//dispatcher
var dispatcherStation = d3.dispatch('changestation', 'station_select');


//Module
var stationChart = d3.StationChart()
    .width(400).height(300)
    .margin([15,0,5,30])
    //.barWidth(20)

var plot = d3.select('.plot').datum([]).call(stationChart);

dispatcherStation.on('changestation',function(array){ 

    plot.datum(array)
        .call(stationChart)
})



//PATRICK'S GLOBAL VARIABLES
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

//END PATRICK'S GLOBAL VARIABLES

d3_queue.queue()
    .defer(d3.csv,'data/hubway_trips_reduced.csv', parse)
    .defer(d3.csv,'data/hubway_stations.csv', parseStations)
    .defer(d3.json, 'data/neighborhoods.json') //boston
    .defer(d3.json, 'data/camb_zipcode.json') //cambridge
    .defer(d3.json, 'data/somerville_wards.json') //sommerville
    .defer(d3.json, 'data/brookline_zips.json') //brookline
    .await(dataLoaded);

function dataLoaded(err, rows, stations, bos, cam, som, bro){


    //crossfilter and dimensions
    var cfStart = crossfilter(rows);
    var tripsByStart1 = cfStart.dimension(function(d){return d.startStation;}),
        tripsByTimeStart = cfStart.dimension(function(d){return d.startTimeT;});

    var cfEnd = crossfilter(rows);
    var tripsByEnd1 = cfEnd.dimension(function(d){return d.endStation;}),
        tripsByTimeEnd = cfEnd.dimension(function(d){return d.startTimeT;});


    //drop-down menu: choose station
    d3.select('.station').on('change',function(){
        console.log(this.value);
        //if(!this.value) tripsByStart1.filter(null);
        //else {tripsByStart1.filter(this.value);}

        //choose the station as start station
        var nestStart = d3.nest()
            .key(function(d){return d.endStation})
            .rollup(function(d){return d.length})  //rollup!!
            .entries(tripsByStart1.filter(this.value).top(Infinity));


        var cf2Start = crossfilter(nestStart);
        var topTripsStart = cf2Start.dimension(function(d){return d.values;}).top(10);
        console.log(topTripsStart);



        //choose the station as end station
        var nestEnd = d3.nest()
            .key(function(d){return d.startStation})
            .rollup(function(d){return d.length})  //rollup!!
            .entries(tripsByEnd1.filter(this.value).top(Infinity));

        var cf2End = crossfilter(nestEnd);
        var topTripsEnd = cf2End.dimension(function(d){return d.values;}).top(10);


        dispatcherStation.changestation(topTripsStart);

        //choose specific time span
        var morning = [new Date(0,0,0,6,0), new Date(0,0,0,12,0)],
            afternoon = [new Date(0,0,0,12,0), new Date(0,0,0,19,0)],
            evening = [new Date(0,0,0,19,0), new Date(0,0,0,24,0)];

        //when click button "start" or "end"
        d3.selectAll('.btn-group .station').on('click', function(){
            var id = d3.select(this).attr('id');
            if(id=='startstation'){
                dispatcherStation.changestation(topTripsStart);

                //when click button "morning", "afternoon" or "evening"
                d3.selectAll('.btn-group .time').on('click', function(){
                    var id = d3.select(this).attr('id');
                    if(id=='morning'){
                        
                        var topTripsStartMorning = timeDimension(tripsByTimeStart, morning);
                        console.log(topTripsStartMorning);
                        dispatcherStation.changestation(topTripsStartMorning);
                    }if(id=='afternoon'){
                        var topTripsStartAfternoon = timeDimension(tripsByTimeStart, afternoon);
                        console.log(topTripsStartAfternoon);
                        dispatcherStation.changestation(topTripsStartAfternoon);
                    }if(id=='evening'){
                        var topTripsStartEvening = timeDimension(tripsByTimeStart, evening);
                        console.log(topTripsStartEvening);
                        dispatcherStation.changestation(topTripsStartEvening);
                    }
                })

            }if(id=='endstation'){
                console.log(topTripsEnd);
                dispatcherStation.changestation(topTripsEnd);

                //when click button "morning", "afternoon" or "evening"
                d3.selectAll('.btn-group .time').on('click', function(){
                    var id = d3.select(this).attr('id');
                    if(id=='morning'){

                        var topTripsEndMorning = timeDimensionEnd(tripsByTimeEnd, morning);
                        console.log(topTripsEndMorning);
                        dispatcherStation.changestation(topTripsEndMorning);
                    }if(id=='afternoon'){
                        var topTripsEndAfternoon = timeDimensionEnd(tripsByTimeEnd, afternoon);
                        console.log(topTripsEndAfternoon);
                        dispatcherStation.changestation(topTripsEndAfternoon);
                    }if(id=='evening'){
                        var topTripsEndEvening = timeDimensionEnd(tripsByTimeEnd, evening);
                        console.log(topTripsEndEvening);
                        dispatcherStation.changestation(topTripsEndEvening);
                    }
                })
            }
        });

    })

    //PATRICK'S JS
    //APPEND NEIGHBORHOODS ON MAP
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
    //END OF NEIGHBORHOODS ON MAP

    //PLOT STATIONS ON MAP
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
        .on('click', set_station_num);

    //END OF STATIONS ON MAP

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


} //end of dataLoaded



function timeDimension(cfdimension, time){
    var tripsByTimeMorning = cfdimension.filter(time).top(Infinity);
    var nestTime = d3.nest()
        .key(function(d){return d.endStation})
        .rollup(function(d){return d.length})  //rollup!!
        .entries(tripsByTimeMorning);

    var cfTime = crossfilter(nestTime);
    var topTripsTime = cfTime.dimension(function(d){return d.values;}).top(10);

    return topTripsTime;
}


function timeDimensionEnd(cfdimension, time){
    var tripsByTimeMorning = cfdimension.filter(time).top(Infinity);
    var nestTime = d3.nest()
        .key(function(d){return d.startStation})
        .rollup(function(d){return d.length})  //rollup!!
        .entries(tripsByTimeMorning);

    var cfTime = crossfilter(nestTime);
    var topTripsTime = cfTime.dimension(function(d){return d.values;}).top(10);

    return topTripsTime;
}

//PATRICK'S FUNCTIONS
//
// CLICK TO GET INFO ON STATION
// now assign this console log to a global variable
//

function set_station_num (d) {

  selected_station = d.id;
  
  console.log(this);

  console.log(selected_station);
  
  //highlight map dot

  //NEEDS TO BE EDITED:
  dispatcherStation.station_select(id)

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



/*-------------------------- Parse data -----------------------*/
function parse(d){
    if(+d.duration<0) return;

    return {
        duration: +d.duration,
        startTime: parseDate(d.start_date),
        endTime: parseDate(d.end_date),
        startStation: d.strt_statn,
        endStation: d.end_statn,
        startTimeT: parseTime(d.start_date)
    }
}

function parseDate(date){
    var day = date.split(' ')[0].split('/'),
        time = date.split(' ')[1].split(':');

    return new Date(+day[2],+day[0]-1, +day[1], +time[0], +time[1]);
}

function parseTime(t){
    var time = t.split(' ')[1].split(':');

    return new Date(0, 0, 0, +time[0], +time[1]);
}

function parseStations(s){
    d3.select('.station')
        .append('option')
        .html(s.station)
        .attr('value', s.id);

    return {
        id: s.id,
        fullName: s.station,
        lngLat: [+s.lng, +s.lat]
    };
}
