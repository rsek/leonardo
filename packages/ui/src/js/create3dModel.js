/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
import d3 from './d3';
import Plotly from 'plotly.js-dist-min'
import {getThemeName} from './getThemeData';
import {
  filterNaN,
  convertToCartesian
} from './utils'
import { createHtmlElement } from './createHtmlElement';

function create3dModel(dest, colorClasses, mode, scaleType = 'theme') {
  // Force colorClasses to be an array if it was erroneously passed
  // as a single color class.
  if(!Array.isArray(colorClasses)) colorClasses = [colorClasses];

  // Hide all example images
  if(scaleType === 'theme') {
    let images = document.getElementsByClassName('ModelImage');
    for(let i=0; i<images.length; i++) {
      if (!images[i].classList.contains('is-hidden')) images[i].classList.add('is-hidden')
    }
  }



  var pointCount = 3142;
  var i, r;

  var x = [];
  var y = [];
  var z = [];
  var c = [];

  for(i = 0; i < pointCount; i++)
  {
      r = i * (pointCount - i);
      x.push(r * Math.cos(i / 30));
      y.push(r * Math.sin(i / 30));
      z.push(i);
      c.push(i)
  }

  const data = createColorData(colorClasses, mode, scaleType);

  const colorWay =  colorClasses.map((c) => {return c.colorKeys[0]});
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const downloadFileName = (scaleType === 'theme') ? `${getThemeName()}_3dModel` : `${scaleType}Scale_3dModel`;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const height = (dest === 'paletteModelWrapper') ?  windowHeight - 120 : windowHeight - 236;
  const width = windowWidth - 424; // Fit to window, minus panel and padding
  
  const canvasColor = (mq.matches) ? '#1d1d1d' : '#f5f5f5'

  const layout = {
    colorway: colorWay,
    autosize: true,
    height: height,
    width: width,
    showLegend: false,
    showscale: false,
    margin: {
      l: 24,
      r: 24,
      b: 24,
      t: 24,
      pad: 0
    },
    paper_bgcolor: canvasColor,
    scene: { 
      camera: {
        eye: {
          x: 1,
          y: 1,
          z: 2 
        },
        projection: {
          type: 'orthographic'
        }
      },
      aspectmode: 'data', // data matches the dataset, cube forces into a cube shape
      // aspectratio: {x: 1, y: 1, z: 1},
      xaxis: {
        nticks: 5,
        title: '',
        showspikes: false,
        showgrid: false
      },
      yaxis: {
        nticks: 5,
        title: '',
        showspikes: false,
        showgrid: false
      },
      zaxis: {
        nticks: 5,
        title: 'Luminosity',
        showspikes: false,
        showgrid: false
      }
    }
  };

  const config = {
    toImageButtonOptions: {
      format: 'svg', // one of png, svg, jpeg, webp
      filename: downloadFileName,
      height: 700,
      width: 700,
      scale: 1 // Multiply title/legend/axis/canvas sizes by this factor
    },
    displayModeBar: true,
    modeBarButtonsToRemove: [
      'orbitRotation',
      // 'resetCameraLastSave3d'
    ],
    displaylogo: false,
    responsive: true
  };

  // Create 3d plot
  Plotly.newPlot(
    dest, 
    data,
    layout,
    config);

  // Then, display example image based on the selected mode.
  if(scaleType === 'theme') {
    let modelMode = (mode === 'CAM02') ? 'LAB' : ((mode === 'CAM02p') ? 'LCH' : ((mode === 'HSLuv') ? 'LUV' : mode))
    let image = document.getElementById(`ModelImage_${modelMode}`);
    image.classList.remove('is-hidden');
  }
}



function createColorData(colorClasses, mode, scaleType) {
  const f = getChannelsAndFunction(mode);
  const method = (d) => d3[f.func](d);
  let dataArray = [];

  for(let i = 0; i < colorClasses.length; i++) {
    let currentColor = (!scaleType || scaleType === 'theme') ? colorClasses[i].backgroundColorScale : colorClasses[i].colors;

    let dataA = currentColor.map(function(d) {
      let channelValue = method(d)[f.c1];
      // Need to do some geometry for polar colorspaces
      if(mode === 'CAM02p' || mode === 'LCH' || mode === 'HSL' || mode === 'HSV' || mode === 'HSLuv') {
        let s = (mode === 'HSL' || mode === 'HSV') ? method(d)[f.c2] * 100 : method(d)[f.c2];
        let h = channelValue;
        return filterNaN(convertToCartesian(s, h).x);
      }
      else return filterNaN(channelValue);
    });
    let dataB = currentColor.map(function(d) {
      let channelValue = method(d)[f.c3];
      if(mode === 'HSL' || mode === 'HSV') channelValue = channelValue * 100;
      return filterNaN(channelValue);
    });
    let dataC = currentColor.map(function(d) {
      let channelValue = method(d)[f.c2];
      // Need to do some geometry for polar colorspaces
      if(mode === 'CAM02p' || mode === 'LCH' || mode === 'HSL' || mode === 'HSV' || mode === 'HSLuv') {
        let s = (mode === 'HSL' || mode === 'HSV') ? channelValue * 100 : channelValue;
        let h = method(d)[f.c1];
        return filterNaN(convertToCartesian(s, h).y);
      }
      return filterNaN(channelValue);
    });

    let dataObj = {
        type: 'scatter3d',
        mode: 'lines',
        x: dataA,
        y: dataC,
        z: dataB,
        name: colorClasses[i].name,
        opacity: 1,
        markercolor: 'red',
        line: {
          width: 16,
          color: currentColor
        }
      }
      dataArray.push(dataObj)
  }

  return dataArray;
}

function getChannelsAndFunction(mode) {
  let c1, c2, c3, func;
  if(mode === 'RGB') {
    func = 'rgb';
    c1 = 'r';
    c2 = 'g';
    c3 = 'b';
  }
  else if(mode === 'LAB') {
    func = 'lab';
    c1 = 'a';
    c2 = 'b';
    c3 = 'l';
  }
  else if(mode === 'LCH') {
    func = 'lch';
    c1 = 'h';
    c2 = 'c';
    c3 = 'l';
  }
  else if(mode === 'CAM02') {
    func = 'jab';
    c1 = 'a';
    c2 = 'b';
    c3 = 'J';
  }
  else if(mode === 'CAM02p') {
    func = 'jch';
    c1 = 'h';
    c2 = 'C';
    c3 = 'J';
  }
  else if(mode === 'HSL') {
    func = 'hsl';
    c1 = 'h';
    c2 = 's';
    c3 = 'l';
  }
  else if(mode === 'HSLuv') {
    func = 'hsluv';
    c1 = 'l';
    c2 = 'u';
    c3 = 'v';
  }
  else if(mode === 'HSV') {
    func = 'hsv';
    c1 = 'h';
    c2 = 's';
    c3 = 'v';
  }

  return {
    func: func,
    c1: c1,
    c2: c2,
    c3: c3
  }
}

module.exports = {
  create3dModel
}