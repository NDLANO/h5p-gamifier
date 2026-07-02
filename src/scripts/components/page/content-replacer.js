import Util from '@services/util.js';
import { animate } from '@services/animate.js';
import './content-replacer.scss';

const ICON_CLASS = 'h5p-content-replacer-icon';

export default class ContentReplacer {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {HTMLElement} params.target Target element to replace.
   * @param {object} params.libraryParams Library parameters for content.
   */
  constructor(params = {}) {
    this.params = Util.extend({
    }, params);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-content-replacer');

    this.iconContainer = document.createElement('div');
    this.iconContainer.classList.add(ICON_CLASS);
    this.dom.append(this.iconContainer);

    this.textContainer = document.createElement('div');
    this.textContainer.classList.add('h5p-content-replacer-text');
    this.dom.append(this.textContainer);
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Content replacer DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Update content replacer.
   * @param {object} [params] Parameters.
   * @param {string} [params.icon] Icon class.
   * @param {string} [params.text] Text to display.
   */
  update(params = {}) {
    if (params.icon) {
      this.setIcon(params.icon);
    }

    if (params.text) {
      this.setText(params.text);
    }
  }

  /**
   * Set icon.
   * @param {string} iconClass Icon class.
   */
  setIcon(iconClass) {
    if (typeof iconClass !== 'string') {
      return;
    }

    this.iconContainer.className = ICON_CLASS;
    this.iconContainer.classList.add(iconClass);
  }

  /**
   * Set text.
   * @param {string} text Text.
   */
  setText(text) {
    if (typeof text !== 'string') {
      text = '';
    }

    this.textContainer.textContent = text;
  }

  /**
   * Show content replacer.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide content replacer.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Animate content replacer.
   */
  animate() {
    animate(this.dom, 'wobble');
  }
}
