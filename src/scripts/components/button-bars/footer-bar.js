import Button from './button.js';
import Util from '@services/util.js';
import DOMPurify from 'dompurify';
import './button-bar.scss';
import './footer-bar.scss';

export default class FooterBar {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {string} [params.position] Extra borders.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onClickButtonLeft] Callback for left button.
   * @param {function} [callbacks.onClickButtonRight] Callback for right button.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
      onClickButtonLeft: () => {},
      onClickButtonRight: () => {}
    }, callbacks);

    this.buttons = new Map();

    // Build DOM
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-gamifier-button-bar');
    this.dom.classList.add('footer');
    this.dom.setAttribute('role', 'toolbar');

    this.dom.setAttribute('aria-label', this.params.dictionary.get('a11y.navigationBottom'));

    this.dom.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });

    this.buttons.set('left', new Button(
      {
        a11y: {
          active: this.params.dictionary.get('a11y.previousContent'),
        },
        classes: [
          'h5p-gamifier-button',
          'h5p-gamifier-button-left',
          'plain'
        ],
        disabled: true,
        type: 'pulse'
      },
      {
        onClick: () => {
          this.callbacks.onClickButtonLeft();
        }
      }
    ));

    this.buttons.set('right', new Button(
      {
        a11y: {
          active: this.params.dictionary.get('a11y.nextContent'),
        },
        classes: [
          'h5p-gamifier-button',
          'h5p-gamifier-button-right',
          'plain'
        ],
        disabled: true,
        type: 'pulse'
      },
      {
        onClick: () => {
          this.callbacks.onClickButtonRight();
        }
      }
    ));

    this.roundAnnouncer = document.createElement('div');
    this.roundAnnouncer.classList.add('h5p-gamifier-page-announcer');

    this.dom.appendChild(this.buttons.get('left').getDOM());
    this.dom.appendChild(this.roundAnnouncer);
    this.dom.append(this.params.statusContainers.getDOM());
    this.dom.appendChild(this.buttons.get('right').getDOM());

    this.setButtonTabbable('left');
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set round announcer text.
   * @param {string} html Round announcer text.
   */
  setAnnouncerText(html) {
    this.roundAnnouncer.innerHTML = DOMPurify.sanitize(
      html, { USE_PROFILES: { html: true } }
    );
  }

  /**
   * Set button tabbable.
   * @param {string} name Name of the button.
   */
  setButtonTabbable(name) {
    this.currentTabbableButton = name;

    this.buttons.forEach((button, key) => {
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
        this.currentTabbableButton === 'right') {
        this.setButtonTabbable('left');
      }
      else {
        this.setButtonTabbable('right');
      }
    }
    else if (event.code === 'ArrowRight' || event.code === 'ArrowDown') {
      if (this.currentTabbableButton === 'left') {
        this.setButtonTabbable('right');
      }
      else {
        this.setButtonTabbable('left');
      }
    }
    else if (event.code === 'Home') {
      this.setButtonTabbable('left');
    }
    else if (event.code === 'End') {
      this.setButtonTabbable('right');
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
