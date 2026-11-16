import Dictionary from '@services/dictionary.js';
import Jukebox from '@services/jukebox.js';
import Util from '@services/util.js';
import { getSemanticsDefaults } from './services/h5p-util.js';
import Main from '@components/main.js';
import TitleScreen from '@components/title-screen/title-screen.js';

/** @constant {string} DEFAULT_DESCRIPTION Default description*/
const DEFAULT_DESCRIPTION = 'Gamifier';

export default class Gamifier extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    const defaults = Util.extend({
      content: [],
      titleScreen: {},
      audio: {},
      visuals: {},
      behaviour: {}
    }, getSemanticsDefaults());
    this.params = Util.extend(defaults, params);

    this.params.content = this.params.content.filter((item) => {
      return !!item.libraryParams?.library;
    });

    this.contentId = contentId;
    this.extras = Util.extend({
      previousState: {}
    }, extras);

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    // Set globals
    this.globals = new Map();
    this.globals.set('mainInstance', this);
    this.globals.set('params', this.params);
    this.globals.set('contentId', this.contentId);
    this.globals.set('extras', this.extras);
    this.globals.set('resize', () => {
      this.trigger('resize');
    });

    this.jukebox = new Jukebox();
    this.fillJukebox();
    this.jukebox.muteAll();

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    const fullScreenSupported = this.isRoot() && H5P.fullscreenSupported;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-gamifier');

    this.main = new Main(
      {
        dictionary: this.dictionary,
        globals: this.globals,
        jukebox: this.jukebox,
        hasFullscreen: fullScreenSupported,
        hasAudio: this.jukebox.getAudioIds().length > 0
      },
      {
        onProgressed: (index) => {
          this.handleProgressed(index);
        },
        onFinished: () => {
          this.handleFinished();
        },
        onRetry: () => {
          this.handleRetry();
        }
      }
    );
    this.dom.appendChild(this.main.getDOM());

    this.startPageIndex = this.extras.previousState.pageIndex ?? 0;

    // Older states have no `started` flag, but a page index if started
    this.isStarted = this.extras.previousState.started ??
      typeof this.extras.previousState.pageIndex === 'number';

    if (this.params.titleScreen.showTitleScreen) {
      this.titleScreen = new TitleScreen(
        {
          title: this.params.titleScreen.title || this.getTitle(),
          introduction: this.params.titleScreen.introduction,
          imageSrc: this.params.titleScreen.image?.path ?
            H5P.getPath(this.params.titleScreen.image.path, this.contentId) :
            undefined,
          imageAlt: this.params.titleScreen.imageAltText,
          buttonLabel: this.dictionary.get('l10n.startButton')
        },
        {
          onStart: () => {
            this.handleTitleScreenStart();
          }
        }
      );
      this.dom.prepend(this.titleScreen.getDOM());
    }

    const showTitleScreen = this.titleScreen && !this.isStarted;
    if (showTitleScreen) {
      this.main.hide();
    }
    else {
      this.titleScreen?.hide();
    }

    Util.callOnceVisible(
      this.dom, () => {
        this.trigger('resize');

        if (showTitleScreen) {
          return; // Will be started by title screen
        }

        window.requestAnimationFrame(() => {
          this.start({ skipFocus: true });
        });
      }
    );
  }

  /**
   * Start the game: Move to start page and start timers.
   * @param {object} [options] Options.
   * @param {boolean} [options.skipFocus] If true, don't move focus to page.
   */
  start(options = {}) {
    this.isStarted = true;

    // If results are shown (resumed after finishing), pages are not rendered and cannot transition
    this.main.swipeTo(this.startPageIndex, {
      skipFocus: options.skipFocus || this.main.isFinished,
      instant: this.main.isFinished
    });
    this.main.startTimer();
  }

  /**
   * Handle user finished.
   */
  handleFinished() {
    const score = this.getScore();
    const maxScore = this.getMaxScore();

    const xAPIEvent = this.createXAPIEvent('completed');
    xAPIEvent.setScoredResult(
      score, maxScore, this, true, maxScore > 0 ? score >= maxScore : undefined
    );
    this.trigger(xAPIEvent);
  }

  /**
   * Handle user wants to retry.
   */
  handleRetry() {
    this.resetTask({ isUserRetry: true });
  }

  /**
   * Handle user clicked start button on title screen.
   */
  handleTitleScreenStart() {
    this.titleScreen.hide();
    this.main.show();
    this.trigger('resize');

    window.requestAnimationFrame(() => {
      this.start();
    });
  }

  /**
   * Workaround for H5P core mutating prototype to inject its isRoot, but ES6 inheritance here.
   * @returns {boolean} True, if content type is root. Else false.
   */
  isRoot() {
    return !!this.extras.standalone;
  }

  /**
   * Attach DOM to H5P wrapper.
   * @param {H5P.jQuery} $wrapper H5P wrapper.
   */
  attach($wrapper) {
    $wrapper.get(0).classList.add('h5p-theme');
    $wrapper.get(0).append(this.dom);
  }

  /**
   * Get tasks title.
   * @returns {string} Title.
   */
  getTitle() {
    let raw;
    if (this.extras.metadata) {
      raw = this.extras.metadata.title;
    }
    raw = raw || DEFAULT_DESCRIPTION;

    // H5P Core function: createTitle
    return H5P.createTitle(raw);
  }

  /**
   * Get tasks description.
   * @returns {string} Description.
   */
  getDescription() {
    return this.params.taskDescription || DEFAULT_DESCRIPTION;
  }

  /**
   * Fill jukebox with audios.
   */
  fillJukebox() {
    const audios = {};

    if (this.params.audio.backgroundMusic?.[0]?.path) {
      const src = H5P.getPath(this.params.audio.backgroundMusic[0].path, this.contentId);
      const crossOrigin = H5P.getCrossOrigin?.(this.params.audio.backgroundMusic[0]) ?? 'Anonymous';

      audios.backgroundMusic = {
        src: src,
        crossOrigin: crossOrigin,
        options: { loop: true, groupId: 'background' },
      };
    }

    for (const key in this.params.audio.events) {
      if (!this.params.audio.events[key]?.[0]?.path) {
        continue;
      }
      if (!this.params.audio.events[key]?.[0]?.path) {
        continue;
      }

      const src = H5P.getPath(this.params.audio.events[key][0].path, this.contentId);

      const crossOrigin = H5P.getCrossOrigin?.(this.params.audio.events[key][0]) ?? 'Anonymous';

      audios[key] = {
        src: src,
        crossOrigin: crossOrigin,
      };
    }

    this.jukebox.fill(audios);
  }

  /**
   * Get context data. Contract used for confusion report.
   * @returns {object} Context data.
   */
  getContext() {
    return {
      type: 'page',
      value: this.main.getCurrentPageIndex() + 1
    };
  }

  /**
   * Check if result has been submitted or input has been given.
   * @returns {boolean} True, if answer was given.
   */
  getAnswerGiven() {
    return this.main.getAnswerGiven();
  }

  /**
   * Get current score.
   * @returns {number} Current score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
   */
  getScore() {
    return this.main.getScore();
  }

  /**
   * Get maximum possible score.
   * @returns {number} Score necessary for mastering.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
   */
  getMaxScore() {
    return this.main.getMaxScore();
  }

  /**
   * Show solutions.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
   */
  showSolutions() {
    this.main.showSolutions();
  }

  /**
   * Reset task.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   * @param {object} [options] Options.
   * @param {boolean} [options.isUserRetry] If true, reset was triggered by user and focus will be moved.
   */
  resetTask(options = {}) {
    this.startPageIndex = 0;

    if (!this.titleScreen) {
      this.main.reset({ skipFocus: !options.isUserRetry });
      return;
    }

    // Timers will be started once user clicks start on title screen again
    this.main.reset({ skipTimers: true });
    this.isStarted = false;
    this.main.hide();
    this.titleScreen.show();
    this.trigger('resize');

    if (options.isUserRetry) {
      this.titleScreen.focus();
    }
  }

  /**
   * Get xAPI data.
   * @returns {object} XAPI statement.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
   */
  getXAPIData() {
    const xAPIEvent = this.createXAPIEvent('completed');

    // Not a valid xAPI value (!), but H5P uses it for reporting
    xAPIEvent.data.statement.object.definition.interactionType = 'compound';

    return {
      statement: xAPIEvent.data.statement,
      children: this.main.getXAPIData() // TODO
    };
  }

  /**
   * Handle progressed.
   */
  handleProgressed() {
    this.triggerXAPIEvent('progressed');
  }

  /**
   * Trigger xAPI event.
   * @param {string} verb Short id of the verb we want to trigger.
   */
  triggerXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEvent(verb);
    this.trigger(xAPIEvent);
  }

  /**
   * Create an xAPI event.
   * @param {string} verb Short id of the verb we want to trigger.
   * @returns {H5P.XAPIEvent} Event template.
   */
  createXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEventTemplate(verb);

    Util.extend(
      xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
      this.getXAPIDefinition()
    );

    if (verb === 'progressed') {
      xAPIEvent.data.statement.object.definition
        .extensions['http://id.tincanapi.com/extension/ending-point'] =
          this.main.getCurrentPageIndex + 1;
    }

    return xAPIEvent;
  }

  /**
   * Get the xAPI definition for the xAPI object.
   * @returns {object} XAPI definition.
   */
  getXAPIDefinition() {
    const definition = {};

    definition.name = {};
    definition.name[this.languageTag] = this.getTitle();
    // Fallback for h5p-php-reporting, expects en-US
    definition.name['en-US'] = definition.name[this.languageTag];

    definition.description = {};
    definition.description[this.languageTag] = this.getDescription();
    // Fallback for h5p-php-reporting, expects en-US
    definition.description['en-US'] = definition.description[this.languageTag];

    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'other';

    return definition;
  }

  /**
   * Return H5P core's call to store current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {
      ...this.main.getCurrentState(),
      started: this.isStarted
    };
  }
}
