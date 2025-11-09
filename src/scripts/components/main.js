import Screenreader from '@services/screenreader.js';
import Util from '@services/util.js';
import Timer from '@services/timer.js';
import HeaderBar from '@components/button-bars/header-bar.js';
import FooterBar from '@components/button-bars/footer-bar.js';
import Page from '@components/page/page.js';
import StatusContainers from '@components/button-bars/status-containers/status-containers.js';
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
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
      onProgressed: () => {}
    }, callbacks);

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
            if (typeof values.before === 'number' && typeof values.after === 'number') {
              const scoreChange = values.after - values.before;
              if (scoreChange < 0) {
                this.params.jukebox.play('lostLife');
              }
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
        id: 'score',
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
          this.toggleAudio(on);
        },
        onClickButtonFullscreen: () => {
          console.warn('Fullscreen button clicked');
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

    // Screenreader for polite screen reading
    document.body.append(Screenreader.getDOM());

    this.timer = new Timer(
      { interval: 500 },
      {
        onTick: () => {
          this.timeLeft = this.timer.getTime();
          this.updateGlobalTime();
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
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Content DOM.
   */
  getDOM() {
    return this.dom;
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

    if (from === to) {
      // No transition needed
      this.handleUpdatePagePositionsEnded({ skipFocus: options.skipFocus });
    }
    else {
      this.pages[to].registerTransitionEnd(() => {
        this.handleUpdatePagePositionsEnded({ skipFocus: options.skipFocus });
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
    });

    if (this.timeLeft > 0) {
      this.pages[this.currentPageIndex].startTimer();
    }

    this.params.jukebox.play('goto');
    this.callbacks.onProgressed(this.currentPageIndex);
  }

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

  startTimer() {
    if (!this.timer) {
      return; // Timer not set or already running
    }

    this.timer.start(this.timeLeft);
    this.updateGlobalTime();
  }

  /**
   * Update status containers.
   */
  updateStatusContainers() {
    this.updateExerciseTime();
    this.updateExerciseAttempts();
    this.updateScoreDisplay();
  }

  updateExerciseTime() {
    const currentPage = this.pages[this.currentPageIndex];
    this.statusContainersExercise.setStatus('time', { value: currentPage.getTimeLeftTimecode() });
  }

  updateGlobalTime() {
    this.statusContainersGlobal.setStatus('time', { value: Timer.toTimecode(this.timeLeft) });
  }

  updateExerciseAttempts() {
    const currentPage = this.pages[this.currentPageIndex];
    this.statusContainersExercise.setStatus('attempts', { value: currentPage.getAttemptsLeft() });
  }

  updateScoreDisplay() {
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
  }

  /**
   * Reset.
   */
  reset() {
    const isAudioOn = this.isAudioOn;
    if (isAudioOn) {
      this.params.jukebox.muteAll();
    }

    this.timer?.stop();
    this.timeLeft = (this.params.globals.get('params').behaviour.globalTimeLimit || Infinity) * 1000;
    this.startTimer();

    this.pages.forEach((page) => {
      page.reset();
    });

    this.swipeTo(0, { skipFocus: true });
    this.pages[0].startTimer();

    this.updateNavigationButtons();
    this.updateStatusContainers();

    if (isAudioOn) {
      this.params.jukebox.unmuteAll();
      this.params.jukebox.play('backgroundMusic');
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
      timeLeft: this.timeLeft
    };
  }
}
