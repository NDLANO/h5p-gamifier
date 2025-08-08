import { animate } from '@services/animate.js';
import Util from '@services/util.js';
import './status-container.scss';

/** @constant {string} DISPLAY_INFINITY Default value for the status container */
const DISPLAY_INFINITY = '\u221e'; // Infinity symbol

/** Class representing a status container */
export default class StatusContainer {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      defaultValue: DISPLAY_INFINITY,
    }, params);

    this.callbacks = Util.extend({
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('status-container');
    this.dom.classList.add(`status-container-${params.id}`);

    const values = document.createElement('div');
    values.classList.add('status-container-values');
    this.dom.append(values);

    this.value = document.createElement('span');
    this.value.classList.add('value');
    values.append(this.value);

    if (params.hasMaxValue) {
      const delimiter = document.createElement('span');
      delimiter.classList.add('delimiter');
      delimiter.innerText = '/';
      values.append(delimiter);

      this.maxValue = document.createElement('span');
      this.maxValue.classList.add('max-value');
      values.append(this.maxValue);
    }

    if (params.hide) {
      this.hide();
    }

    this.setStatus({ value: params.value ?? this.params.defaultValue, maxValue: params.maxValue });
  }

  /**
   * Get container DOM.
   * @returns {HTMLElement} Container DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set score.
   * @param {object} params Parameters.
   */
  setStatus(params = {}) {
    if ((params.value ?? null) !== null) {
      if (
        typeof params.value === 'number' && params.value === Infinity ||
        params.value === 'Infinity'
      ) {
        params.value = DISPLAY_INFINITY;
        this.value.innerText = params.value.toString();
      }

      this.value.innerText = params.value;
    }

    if ((params.maxValue ?? null) !== null && this.maxValue) {
      this.maxValue.innerText = params.maxValue;
    }
  }

  /**
   * Show.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Animate.
   * @param {string|null} animationName Animation name, null to stop animation.
   */
  animate(animationName) {
    animate(this.dom, animationName);
  }
}
