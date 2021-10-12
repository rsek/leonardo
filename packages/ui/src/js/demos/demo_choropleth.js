import d3 from '../d3';
import {_sequentialScale} from '../initialColorScales';

function choropleth(scaleType) {
  const colorClass = (scaleType === 'sequential') ? _sequentialScale : _divergingScale;
  const originalSwatches = colorClass.swatches;
  colorClass.swatches = 7;
  // The svg
  var margin = {top: 30, right: 30, bottom: 30, left: 30},
  width = 800 - margin.left - margin.right,
  height = 250 - margin.top - margin.bottom;

  var svg = d3.select(`#${scaleType}Choropleth`)
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    // .attr("transform",
    //       "translate(" + margin.left + "," + margin.top + ")");


  // Map and projection
  const path = d3.geoPath();
  const projection = d3.geoMercator()
  .scale(60)
  .center([0,30])
  .translate([width / 3.5, height / 1.75]);

  // Data and color scale
  let data = new Map()
  const colorScale = d3.scaleThreshold()
  .domain([100000, 1000000, 10000000, 30000000, 100000000, 500000000])
  .range(colorClass.colors);
  // const colorScale = colorClass.colorFunction;

  // Load external data and boot
  Promise.all([
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
    d3.csv("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world_population.csv", function(d) {
        data.set(d.code, +d.pop)
    })
    ]).then(function(loadData){
      let topo = loadData[0]

      // Draw the map
      svg.append("g")
        .selectAll("path")
        .data(topo.features)
        .join("path")
          // draw each country
          .attr("d", d3.geoPath()
            .projection(projection)
          )
          // set the color of each country
          .attr("fill", function (d) {
            d.total = data.get(d.id) || 0;
            return colorScale(d.total);
          })
        }
    )

    
  colorClass.swatches = originalSwatches;
}

module.exports = {
  choropleth
}