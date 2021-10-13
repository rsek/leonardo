/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import * as Leo from '@adobe/leonardo-contrast-colors';
import * as d3 from './d3';
import {
   convertColorValue,
   makePowScale,
   removeDuplicates,
   round,
   findMatchingLuminosity
 } from './utils';
const chroma = require('chroma-js');
const { extendChroma } = require('./chroma-plus');

extendChroma(chroma);

class SequentialScale {
  constructor({ 
    swatches,
    colorKeys,
    colorspace,
    smooth,
    shift,
    output,
    correctLightness
   }) {
    this._swatches = swatches,
    this._colorKeys = this._sortColorKeys(colorKeys);
    this._colorspace = colorspace;
    this._shift = shift;
    this._smooth = smooth;
    this._output = output;
    this._correctLightness = correctLightness;
    this._colors = this._createColorScale();
    // this._luminosities = this._getColorLuminosities();
    this._domains = this._getDomains();
  }

  set colorKeys(colors) {
    this._colorKeys = this._sortColorKeys(colors);
    this._colors = null;
    this._colors = this._createColorScale();
    // this._luminosities = this._getColorLuminosities();
    this._domains = this._getDomains()
  }

  get colorKeys() {
    return this._colorKeys;
  }
  
  set colorspace(colorspace) {
    this._colorspace = colorspace;
    this._colors = null;
    this._colors = this._createColorScale();
  }

  get colorspace() {
    return this._colorspace;
  }

  set smooth(smooth) {
    this._smooth = smooth;
    this._colors = null;
    this._colors = this._createColorScale();
  }

  get smooth() {
    return this._smooth;
  }

  set output(output) {
    this._output = output;
    this._colors = null;
    this._colors = this._createColorScale();
  }

  get output() {
    return this._output;
  }

  set shift(shift) {
    this._shift = Number(shift);
    this._colors = null;
    this._colors = this._createColorScale();
    this._domains = this._getDomains();
  }

  get shift() {
    return Number(this._shift);
  }

  set swatches(swatches) {
    this._swatches = swatches;
    this._colors = null;
    this._colors = this._createColorScale();
  }

  get swatches() {
    return this._swatches;
  }

  get colors() {
    return this._colors;
  }

  get luminosities() {
    return this._luminosities;
  }

  get domains() {
    return this._domains;
  }

  get colorFunction() {
    return this._colorFunction;
  }

  set correctLightness(boolean) {
    this._correctLightness = boolean;
    this._colors = null;
    this._colors = this._createColorScale();
  }

  _sortColorKeys(colors) {
    let lumsObj = colors.map((c) => {
      return {
        color: c,
        lum: d3.hsluv(c).v
      }
    });
    lumsObj.sort((a, b) => (a.lum < b.lum) ? 1 : -1)
    // keep the sorted luminosities
    this._luminosities = lumsObj.map((c) => c.lum);

    return lumsObj.map((c) => c.color);
  }

  _createColorScale() {
    let colorScale;
    if(this._correctLightness) {
      let initialColorScale = Leo.createScale({
        swatches: 300,
        colorKeys: this._colorKeys,
        colorspace: this._colorspace,
        shift: this._shift,
        smooth: this._smooth,
        fullScale: false,
        asFun: true
      });

      const minLum = Math.min(...this._luminosities);
      const maxLum = Math.max(...this._luminosities);
      const percMax = maxLum - minLum;

      const fillRange = (start, end) => {
        return Array(end - start).fill().map((item, index) => start + index);
      };
      let dataX = fillRange(0, 100);
      dataX = dataX.map((x) => (x === 0) ? 0 : x/100)
      dataX.push(1)
      let newLums = dataX.map((i) => round((percMax * i) + minLum, 2));

      const newColors = findMatchingLuminosity(initialColorScale, 300, newLums, this._smooth);
      let filteredColors = newColors.filter(function(x) {
        return x !== undefined;
      });

      const lastColorIndex = filteredColors.length-1;

      // Manually ensure first and last user-input key colors
      // are part of new key colors array being passed to the
      // new color scale.
      const first = (this._smooth) ? chroma(initialColorScale(300)): initialColorScale(300);
      const last = (this._smooth) ? chroma(initialColorScale(0)): initialColorScale(0);
      filteredColors
        .splice(0, 1, first.hex());
      filteredColors
        .splice(lastColorIndex, 1)
      filteredColors
        .splice((lastColorIndex), 1, last.hex())

      this._colorFunction = Leo.createScale({
        swatches: this._swatches,
        colorKeys: filteredColors,
        colorspace: this._colorspace,
        shift: this._shift,
        smooth: false,
        fullScale: false,
        asFun: true
      });

      colorScale = Leo.createScale({
        swatches: this._swatches,
        colorKeys: filteredColors,
        colorspace: this._colorspace,
        shift: this._shift,
        smooth: false,
        fullScale: false,
        asFun: false
      });
    } else {
      this._colorFunction = Leo.createScale({
        swatches: this._swatches,
        colorKeys: this._colorKeys,
        colorspace: this._colorspace,
        shift: this._shift,
        smooth: false,
        fullScale: false,
        asFun: true
      });

      colorScale = Leo.createScale({
        swatches: this._swatches,
        colorKeys: this._colorKeys,
        colorspace: this._colorspace,
        shift: this._shift,
        smooth: this._smooth,
        fullScale: false,
        asFun: false
      });
    }

    let formattedColors = colorScale.map((c) => {return convertColorValue(c, this._output)});
    formattedColors.reverse();
    return formattedColors;
  }

