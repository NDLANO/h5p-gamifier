import Button from './button.js';
import StatusContainers from './status-containers/status-containers.js';
import Util from '@services/util.js';
import './button-bar.scss';
import './header-bar.scss';

export default class HeaderBar {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {string} [params.position] Extra borders.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onClickButtonAudio: () => {},
      onClickButtonFullscreen: () => {}
    }, callbacks);

    this.buttons = new Map();

    // Build DOM
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-gamifier-button-bar');
    this.dom.classList.add('header');
    this.dom.setAttribute('role', 'toolbar');
    this.dom.setAttribute('aria-label', this.params.dictionary.get('a11y.navigationTop'));

    this.dom.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });

    this.dom.append(this.params.statusContainers.getDOM());

    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('h5p-gamifier-buttons-container');
    this.dom.append(buttonsContainer);

    if (this.params.hasAudio) {
      const audioButton = new Button(
        {
          a11y: {
            active: this.params.dictionary.get('a11y.mute'),
            inactive: this.params.dictionary.get('a11y.unmute')
          },
          classes: [
            'h5p-gamifier-button',
            'h5p-gamifier-button-audio',
            'regular'
          ],
          type: 'toggle'
        },
        {
          onClick: (options) => {
            this.callbacks.onClickButtonAudio(options.active);
          }
        }
      );

      this.buttons.set('audio', audioButton);

      buttonsContainer.append(audioButton.getDOM());
    }

    if (this.params.hasFullscreen) {
      const fullscreenButton = new Button(
        {
          a11y: {
            active: this.params.dictionary.get('a11y.TODO'),
          },
          classes: [
            'h5p-gamifier-button',
            'h5p-gamifier-button-fullscreen',
            'regular'
          ],
          type: 'pulse',
        },
        {
          onClick: () => {
            this.callbacks.onClickButtonFullscreen();
          }
        }
      );

      this.buttons.set('fullscreen', fullscreenButton);
      buttonsContainer.append(this.buttons.get('fullscreen').getDOM());
    }

    this.setButtonTabbable(this.buttons.keys()[0]);
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set button tabbable.
   * @param {string} name Name of the button.
   */
  setButtonTabbable(name) {
    if (!this.buttons.has(name)) {
      return; // Button not available
    }

    this.currentTabbableButton = name;

    this.buttons.foreEach((button, key) => {
      if (key === name) {
        button.setTabbable(true);
        button.focus();
      }
      else {
        button.setTabbable(false);
      }
    });
  }

  /**
   * Handle key down.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeydown(event) {
    if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') {
      if (
        this.currentTabbableButton === 'fullscreen') {
        this.setButtonTabbable('audio');
      }
      else {
        this.setButtonTabbable('fullscreen');
      }
    }
    else if (event.code === 'ArrowRight' || event.code === 'ArrowDown') {
      if (this.currentTabbableButton === 'audio') {
        this.setButtonTabbable('fullscreen');
      }
      else {
        this.setButtonTabbable('audio');
      }
    }
    else if (event.code === 'Home') {
      this.setButtonTabbable('audio');
    }
    else if (event.code === 'End') {
      this.setButtonTabbable('fullscreen');
    }
    else {
      return;
    }

    event.preventDefault();
  }

  /**
   * Enable button.
   * @param {string} id Button id.
   */
  enableButton(id = '') {
    this.buttons.get(id)?.enable();
  }

  /**
   * Disable button.
   * @param {string} id Button id.
   */
  disableButton(id = '') {
    this.buttons.get(id)?.disable();
  }

  /**
   * Show button.
   * @param {string} id Button id.
   */
  showButton(id = '') {
    this.buttons.get(id)?.show();
  }

  /**
   * Hide button.
   * @param {string} id Button id.
   */
  hideButton(id = '') {
    this.buttons.get(id)?.hide();
  }

  /**
   * Focus a button.
   * @param {string} id Button id.
   */
  focus(id = '') {
    this.buttons.get(id)?.focus();
  }
}
