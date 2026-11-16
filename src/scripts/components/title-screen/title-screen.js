import Util from '@services/util.js';
import './title-screen.scss';

export default class TitleScreen {
  /**
   * Title screen based on H5P.Components.CoverPage.
   * @class
   * @param {object} [params] Parameters.
   * @param {string} params.title Title.
   * @param {string} [params.introduction] Introduction (HTML).
   * @param {string} [params.imageSrc] Image source URL.
   * @param {string} [params.imageAlt] Image alternative text.
   * @param {string} params.buttonLabel Start button label.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onStart] Callback when start button was clicked.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onStart: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-gamifier-title-screen');

    this.dom.append(H5P.Components.CoverPage({
      title: this.params.title,
      description: this.params.introduction,
      img: this.params.imageSrc,
      imgAlt: this.params.imageAlt,
      buttonLabel: this.params.buttonLabel,
      buttonOnClick: (event) => {
        event?.preventDefault();
        this.callbacks.onStart();
      }
    }));
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Title screen DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show title screen.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide title screen.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Focus start button.
   */
  focus() {
    this.dom.querySelector('.h5p-theme-button')?.focus();
  }
}
