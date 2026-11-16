import Button from './button.js';
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
      onClickButtonSettings: () => {},
      onClickButtonFinish: () => {},
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
            'h5p-gamifier-button-audio'
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

      const settingsButton = new Button(
        {
          a11y: {
            active: this.params.dictionary.get('a11y.settings'),
          },
          classes: [
            'h5p-gamifier-button',
            'h5p-gamifier-button-settings'
          ],
          type: 'pulse',
        },
        {
          onClick: () => {
            this.callbacks.onClickButtonSettings();
          }
        }
      );
      this.buttons.set('settings', settingsButton);
      buttonsContainer.append(this.buttons.get('settings').getDOM());
    }

    const finishButton = new Button(
      {
        a11y: {
          active: this.params.dictionary.get('a11y.finish')
        },
        classes: [
          'h5p-gamifier-button',
          'h5p-gamifier-button-finish'
        ],
        type: 'pulse',
      },
      {
        onClick: () => {
          this.callbacks.onClickButtonFinish();
        }
      }
    );
    this.buttons.set('finish', finishButton);
    buttonsContainer.append(finishButton.getDOM());

    if (this.params.hasFullscreen) {
      const fullscreenButton = new Button(
        {
          a11y: {
            active: this.params.dictionary.get('a11y.enterFullscreen'),
          },
          classes: [
            'h5p-gamifier-button',
            'h5p-gamifier-button-fullscreen'
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

    this.setButtonTabbable(this.buttons.keys().next().value);
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
    const ids = [...this.buttons.keys()];
    if (!ids.length) {
      return;
    }

    const currentIndex = Math.max(0, ids.indexOf(this.currentTabbableButton));

    let nextIndex;
    if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + ids.length) % ids.length;
    }
    else if (event.code === 'ArrowRight' || event.code === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % ids.length;
    }
    else if (event.code === 'Home') {
      nextIndex = 0;
    }
    else if (event.code === 'End') {
      nextIndex = ids.length - 1;
    }
    else {
      return;
    }

    this.setButtonTabbable(ids[nextIndex]);
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

  /**
   * Update fullscreen button to reflect fullscreen state.
   * @param {boolean} isFullscreen True, if in fullscreen mode.
   */
  setFullscreenState(isFullscreen) {
    const button = this.buttons.get('fullscreen');
    if (!button) {
      return;
    }

    button.getDOM().classList.toggle('exit', isFullscreen);
    button.setA11yLabel(this.params.dictionary.get(
      isFullscreen ? 'a11y.exitFullscreen' : 'a11y.enterFullscreen'
    ));
  }

  /**
   * Toggle solution mode styling.
   * @param {boolean} state If true, solution mode is on. Else off.
   */
  toggleSolutionMode(state) {
    this.dom.classList.toggle('solution-mode', state);
  }

  /**
   * Set active state of a (toggle) button without triggering its callback.
   * @param {string} id Button id.
   * @param {boolean} active If true, activate. Else deactivate.
   */
  setButtonActive(id = '', active) {
    if (active) {
      this.buttons.get(id)?.activate();
    }
    else {
      this.buttons.get(id)?.deactivate();
    }
  }
}
