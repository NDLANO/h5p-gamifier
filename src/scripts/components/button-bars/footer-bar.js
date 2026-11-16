import Util from '@services/util.js';
import DOMPurify from 'dompurify';
import './button-bar.scss';
import './footer-bar.scss';

/** @constant {string} CLASS_DISABLED Class for disabled buttons. */
const CLASS_DISABLED = 'h5p-gamifier-disabled';

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

    this.buttons.set('left', this.createNavigationButton({
      id: 'left',
      icon: 'previous',
      label: this.params.dictionary.get('l10n.previousContentLabel'),
      ariaLabel: this.params.dictionary.get('a11y.previousContent'),
      onClick: () => {
        this.callbacks.onClickButtonLeft();
      }
    }));

    this.buttons.set('right', this.createNavigationButton({
      id: 'right',
      icon: 'next',
      label: this.params.dictionary.get('l10n.nextContentLabel'),
      ariaLabel: this.params.dictionary.get('a11y.nextContent'),
      onClick: () => {
        this.callbacks.onClickButtonRight();
      }
    }));

    this.roundAnnouncer = document.createElement('div');
    this.roundAnnouncer.classList.add('h5p-gamifier-page-announcer');

    this.dom.appendChild(this.buttons.get('left'));
    this.dom.appendChild(this.roundAnnouncer);
    this.dom.append(this.params.statusContainers.getDOM());
    this.dom.appendChild(this.buttons.get('right'));

    this.setButtonTabbable('left');
  }

  /**
   * Create navigation button using H5P.Components.Button.
   * Disabled state is handled via aria-disabled instead of the native disabled
   * attribute in order to not lose keyboard focus while swiping.
   * @param {object} params Parameters.
   * @param {string} params.id Button id.
   * @param {string} params.icon H5P.Components icon name.
   * @param {string} params.label Visible label.
   * @param {string} params.ariaLabel Label for assistive technology and tooltip.
   * @param {function} params.onClick Click handler.
   * @returns {HTMLButtonElement} Button.
   */
  createNavigationButton(params = {}) {
    const button = H5P.Components.Button({
      label: DOMPurify.sanitize(params.label ?? ''),
      ariaLabel: params.ariaLabel,
      tooltip: params.ariaLabel,
      styleType: 'nav',
      icon: params.icon,
      classes: `h5p-gamifier-button-${params.id}`
    });

    button.addEventListener('click', () => {
      if (this.isButtonDisabled(button)) {
        return;
      }

      params.onClick();
    });

    this.setButtonDisabled(button, true);

    return button;
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
        button.setAttribute('tabindex', '0');
        button.focus();
      }
      else {
        button.setAttribute('tabindex', '-1');
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
   * Set disabled state of button.
   * @param {HTMLButtonElement} button Button.
   * @param {boolean} disabled If true, disable button. Else enable.
   */
  setButtonDisabled(button, disabled) {
    if (!button) {
      return;
    }

    button.classList.toggle(CLASS_DISABLED, disabled);
    button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  }

  /**
   * Determine whether button is disabled.
   * @param {HTMLButtonElement} button Button.
   * @returns {boolean} True, if button is disabled.
   */
  isButtonDisabled(button) {
    return button?.getAttribute('aria-disabled') === 'true';
  }

  /**
   * Enable button.
   * @param {string} id Button id.
   */
  enableButton(id = '') {
    this.setButtonDisabled(this.buttons.get(id), false);
  }

  /**
   * Disable button.
   * @param {string} id Button id.
   */
  disableButton(id = '') {
    this.setButtonDisabled(this.buttons.get(id), true);
  }

  /**
   * Show button.
   * @param {string} id Button id.
   */
  showButton(id = '') {
    this.buttons.get(id)?.classList.remove('display-none');
  }

  /**
   * Hide button.
   * @param {string} id Button id.
   */
  hideButton(id = '') {
    this.buttons.get(id)?.classList.add('display-none');
  }

  /**
   * Focus a button.
   * @param {string} id Button id.
   */
  focus(id = '') {
    this.buttons.get(id)?.focus();
  }
}
