import Screenreader from '@services/screenreader.js';
import Util from '@services/util.js';
import Timer from '@services/timer.js';
import HeaderBar from '@components/button-bars/header-bar.js';
import FooterBar from '@components/button-bars/footer-bar.js';
import Page from '@components/page/page.js';
import SettingsDialog from '@components/overlay-dialogs/settings-dialog.js';
import StatusContainers from '@components/button-bars/status-containers/status-containers.js';
import ResultScreen from '@components/result-screen/result-screen.js';
import './main.scss';

/**
 * Main DOM component incl. main controller.
 */
export default class Main {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {object} [callbacks.onProgressed] Callback when user progressed.
   * @param {object} [callbacks.onFinished] Callback when user finished.
   * @param {object} [callbacks.onRetry] Callback when user wants to retry.
   * @param {object} [callbacks.onFullscreenClicked] Callback when user clicked fullscreen button.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
      onProgressed: () => {},
      onFinished: () => {},
      onRetry: () => {},
      onFullscreenClicked: () => {}
    }, callbacks);

    this.isFinished = this.params.globals.get('extras').previousState?.isFinished ?? false;

    this.timeLeft = this.params.globals.get('extras').previousState?.timeLeft ??
      (this.params.globals.get('params').behaviour.globalTimeLimit || Infinity) * 1000;

    this.handleUpdatePagePositionsEnded = this.handleUpdatePagePositionsEnded.bind(this);

    this.globalParams = this.params.globals.get('params');

    this.statusContainersGlobal = new StatusContainers();
    this.statusContainersExercise = new StatusContainers();

    this.currentPageIndex = -1;
    this.pages = [];
    this.contents = document.createElement('div');
    this.contents.classList.add('h5p-gamifier-pages');

    this.globalParams.content.forEach((content, index) => {
      const page = new Page(
        {
          dictionary: this.params.dictionary,
          globals: this.params.globals,
          index: index,
          libraryParams: content.libraryParams,
          attemptsMax: content.attempts,
          timeMax: content.timeLimit,
        },
        {
          onTimerTick: () => {
            this.updateExerciseTime();
          },
          onTimeExpired: (index) => {
            this.params.jukebox.play('timeExpired');
            this.pages[index].showTimeExpired(this.params.dictionary.get('l10n.timeExpiredExercise'));
          },
          onScoreChanged: (index, values = {}) => {
            let resultSoundId;

            if (typeof values.before === 'number' && typeof values.after === 'number') {
              const scoreChange = values.after - values.before;
              if (scoreChange < 0) {
                resultSoundId = 'lostLife';
              }
            }

            if (!resultSoundId) {
              resultSoundId = values.success ? 'correctAnswer' : 'wrongAnswer';
            }

            if (resultSoundId) {
              this.params.jukebox.play(resultSoundId);
            }

            this.updateExerciseAttempts();
            this.updateScoreDisplay();
          },
          onAttemptsExceeded: (index) => {
            this.pages[index].stopTimer();
            this.pages[index].showAttemptsExceeded();
            this.params.jukebox.stop('lostLife');
            this.params.jukebox.play('attemptsExceeded');
          }
        }
      );
      this.contents.append(page.getDOM());

      this.pages.push(page);
    });

    this.pages.forEach((page) => {
      if (page.getTimeLeft() <= 0) {
        page.showTimeExpired(this.params.dictionary.get('l10n.timeExpiredExercise'));
      }

      if (page.getAttemptsLeft() <= 0) {
        page.showAttemptsExceeded();
      }
    });

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-gamifier-main');

    this.statusContainersGlobal.addContainer({ id: 'time' });
    if (this.getMaxScore() > 0) {
      this.statusContainersGlobal.addContainer({
        dictionary: this.params.dictionary,
        id: 'score',
        hasScorebar: true,
        hasMaxValue: true,
        value: this.getScore(),
        maxValue: this.getMaxScore()
      });
    }

    this.statusContainersExercise.addContainer({ id: 'time' });
    this.statusContainersExercise.addContainer({ id: 'attempts' });

    this.buttonBarHeader = new HeaderBar(
      {
        dictionary: this.params.dictionary,
        statusContainers: this.statusContainersGlobal,
        hasAudio: this.params.hasAudio,
        hasFullscreen: this.params.hasFullscreen
      },
      {
        onClickButtonAudio: (on) => {
          this.wasAudioOnBeforeResults = false; // User's explicit choice wins
          this.toggleAudio(on);
        },
        onClickButtonSettings: () => {
          this.settingsDialog.show();
          this.fitHeightToDialog(this.settingsDialog);
        },
        onClickButtonFinish: () => {
          if (this.isSwiping) {
            // Hiding pages while swiping could prevent transitionend from firing
            this.isShowResultsPending = true;
            return;
          }

          this.showResults();
        },
        onClickButtonFullscreen: () => {
          this.callbacks.onFullscreenClicked();
        }
      }
    );
    this.dom.append(this.buttonBarHeader.getDOM());

    this.dom.append(this.contents);

    this.buttonBarFooter = new FooterBar(
      {
        dictionary: this.params.dictionary,
        statusContainers: this.statusContainersExercise
      },
      {
        onClickButtonLeft: () => {
          this.swipeLeft();
        },
        onClickButtonRight: () => {
          this.swipeRight();
        }
      }
    );
    this.dom.append(this.buttonBarFooter.getDOM());

    const behaviour = this.globalParams.behaviour;
    this.resultScreen = new ResultScreen(
      {
        dictionary: this.params.dictionary,
        showRetryButton: behaviour.enableRetry,
        showSolutionsButton: behaviour.enableSolutionsButton && this.getMaxScore() > 0
      },
      {
        onRetry: () => {
          this.callbacks.onRetry();
        },
        onShowSolutions: () => {
          this.handleShowSolutions();
        }
      }
    );
    this.dom.append(this.resultScreen.getDOM());

    this.settingsDialog = new SettingsDialog(
      {
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        cssMainSelector: 'settings',
        values: {
          volumeMusic: this.params.jukebox.getVolumeGroup('background'),
          volumeSFX: this.params.jukebox.getVolumeGroup('default'),
        },
      },
      {
        onOpened: () => {
          this.params.jukebox.play('dialogOpened');
        },
        onClosed: () => {
          this.params.jukebox.play('dialogClosed');
          this.settingsDialog.hide({ animate: true }, () => {
            this.dom.style.minHeight = '';
            this.params.globals.get('resize')();
          });
        },
        onOpenAnimationEnded: () => {
          this.params.globals.get('resize')();
        },
        onValueChanged: (id, value) => {
          if (id === 'volumeMusic') {
            this.params.jukebox.setVolumeGroup('background', value);
          }
          else if (id === 'volumeSFX') {
            this.params.jukebox.setVolumeGroup('default', value);
          }
        },
      },
    );
    this.settingsDialog.hide();
    this.dom.append(this.settingsDialog.getDOM());

    // Screenreader for polite screen reading
    document.body.append(Screenreader.getDOM());

    this.timer = new Timer(
      { interval: 500 },
      {
        onTick: () => {
          this.timeLeft = this.timer.getTime();
          this.updateGlobalTime();
          this.checkTimeWarningGlobal();
        },
        onExpired: () => {
          this.handleGlobalTimeExpired();
        }
      }
    );
    this.updateGlobalTime();

    if (this.timeLeft === 0) {
      this.handleGlobalTimeExpired();
    }

    // Restore results right away if user had finished before, so pages never show up
    if (this.isFinished) {
      this.showResults({ skipFocus: true });
    }
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Content DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show main content.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide main content.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Toggle audio on/off.
   * @param {boolean} [on] True to turn audio on, false to turn off.
   */
  toggleAudio(on) {
    this.isAudioOn = (typeof on === 'boolean') ? on : !this.isAudioOn;

    if (!this.isAudioOn) {
      this.params.jukebox.muteAll();
    }
    else {
      this.params.jukebox.unmuteAll();
      this.params.jukebox.play('backgroundMusic');
    }
  }

  /**
   * Ensure main DOM is high enough to display dialog without cutting it off.
   * @param {OverlayDialog} dialog Dialog that is being displayed.
   */
  fitHeightToDialog(dialog) {
    this.dom.style.minHeight = '';

    const requiredHeight = dialog.getRequiredHeight();
    if (requiredHeight > this.dom.offsetHeight) {
      this.dom.style.minHeight = `${requiredHeight}px`;
    }

    this.params.globals.get('resize')();
  }

  /**
   * Set fullscreen state.
   * @param {boolean} isFullscreen True, if in fullscreen mode.
   */
  setFullscreen(isFullscreen) {
    this.buttonBarHeader.setFullscreenState(isFullscreen);
    this.params.globals.get('resize')();
  }

  /**
   * Set audio on/off and keep audio button state in sync.
   * @param {boolean} on True to turn audio on, false to turn off.
   */
  setAudio(on) {
    this.toggleAudio(on);
    this.buttonBarHeader.setButtonActive('audio', on);
  }

  /**
   * Get current page index.
   * @returns {number} Current page index.
   */
  getCurrentPageIndex() {
    return this.currentPageIndex;
  }

  /**
   * Swipe content left.
   */
  swipeLeft() {
    if (
      this.isSwiping ||
      !this.globalParams.behaviour.cycle && this.currentPageIndex <= 0
    ) {
      return; // Swiping or already at outer left
    }

    this.swipeTo(this.currentPageIndex - 1);
  }

  /**
   * Swipe content right.
   */
  swipeRight() {
    if (
      this.isSwiping ||
      !this.globalParams.behaviour.cycle &&
        this.currentPageIndex === this.pages.length - 1
    ) {
      return; // Swiping or already at outer right
    }

    this.swipeTo(this.currentPageIndex + 1);
  }

  /**
   * Swipe to page.
   * @param {number} [to] Page number to swipe to.
   * @param {object} [options] Options.
   * @param {boolean} [options.skipFocus] If true, skip focus after swiping.
   * @param {boolean} [options.skipTimer] If true, don't start page timer.
   * @param {function} [options.onEnded] Callback when swiping ended.
   * @param {boolean} [options.instant] If true, don't wait for transition (e.g. when pages are not rendered).
   */
  swipeTo(to = -1, options = {}) {
    if (
      this.isSwiping ||
      !this.globalParams.behaviour.cycle &&
        (to < 0 || to > this.pages.length - 1)
    ) {
      return; // Swiping or out of bounds
    }

    to = (to + this.pages.length) % this.pages.length;

    let from = this.currentPageIndex;

    this.isSwiping = true;

    this.currentPageIndex = to;

    let screenReader = this.params.dictionary.get('a11y.movedTo')
      .replace(/@current/g, to + 1)
      .replace(/@total/g, this.pages.length);

    screenReader = screenReader ?
      `${screenReader}. ${this.pages[to].getTitle()}` :
      this.pages[to].getTitle();

    Screenreader.read(screenReader);

    // Ensure to > from
    if (from > to) {
      const tmp = from;
      from = to;
      to = tmp;
    }

    const endOptions = { skipFocus: options.skipFocus, onEnded: options.onEnded };

    const needsTransition = from !== to && !options.instant;
    if (needsTransition) {
      this.pages[to].registerTransitionEnd(() => {
        this.handleUpdatePagePositionsEnded(endOptions);
      });
    }

    // Make all pages from `from` up to `to` visible
    const visiblePages = [...Array(to - from + 1).keys()]
      .map((x) => x + from);

    this.pages.forEach((page, index) => {
      page.update({ visible: visiblePages.includes(index) }); // TODO: toggleVisible if no other parameter required
    });

    this.buttonBarFooter?.disableButton('left');
    this.buttonBarFooter?.disableButton('right');

    this.params.globals.get('resize')();

    // Let browser display and resize pages before starting transition
    window.requestAnimationFrame(() => {
      this.pages.forEach((page, index) => {
        page.setPosition(index - this.currentPageIndex);
      });

      if (!needsTransition) {
        // Must be called after buttons were disabled above
        this.handleUpdatePagePositionsEnded(endOptions);
      }
    });

    this.pages[this.currentPageIndex].setVisited();

    if (this.timeLeft > 0 && !this.isFinished && !options.skipTimer) {
      this.pages[this.currentPageIndex].startTimer();
    }

    this.params.jukebox.play('goto');
    this.callbacks.onProgressed(this.currentPageIndex);
  }

  /**
   * Check and play time warning global sound.
   */
  checkTimeWarningGlobal() {
    if (this.timeWarningGlobalWasPlayed) {
      return;
    }

    const timeWarningGlobal = this.params.globals.get('params').behaviour.timeWarningGlobal;
    if (typeof timeWarningGlobal !== 'number') {
      return;
    }

    if (this.timeLeft > timeWarningGlobal * 1000) {
      return;
    }

    this.timeWarningGlobalWasPlayed = true;
    this.params.jukebox.play('timeWarningGlobal');
  }

  /**
   * Handle global time expired.
   */
  handleGlobalTimeExpired() {
    this.timeLeft = 0;

    this.pages.forEach((page) => {
      page.stopTimer();
      page.showTimeExpired(this.params.dictionary.get('l10n.timeExpiredGlobal'));
    });

    this.params.jukebox.stop('timeExpired');
    this.params.jukebox.play('timeExpiredTotal');
  }

  /**
   * Handle updating page positions ended.
   * @param {object} [options] Options.
   */
  handleUpdatePagePositionsEnded(options = {}) {
    this.pages.forEach((page, index) => {
      if (index !== this.currentPageIndex) {
        page.getDOM().classList.add('display-none');
      }
      else if (!options.skipFocus) {
        if (!page.focusFirstChild()) {
          // Re-announce current button after moving page to make focus clear
          const currentFocusElement = document.activeElement;
          document.activeElement.blur();
          currentFocusElement.focus();
        }
      }
    });

    this.isSwiping = false;

    this.updateAnnouncement();
    this.updateNavigationButtons();
    this.updateStatusContainers();

    this.params.globals.get('resize')();

    options.onEnded?.();

    if (this.isShowResultsPending) {
      this.isShowResultsPending = false;
      this.showResults();
    }
  }

  /**
   * Update announcement.
   */
  updateAnnouncement() {
    let announcement;

    if (this.globalParams.behaviour.displayPageAnnouncement) {
      announcement = this.params.dictionary.get('l10n.pageAnnouncement')
        .replace(
          /@current/g,
          `<span class="highlighted">${this.currentPageIndex + 1}</span>`
        )
        .replace(
          /@total/g,
          `<span class="highlighted">${this.pages.length}</span>`
        );
    }

    if (this.globalParams.behaviour.displayContentAnnouncement) {
      const title = this.pages[this.currentPageIndex].getTitle();
      announcement = announcement ?
        `${announcement}: ${title}` :
        title;
    }

    if (announcement) {
      this.buttonBarFooter?.setAnnouncerText(announcement);
    }
  }

  /**
   * Update progression.
   */
  updateNavigationButtons() {
    if (this.globalParams.behaviour.cycle) {
      this.buttonBarFooter?.enableButton('left');
      this.buttonBarFooter?.enableButton('right');

      return;
    }

    // First page
    if (this.currentPageIndex === 0) {
      this.buttonBarFooter?.disableButton('left');
    }
    else {
      this.buttonBarFooter?.enableButton('left');
    }

    // Last page
    if (this.currentPageIndex === this.pages.length - 1) {
      this.buttonBarFooter?.disableButton('right');
    }
    else {
      this.buttonBarFooter?.enableButton('right');
    }
  }

  /**
   * Start timer.
   */
  startTimer() {
    if (!this.timer || this.isFinished) {
      return; // Timer not set or user already finished
    }

    this.timer.start(this.timeLeft);
    this.updateGlobalTime();
  }

  /**
   * Update status containers.
   */
  updateStatusContainers() {
    this.updateExerciseTime();
    this.updateExerciseAttempts({ skipAnimation: true });
    this.updateScoreDisplay();
  }

  /**
   * Update exercise time.
   */
  updateExerciseTime() {
    const currentPage = this.pages[this.currentPageIndex];
    if (!currentPage) {
      return;
    }

    this.statusContainersExercise.setStatus('time', { value: currentPage.getTimeLeftTimecode() });
  }

  /**
   * Update global time.
   */
  updateGlobalTime() {
    this.statusContainersGlobal.setStatus('time', { value: Timer.toTimecode(this.timeLeft) });
    const isUpperTimeHalf = Math.round(this.timeLeft / 1000) === Math.ceil(this.timeLeft / 1000);
    if (this.timeWarningGlobalWasPlayed && isUpperTimeHalf && this.params.globals.get('params').visuals?.animate) {
      this.statusContainersGlobal.animate('time', 'pulse');
    }
  }

  /**
   * Update exercise attempts.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.skipAnimation] If true, skip animation.
   */
  updateExerciseAttempts(params = {}) {
    const currentPage = this.pages[this.currentPageIndex];
    if (!currentPage) {
      return;
    }

    const currentAttemptsLeft = currentPage.getAttemptsLeft();

    if (!params.skipAnimation) {
      const oldStatus = this.statusContainersExercise.getStatus('attempts');

      if (
        oldStatus.value !== Infinity && oldStatus.value > currentAttemptsLeft &&
        this.params.globals.get('params').visuals?.animate
      ) {
        this.statusContainersExercise.animate('attempts', 'head-shake');
      }
    }

    this.statusContainersExercise.setStatus('attempts', { value: currentAttemptsLeft });
  }

  /**
   * Update score display.
   */
  updateScoreDisplay() {
    const oldStatus = this.statusContainersGlobal.getStatus('score');
    if (oldStatus.value !== this.getScore() && this.params.globals.get('params').visuals?.animate) {
      this.statusContainersGlobal.animate('score', 'tada');
    }

    this.statusContainersGlobal.setStatus('score', {
      value: this.getScore(),
      maxValue: this.getMaxScore()
    });
  }

  /**
   * Check if result has been submitted or input has been given.
   * @returns {boolean} True, if answer was given.
   */
  getAnswerGiven() {
    return this.pages.some((page) => page.getAnswerGiven());
  }

  /**
   * Get current score.
   * @returns {number} Current score.
   */
  getScore() {
    return this.pages.reduce((score, page) => {
      return score + page.getScore();
    }, 0);
  }

  /**
   * Get maximum possible score.
   * @returns {number} Score necessary for mastering.
   */
  getMaxScore() {
    return this.pages.reduce((score, page) => {
      return score + page.getMaxScore();
    }, 0);
  }

  /**
   * Show solutions.
   */
  showSolutions() {
    this.pages.forEach((page) => {
      page.showSolutions();
    });

    this.buttonBarHeader.toggleSolutionMode(true);
  }

  /**
   * Stop global timer and all page timers.
   */
  stopAllTimers() {
    this.timer?.stop();
    this.pages.forEach((page) => {
      page.stopTimer();
    });
  }

  /**
   * Show results.
   * @param {object} [options] Options.
   * @param {boolean} [options.skipFocus] If true, don't move focus to results.
   */
  showResults(options = {}) {
    const wasFinished = this.isFinished;
    this.isFinished = true;
    this.isShowingResults = true;

    this.stopAllTimers();

    this.resultScreen.update({
      score: this.getScore(),
      maxScore: this.getMaxScore(),
      pages: this.pages.map((page) => ({
        title: page.getTitle(),
        isTask: page.isTask(),
        score: page.getScore(),
        maxScore: page.getMaxScore(),
        visited: page.isVisited()
      }))
    });

    this.contents.classList.add('display-none');
    this.buttonBarHeader.getDOM().classList.add('display-none');
    this.buttonBarFooter.getDOM().classList.add('display-none');

    // Audio stays off until user retries
    if (this.isAudioOn) {
      this.wasAudioOnBeforeResults = true;
      this.setAudio(false);
    }
    this.params.jukebox.stopAll();
    this.resultScreen.show();

    this.params.globals.get('resize')();

    if (!options.skipFocus) {
      this.resultScreen.focus();
    }

    if (!wasFinished) {
      this.callbacks.onFinished();
    }
  }

  /**
   * Hide results.
   */
  hideResults() {
    if (!this.isShowingResults) {
      return;
    }

    this.isShowingResults = false;

    this.resultScreen.hide();
    this.contents.classList.remove('display-none');
    this.buttonBarHeader.getDOM().classList.remove('display-none');
    this.buttonBarFooter.getDOM().classList.remove('display-none');

    this.params.globals.get('resize')();
  }

  /**
   * Handle user wants to see solutions.
   */
  handleShowSolutions() {
    this.showSolutions();
    this.hideResults();
    // Pages were not rendered while results were shown, so no transition possible
    this.swipeTo(0, { instant: true });
  }

  /**
   * Reset.
   * @param {object} [options] Options.
   * @param {boolean} [options.skipTimers] If true, don't start timers.
   * @param {boolean} [options.skipFocus] If false, move focus to first page. Default true.
   */
  reset(options = {}) {
    // Restore audio if user had it turned on before results were shown
    const isAudioOn = this.isAudioOn || this.wasAudioOnBeforeResults;
    this.wasAudioOnBeforeResults = false;
    if (isAudioOn) {
      this.params.jukebox.muteAll();
    }

    this.timeWarningGlobalWasPlayed = false;
    this.isFinished = false;
    this.hideResults();
    this.buttonBarHeader.toggleSolutionMode(false);

    this.timer?.stop();
    this.timeLeft = (this.params.globals.get('params').behaviour.globalTimeLimit || Infinity) * 1000;
    if (!options.skipTimers) {
      this.startTimer();
    }
    this.updateGlobalTime();

    this.pages.forEach((page) => {
      page.reset();
    });

    // Page timer is started by swiping
    this.swipeTo(0, { skipFocus: options.skipFocus ?? true, skipTimer: options.skipTimers, instant: true });

    this.updateNavigationButtons();
    this.updateStatusContainers();

    if (isAudioOn) {
      this.setAudio(true);
    }
  }

  /**
   * Get xAPI data from exercises.
   * @returns {object[]} XAPI data objects used to build report.
   */
  getXAPIData() {
    return this.pages
      .map((page) => {
        return page.getXAPIData();
      })
      .filter((data) => !!data);
  }

  /**
   * Return H5P core's call to store current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {
      ...(this.currentPageIndex >= 0 && { pageIndex: this.currentPageIndex }),
      children: this.pages.map((page) => page.getCurrentState()),
      timeLeft: this.timeLeft,
      isFinished: this.isFinished
    };
  }
}
