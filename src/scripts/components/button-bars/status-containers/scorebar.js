import './scorebar.scss';

export default class Scorebar {

  constructor(params = {}) {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-gamifier-score-bar');
    this.dom.setAttribute('role', 'meter');
    this.dom.setAttribute('aria-label', params.dictionary?.get('a11y.score'));
    this.dom.setAttribute('aria-valuemin', '0');
    this.dom.setAttribute('aria-valuemax', params.maxValue?.toString());
    this.dom.setAttribute('aria-valuenow', '0');


    const fill = document.createElement('div');
    fill.classList.add('h5p-gamifier-score-bar-fill');
    this.dom.append(fill);
  }

  /**
   * Get scorebar DOM.
   * @returns {HTMLElement} Scorebar DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set value.
   * @param {number} value Value.
   * @param {number} maxValue Max value.
   */
  setValue(value, maxValue) {
    if (typeof value !== 'number' || isNaN(value) || value < 0) {
      return;
    }

    if (typeof maxValue !== 'number' || isNaN(maxValue) || maxValue <= 0) {
      return;
    }

    const percentage = (value / maxValue) * 100;
    const clampedValue = Math.min(Math.max(percentage, 0), 100);

    this.dom.setAttribute('aria-valuenow', value.toString());
    this.dom.style.setProperty('--fill-percentage', `${clampedValue}%`);
  }
}
