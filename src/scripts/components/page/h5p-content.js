import Util from '@services/util.js';
import { isInstanceTask } from '@services/h5p-util.js';

export default class H5PContent {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {number} params.index Index of page.
   * @param {object} params.libraryParams Library parameters for content.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      libraryParams: {}
    }, params);

    this.callbacks = Util.extend({
      onScored: () => {},
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-gamifier-content-instance');

    this.initializeInstance();
    this.attachInstance();
  }

  /**
   * Get DOM with H5P exercise.
   * @returns {HTMLElement} DOM with H5P exercise.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get xAPI data from exercises.
   * @returns {object} XAPI data objects used to build report.
   */
  getXAPIData() {
    return this.instance?.getXAPIData?.();
  }

  /**
   * Initialize H5P instance.
   */
  initializeInstance() {
    if (this.instance === null || this.instance) {
      return; // Only once, please
    }

    const libraryParams = this.params.libraryParams;

    const machineName = libraryParams?.library?.split?.(' ')[0];

    if (machineName === 'H5P.Video') {
      libraryParams.params.visuals.fit = (
        libraryParams.params.sources.length && (
          libraryParams.params.sources[0].mime === 'video/mp4' ||
          libraryParams.params.sources[0].mime === 'video/webm' ||
          libraryParams.params.sources[0].mime === 'video/ogg'
        )
      );
    }

    if (machineName === 'H5P.Audio') {
      if (libraryParams.params.playerMode === 'full') {
        libraryParams.params.fitToWrapper = true;
      }
    }

    const previousState =
      this.params.globals
        .get('extras').previousState?.children?.[this.params.index]?.content;

    if (!this.instance) {
      this.instance = H5P.newRunnable(
        libraryParams,
        this.params.globals.get('contentId'),
        undefined,
        true,
        { previousState: previousState }
      );
    }

    if (!this.instance) {
      return;
    }

    // Resize parent when children resize
    this.bubbleUp(
      this.instance, 'resize', this.params.globals.get('mainInstance')
    );

    // Resize children to fit inside parent
    this.bubbleDown(
      this.params.globals.get('mainInstance'), 'resize', [this.instance]
    );

    this.isTaskState = isInstanceTask(this.instance);

    if (this.isTaskState) {
      this.instance.on('xAPI', (event) => {
        this.trackXAPI(event);
      });
    }
  }

  isTask() {
    return this.isTaskState;
  }

  /**
   * Make it easy to bubble events from child to parent.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object} target Target to trigger event on.
   */
  bubbleUp(origin, eventName, target) {
    origin.on(eventName, (event) => {
      // Prevent target from sending event back down
      target.bubblingUpwards = true;

      // Trigger event
      target.trigger(eventName, event);

      // Reset
      target.bubblingUpwards = false;
    });
  }

  /**
   * Make it easy to bubble events from parent to children.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object[]} targets Targets to trigger event on.
   */
  bubbleDown(origin, eventName, targets) {
    origin.on(eventName, (event) => {
      if (origin.bubblingUpwards) {
        return; // Prevent send event back down.
      }

      targets.forEach((target) => {
        // If not attached yet, some contents can fail (e. g. CP).
        if (this.isAttached) {
          target.trigger(eventName, event);
        }
      });
    });
  }

  /**
   * Track scoring of contents.
   * @param {Event} event Event.
   */
  trackXAPI(event) {
    if (!this.isAttached) {
      return; // Guard to make robust against content types firing xAPI events when not attached
    }

    if (!event || event.getScore() === null) {
      return; // Not relevant
    }

    const isEventFromInstance = new RegExp(this.getId())
      .test(event.getVerifiedStatementValue(['object', 'id']));

    if (!isEventFromInstance) {
      return; // Not an event from the instance directly
    }

    const success = event.getScore() >= this.instance.getMaxScore() ||
      event.getVerifiedStatementValue(['result', 'success']);

    this.callbacks.onScored({ id: this.getId(), score: event.getScore(), success: success });
  }

  /**
   * Get Id.
   * @returns {string|null} Exercise Id or `null` if never instantiated.
   */
  getId() {
    return this.instance.subContentId ?? null;
  }

  /**
   * Attach instance to DOM.
   */
  attachInstance() {
    if (this.isAttached) {
      return; // Already attached. Listeners would go missing on re-attaching.
    }

    this.instance.attach(H5P.jQuery(this.dom));

    const machineName = this.instance?.libraryInfo.machineName;
    if (machineName === 'H5P.Audio') {
      if (!!window.chrome) {
        this.instance.audio.style.height = '54px';
      }
    }
    else if (machineName === 'H5P.CoursePresentation') {
      Util.callOnceVisible(this.dom, () => {
        this.instance.$fullScreenButton?.get(0).remove();
      });
    }
    else if (machineName === 'H5P.InteractiveVideo') {
      Util.callOnceVisible(this.dom, () => {
        this.instance.controls?.$fullscreen.get(0).remove();
      });
    }

    this.isAttached = true;
  }

  /**
   * Show content.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide content.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Find first focusable element and set focus.
   * @returns {boolean} True if could focus on first child, else false.
   */
  focusFirstChild() {
    const focusableElementsString = [
      'a[href]:not([disabled])',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'video',
      'audio',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    const firstChild = [...this.dom.querySelectorAll(focusableElementsString)]
      .filter((element) => {
        const disabled = element.getAttribute('disabled');
        return disabled !== 'true' && disabled !== true;
      })
      .shift();

    firstChild?.focus();

    return !!firstChild;
  }

  /**
   * Get content title.
   * @returns {string} Content title.
   */
  getTitle() {
    if (this.instance?.getTitle) {
      return this.instance.getTitle();
    }

    return this.params.metadata?.title ||
      this.params.dictionary.get('l10n.noTitle');
  }

  /**
   * Check if result has been submitted or input has been given.
   * @returns {boolean} True, if answer was given.
   */
  getAnswerGiven() {
    return this.instance?.getAnswerGiven?.() ?? false;
  }

  /**
   * Get current score.
   * @returns {number} Current score.
   */
  getScore() {
    return this.instance?.getScore?.() ?? 0;
  }

  /**
   * Get maximum possible score.
   * @returns {number} Score necessary for mastering.
   */
  getMaxScore() {
    return this.instance?.getMaxScore?.() ?? 0;
  }

  /**
   * Show solutions.
   */
  showSolutions() {
    /*
     * If not attached yet, some contents can fail (e. g. CP), but contents
     * that are not attached never had a previous state change, so okay
     */
    if (!this.isAttached) {
      this.attachInstance();
    }

    this.instance?.showSolutions?.();
  }

  /**
   * Reset.
   */
  reset() {
    /*
     * If not attached yet, some contents can fail (e. g. CP), but contents
     * that are not attached never had a previous state change, so okay
     */
    if (!this.isAttached) {
      this.attachInstance();
    }

    this.instance?.resetTask?.();
  }

  /**
   * Return H5P core's call to store current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return this.instance?.getCurrentState?.() || {};
  }
}
