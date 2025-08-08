import Util from '@services/util.js';
import ContentReplacer from './content-replacer.js';
import H5PContent from './h5p-content.js';
import Timer from '@services/timer.js';
import './page.scss';

export default class Page {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {number} params.index Index of page.
   * @param {object} params.libraryParams Library parameters for content.
   * @param {object} [params.dictionary] Dictionary for content.
   * @param {object} [params.globals] Global parameters for content.
   * @param {number} [params.attemptsMax] Maximum number of attempts.
   * @param {number} [params.timeMax] Maximum time in seconds.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onTick] Callback on tick.
   * @param {function} [callbacks.onExpired] Callback on expiration.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      libraryParams: {}
    }, params);

    this.callbacks = Util.extend({
      onTimerTick: () => {},
      onTimeExpired: () => {},
      onScoreChanged: () => {},
      onAttemptsExceeded: () => {},
    }, callbacks);

    const previousState = this.params.globals.get('extras').previousState?.children?.[this.params.index];

    this.attemptsLeft = typeof previousState?.attemptsLeft === 'number' ?
      previousState?.attemptsLeft :
      this.params.attemptsMax ?? Infinity;

    this.timeLeft = typeof previousState?.timeLeft === 'number' ?
      previousState?.timeLeft :
      (this.params.timeMax ?? Infinity) * 1000;

    this.isShowingState = false;
    this.nextTransitionId = 0;
    this.transitionCallbacks = {};

    if (this.timeLeft !== Infinity && this.timeLeft > 0) {
      this.timer = new Timer(
        { interval: 500 },
        {
          onTick: () => {
            this.timeLeft = this.timer.getTime();
            if (!this.isShowing()) {
              return;
            }

            this.callbacks.onTimerTick(this.params.index);
          },
          onExpired: () => {
            this.timeLeft = 0;
            this.callbacks.onTimeExpired(this.params.index);
          }
        }
      );
    }

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-gamifier-page');
    this.setPosition(1); // 1 = Future to allow initial slide in from right

    this.h5pContent = new H5PContent(
      {
        dictionary: params.dictionary,
        globals: params.globals,
        index: params.index,
        libraryParams: params.libraryParams
      },
      {
        onScored: (event = {}) => {
          if (!event.success) {
            this.attemptsLeft--;
          }

          this.callbacks.onScoreChanged(this.params.index);

          if (this.attemptsLeft <= 0) {
            this.callbacks.onAttemptsExceeded(this.params.index);
          }
        }
      }
    );
    this.dom.append(this.h5pContent.getDOM());

    this.title = this.h5pContent.getTitle();

    this.contentReplacer = new ContentReplacer();
    this.contentReplacer.hide();
    this.dom.append(this.contentReplacer.getDOM());
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Content DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Update page.
   * @param {object} [params] Parameters.
   */
  update(params = {}) {
    if (typeof params.visible === 'boolean') {
      this.dom.classList.toggle('display-none', !params.visible);
    }
  }

  /**
   * Get title.
   * @returns {string} title.
   */
  getTitle() {
    return this.title;
  }

  /**
   * Get attempts left.
   * @returns {number} Attempts left.
   */
  getAttemptsLeft() {
    return this.attemptsLeft;
  }

  /**
   * Get time left.
   * @returns {number} Time left in ms.
   */
  getTimeLeft() {
    return this.timeLeft;
  }

  /**
   * Get time left in timecode format.
   * @returns {string} Timecode.
   */
  getTimeLeftTimecode() {
    return Timer.toTimecode(this.getTimeLeft());
  }

  showTimeExpired(text = '') {
    this.h5pContent.hide();

    this.contentReplacer.update({
      icon: 'clock',
      text: text
    });
    this.contentReplacer.show();

    this.params.globals.get('mainInstance').trigger('resize');
  }

  showAttemptsExceeded() {
    this.h5pContent.hide();

    this.contentReplacer.update({
      icon: 'heart',
      text: 'You have exceeded the maximum number of attempts for this exercise.',
    });
    this.contentReplacer.show();

    this.params.globals.get('mainInstance').trigger('resize');
  }

  /**
   * Get xAPI data from exercises.
   * @returns {object} XAPI data objects used to build report.
   */
  getXAPIData() {
    return this.h5pContent.getXAPIData();
  }

  /**
   * Register callback to call once the next transition has ended.
   * @param {function} callback Callback when transition has ended.
   */
  registerTransitionEnd(callback) {
    if (typeof callback !== 'function') {
      return; // No valid callback
    }

    this.dom.addEventListener('transitionend', callback, { once: true });
  }

  /**
   * Find first focusable element and set focus.
   * @returns {boolean} True if could focus on first child, else false.
   */
  focusFirstChild() {
    return this.h5pContent.focusFirstChild();
  }

  /**
   * Set position.
   * @param {number} position negative = past, 0 = present, positive = future.
   */
  setPosition(position) {
    this.dom.classList.toggle('past', position < 0);
    this.dom.classList.toggle('present', position === 0);
    this.dom.classList.toggle('future', position > 0);

    this.isShowingState = position === 0;
  }

  startTimer() {
    this.timer?.start(this.timeLeft);
  }

  stopTimer() {
    this.timer?.stop();
  }

  isShowing() {
    return this.isShowingState;
  }

  /**
   * Check if result has been submitted or input has been given.
   * @returns {boolean} True, if answer was given.
   */
  getAnswerGiven() {
    return this.h5pContent.getAnswerGiven();
  }

  /**
   * Get current score.
   * @returns {number} Current score.
   */
  getScore() {
    return this.h5pContent.getScore();
  }

  /**
   * Get maximum possible score.
   * @returns {number} Score necessary for mastering.
   */
  getMaxScore() {
    return this.h5pContent.getMaxScore();
  }

  /**
   * Show solutions.
   */
  showSolutions() {
    this.h5pContent.showSolutions();
  }

  /**
   * Reset.
   */
  reset() {
    this.timer?.stop();
    this.h5pContent.reset();

    this.h5pContent.show();
    this.contentReplacer.hide();

    this.attemptsLeft = this.params.attemptsMax ?? Infinity;
    this.timeLeft = (this.params.timeMax ?? Infinity) * 1000;
  }

  /**
   * Return H5P core's call to store current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {
      content: this.h5pContent.getCurrentState(),
      attemptsLeft: this.getAttemptsLeft(),
      timeLeft: this.getTimeLeft()
    };
  }
}
