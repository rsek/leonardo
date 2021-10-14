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
import {_theme} from './initialTheme';
import {updateParams} from './params';
import {
  getContrastRatios,
  getThemeData,
  getThemeName,
  getAllColorNames
} from './getThemeData';
import {
  randomId,
  throttle
} from './utils';
import {
  themeUpdateParams,
  toggleControls
} from './themeUpdate';
import {updateColorDots} from './colorDisc';
import {baseScaleOptions} from './createBaseScaleOptions';
import {showColorDetails} from './colorDetailsPanel';
import {themeRamp} from './ramps';
import {predefinedColorNames} from './predefinedColorNames';

function addColorScaleUpdate(c, k, s, r) {
  // if (!c) c = 'nameIsMissingSomewhere';
  addColorScale(c, k, s, r);
  themeUpdateParams();
}

function addColorScale(newColor, addToTheme = true) {
  // if first color item, just name it gray.
  let colorNameValue;
  const existingColorNames = getAllColorNames();
  let colorNameOptions = predefinedColorNames;

  if(!newColor) {
    if(_theme.colors.length == 0) colorNameValue = 'Gray';
    else {
      // First, filter out all existing used color names from available random names
      colorNameOptions = predefinedColorNames.filter(item => !existingColorNames.includes(item));
      colorNameValue = colorNameOptions[Math.floor(Math.random()*colorNameOptions.length)];
    }
    let ratios = getContrastRatios();
    if (ratios === undefined) ratios = [4.5]

    newColor = new Leo.BackgroundColor({
      name: colorNameValue,
      colorKeys: ['#cacaca'],
      colorspace: 'RGB',
      ratios: ratios,
      output: 'RGB'
    })
  } else {
    colorNameValue = newColor.name;
  }

  if(addToTheme) {
    _theme.addColor = newColor;
  }

  // create unique ID for color object
  let thisId = randomId();

  let wrapper = document.getElementById('themeColorWrapper');
  let emptyState = document.getElementById('themeColorEmptyState');
  // Remove empty state
  if(emptyState.classList.contains('is-hidden')) {
    // Do nothing
  } else {
    emptyState.classList.add('is-hidden');
  }

  // Create theme item
  let item = document.createElement('button');
  item.className = 'themeColor_item';
  item.id = thisId;

  // Create color gradient swatch
  let gradientSwatch = document.createElement('div');
  let gradientSwatchId = thisId.concat('_gradientSwatch');
  gradientSwatch.id = gradientSwatchId;
  gradientSwatch.className = 'gradientSwatch';

  // Color Name Input
  let colorName = document.createElement('div');
  colorName.className = 'spectrum-Form-item spectrum-Form-item--row';
  let colorNameInputWrapper = document.createElement('div');
  colorNameInputWrapper.className = 'spectrum-Textfield spectrum-Textfield--quiet colorNameInput';
  let colorNameInput = document.createElement('input');
  colorNameInput.type = 'text';
  colorNameInput.className = 'spectrum-Textfield-input';
  colorNameInput.id = thisId.concat('_colorName');
  colorNameInput.name = thisId.concat('_colorName');
  colorNameInput.value = newColor.name;

  // colorNameInput.onblur = throttle(themeUpdateParams, 10);
  colorNameInput.addEventListener('focus', (e) => {
    colorNameValue = e.target.value;
  })
  colorNameInput.addEventListener('change', (e) => {
    let newValue = e.target.value;
    _theme.updateColor = {color: colorNameValue, name: newValue}

    baseScaleOptions();
    colorNameValue = newValue;
  });
  colorNameInputWrapper.appendChild(colorNameInput)
  colorName.appendChild(colorNameInputWrapper);

  // Color scale type badge
  // let scaleType = document.createElement('div');
  // scaleType.className = 'spectrum-Badge spectrum-Badge--sizeS spectrum-Badge--neutral colorScaleType-badge';
  // scaleType.id = thisId.concat('_scaleTypeBadge');
  // scaleType.innerHTML = 'UI color'
  // scaleType.title = 'UI colors are used to generate swatches'

  // Actions
  let actions = document.createElement('div');
  actions.className = 'spectrum-ButtonGroup spectrum-Form-item spectrum-Form-item--row labelSpacer';
  let edit = document.createElement('button');
  edit.className = 'spectrum-ActionButton spectrum-ActionButton--sizeM spectrum-ActionButton--quiet';
  edit.id = `${thisId}-toggleConfig`;
  edit.title = "Show / hide configurations"
  edit.innerHTML = `
  <!-- <span class="spectrum-ActionButton-label">Add from URL</span> -->
  <svg xmlns:xlink="http://www.w3.org/1999/xlink" class="spectrum-Icon spectrum-Icon--sizeS" focusable="false" aria-hidden="true" aria-label="Add">
    <use xlink:href="#spectrum-icon-18-Edit" />
  </svg>`
  edit.addEventListener('click', showColorDetails);
  // edit.addEventListener('click', openEditColorScale) // TODO => create openEditColorScale function to open colors tab w/ settings of this object.
  let deleteColor = document.createElement('button');
  deleteColor.className = 'spectrum-ActionButton spectrum-ActionButton--sizeM spectrum-ActionButton--quiet';
  deleteColor.title = 'Delete color scale'
  deleteColor.id = thisId.concat('_delete');
  deleteColor.innerHTML = `
  <!-- <span class="spectrum-ActionButton-label">Add Color</span> -->
  <svg xmlns:xlink="http://www.w3.org/1999/xlink" class="spectrum-Icon spectrum-Icon--sizeS" focusable="false" aria-hidden="true" aria-label="Add">
    <use xlink:href="#spectrum-icon-18-Delete" />
  </svg>`;

  // actions.appendChild(scaleType);
  actions.appendChild(edit);
  actions.appendChild(deleteColor);

  colorName.appendChild(actions);
  item.appendChild(gradientSwatch);
  item.appendChild(colorName);

  wrapper.appendChild(item);

  let rampData = newColor.backgroundColorScale;
  let colors = rampData;

  themeRamp(colors, gradientSwatchId, '45');
  toggleControls();
  if (addToTheme) {
    baseScaleOptions();
  }

  document.getElementById(thisId.concat('_colorName')).addEventListener('input', baseScaleOptions);
  // document.getElementById(thisId.concat('_delete')).addEventListener('click', themeDeleteItem);

  // deleteColor.addEventListener('click', );
  deleteColor.addEventListener('click', function(e){ 
    themeDeleteItem(e);
    _theme.removeColor = newColor;
    
    themeUpdateParams();
  });
  // console.log(_theme)
}

// Deletes a Color class from Theme
function themeDeleteItem(e) {
  let id = e.target.parentNode.parentNode.parentNode.id;
  let self = document.getElementById(id);

  self.remove();
  baseScaleOptions();
  // toggleControls();

  // themeUpdateParams();

  let items = document.getElementsByClassName('themeColor_item');
  if(items.length == 0) {
    clearParams();

    document.documentElement.style
      .setProperty('--theme-background', '#f5f5f5');
  }
}

window.addColorScale = addColorScale;
window.addColorScaleUpdate = addColorScaleUpdate;
window.themeDeleteItem = themeDeleteItem;

module.exports = {
  addColorScale,
  addColorScaleUpdate,
  themeDeleteItem
}