  _getDomains() {
    const lums = this._luminosities;

    const min = Math.min(...lums);
    const max = Math.max(...lums);  
    const inverseShift = 1 / Number(this._shift);
    const percLums = lums.map((l) => {
      let perc = (l - min) / (max - min);
      if(l === 0 || isNaN(perc)) return 0;
      else return perc;
    })
    let sqrtDomains = makePowScale(Number(inverseShift));

    let domains = percLums.map((d) => {return sqrtDomains(d)})
    domains.sort((a, b) => b - a)
    return domains;
  }
}

class DivergingScale {
  constructor({ 
    swatches,
    startKeys,
    endKeys,
    middleKey,
    colorspace,
    smooth,
    shift,
    output,
    correctLightness
   }) {
    this._swatches = swatches,
    this._startKeys = startKeys;
    this._endKeys = endKeys;
    this._middleKey = middleKey;
    this._colorspace = colorspace;
    this._shift = shift;
    this._smooth = smooth;
    this._output = output;
    this._correctLightness = correctLightness;
    // this._luminosities = this._getColorLuminosities();
    // this._domains = this._getDomains();

    this._startScale = new SequentialScale({
      swatches: this._swatches,
      colorKeys: this._startKeys,
      colorspace: this._colorspace,
      smooth: this._smooth,
      shift: this._shift,
      correctLightness: this._correctLightness,
      output: this._output
    });
    this._endScale = new SequentialScale({
      swatches: this._swatches,
      colorKeys: this._endKeys,
      colorspace: this._colorspace,
      smooth: this._smooth,
      shift: this._shift,
      correctLightness: this._correctLightness,
      output: this._output
    });
    this._colors = this._createColorScale();
  }

  set startKeys(colors) {
    this._startKeys = colors;
    this._colors = null;
    this._colors = this._createColorScale();
  }

  get startKeys() {
    return this._startKeys;
  }

  set endKeys(colors) {
    this._endKeys = colors;
    this._colors = null;
    this._colors = this._createColorScale();
  }

  get endKeys() {
    return this._endKeys;
  }

  set middleKey(color) {
    this._middleKey = color;
    this._colors = null;
    this._colors = this._createColorScale();
  }

  get middleKey() {
    return this._middleKey;
  }
  
  set colorspace(colorspace) {
    this._colorspace = colorspace;
    this._startColor.colorspace = colorspace;
    this._endColor.colorspace = colorspace;

    this._colors = null;
    this._colors = this._createColorScale();
  }

  get colorspace() {
    return this._colorspace;
  }

  set smooth(smooth) {
    this._smooth = smooth;
    this._startColor.smooth = smooth;
    this._endColor.smooth = smooth;

    this._colors = null;
    this._colors = this._createColorScale();
  }

  get smooth() {
    return this._smooth;
  }

  set output(output) {
    this._output = output;
    this._startColor.output = output;
    this._endColor.output = output;

    this._colors = null;
    this._colors = this._createColorScale();
  }

  get output() {
    return this._output;
  }

  set shift(shift) {
    this._shift = Number(shift);
    this._startColor.shift = shift;
    this._endColor.shift = shift;

    this._colors = null;
    this._colors = this._createColorScale();
    this._domains = this._getDomains();
  }

  get shift() {
    return Number(this._shift);
  }

  set swatches(swatches) {
    this._swatches = swatches;
    this._startColor.swatches = swatches;
    this._endColor.swatches = swatches;

    this._colors = null;
    this._colors = this._createColorScale();
  }

  get swatches() {
    return this._swatches;
  }

  get colors() {
    return this._colors;
  }

  get luminosities() {
    return this._luminosities;
  }

  get domains() {
    return this._domains;
  }

  get colorFunction() {
    return this._colorFunction;
  }

  set correctLightness(boolean) {
    this._correctLightness = boolean;
    this._startColor.correctLightness = boolean;
    this._endColor.correctLightness = boolean;

    this._colors = null;
    this._colors = this._createColorScale();
  }

  get colors() {
    return this._colors;
  }

  _createColorScale() {
    const startColors = this._startScale.colors;
    const endColors = this._endScale.colors.reverse();
    let newColors = [...startColors, ...endColors]
    return newColors
  }
}

let _sequentialScale = new SequentialScale({
  swatches: 100,
  colorKeys: ['#000000', '#cacaca'],
  colorspace: 'CAM02p',
  smooth: false,
  shift: 1,
  correctLightness: true,
  output: 'RGB'
})
let _divergingScale = new DivergingScale({
  swatches: 100,
  startKeys: ['#5c3cec', '#9eecff'],
  endKeys: ['ffca9e', '#700036'],
  middleKey: '#e7f3f3',
  colorspace: 'CAM02p',
  smooth: false,
  shift: 1,
  correctLightness: true,
  output: 'RGB'
})

window._sequentialScale = _sequentialScale;
window._divergingScale = _divergingScale;

module.exports = {
  _sequentialScale,
  _divergingScale
}