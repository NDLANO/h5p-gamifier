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
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
      onClickButtonAudio: () => {},
      onClickButtonFullscreen: () => {}
    }, callbacks);

    this.buttons = {};

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

    this.buttons.audio = new Button(
      {
        a11y: {
          active: this.params.dictionary.get('TODO'),
          disabled: this.params.dictionary.get('TODO'),
        },
        classes: [
          'h5p-gamifier-button',
          'h5p-gamifier-button-audio',
          'regular'
        ],
        type: 'pulse'
      },
      {
        onClick: () => {
          this.callbacks.onClickButtonAudio();
        }
      }
    );

    this.buttons.fullscreen = new Button(
      {
        a11y: {
          active: this.params.dictionary.get('a11y.TODO'),
          disabled: this.params.dictionary.get('a11y.TODO'),
        },
        classes: [
          'h5p-gamifier-button',
          'h5p-gamifier-button-fullscreen',
          'regular'
        ],
        type: 'pulse'
      },
      {
        onClick: () => {
          this.callbacks.onClickButtonFullscreen();
        }
      }
    );

    buttonsContainer.append(this.buttons.audio.getDOM());
    buttonsContainer.append(this.buttons.fullscreen.getDOM());

    this.setButtonTabbable('audio');
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
    this.currentTabbableButton = name;

    for (let key in this.buttons) {
      if (key === name) {
        this.buttons[key]?.setTabbable(true);
        this.buttons[key]?.focus();
      }
      else {
        this.buttons[key]?.setTabbable(false);
      }
    }
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
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].enable();
  }

  /**
   * Disable button.
   * @param {string} id Button id.
   */
  disableButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].disable();
  }

  /**
   * Show button.
   * @param {string} id Button id.
   */
  showButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].show();
  }

  /**
   * Hide button.
   * @param {string} id Button id.
   */
  hideButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].hide();
  }

  /**
   * Focus a button.
   * @param {string} id Button id.
   */
  focus(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].focus();
  }
}
