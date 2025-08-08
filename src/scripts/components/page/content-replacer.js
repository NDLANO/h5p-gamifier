import Util from '@services/util.js';
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

  getDOM() {
    return this.dom;
  }

  update(params = {}) {
    if (params.icon) {
      this.setIcon(params.icon);
    }

    if (params.text) {
      this.setText(params.text);
    }
  }

  setIcon(iconClass) {
    if (typeof iconClass !== 'string') {
      return;
    }

    this.iconContainer.className = ICON_CLASS;
    this.iconContainer.classList.add(iconClass);
  }

  setText(text) {
    if (typeof text !== 'string') {
      text = '';
    }

    this.textContainer.textContent = text;
  }

  show() {
    this.dom.classList.remove('display-none');
  }

  hide() {
    this.dom.classList.add('display-none');
  }
}
