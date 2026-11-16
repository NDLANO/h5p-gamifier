import Util from '@services/util.js';
import './result-screen.scss';

export default class ResultScreen {
  /**
   * Result screen based on H5P.Components.ResultScreen.
   * @class
   * @param {object} [params] Parameters.
   * @param {object} params.dictionary Dictionary.
   * @param {boolean} [params.showRetryButton] If true, show retry button.
   * @param {boolean} [params.showSolutionsButton] If true, show solutions button.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onRetry] Callback when retry button was clicked.
   * @param {function} [callbacks.onShowSolutions] Callback when show solutions button was clicked.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      showRetryButton: true,
      showSolutionsButton: true
    }, params);

    this.callbacks = Util.extend({
      onRetry: () => {},
      onShowSolutions: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-gamifier-result-screen');
    this.dom.setAttribute('tabindex', '-1');

    this.resultsContainer = document.createElement('div');
    this.resultsContainer.classList.add('h5p-gamifier-result-screen-results');
    this.dom.append(this.resultsContainer);

    const buttons = document.createElement('div');
    buttons.classList.add('h5p-gamifier-result-screen-buttons');

    if (this.params.showSolutionsButton) {
      buttons.append(H5P.Components.Button({
        label: this.params.dictionary.get('l10n.showSolutions'),
        styleType: 'secondary',
        icon: 'show-solutions',
        onClick: () => {
          this.callbacks.onShowSolutions();
        }
      }));
    }

    if (this.params.showRetryButton) {
      buttons.append(H5P.Components.Button({
        label: this.params.dictionary.get('l10n.retry'),
        styleType: 'secondary',
        icon: 'retry',
        onClick: () => {
          this.callbacks.onRetry();
        }
      }));
    }

    if (buttons.children.length) {
      this.dom.append(buttons);
    }

    this.hide();
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Result screen DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Update results. H5P.Components.ResultScreen is static, so it's rebuilt.
   * @param {object} results Results.
   * @param {number} results.score Total score.
   * @param {number} results.maxScore Total maximum score.
   * @param {object[]} results.pages Page results.
   * @param {string} results.pages[].title Page title.
   * @param {boolean} results.pages[].isTask True, if page holds a task.
   * @param {number} results.pages[].score Score of page.
   * @param {number} results.pages[].maxScore Maximum score of page.
   * @param {boolean} results.pages[].visited True, if page was visited.
   */
  update(results = {}) {
    const pages = results.pages ?? [];

    let scoreHeader;
    if (results.maxScore > 0) {
      scoreHeader = this.params.dictionary.get('l10n.scoreBanner')
        .replace(/@score/g, `<span>${results.score}</span>`)
        .replace(/@total/g, `<span>${results.maxScore}</span>`);
    }
    else {
      const visitedCount = pages.filter((page) => page.visited).length;
      scoreHeader = this.params.dictionary.get('l10n.viewedBanner')
        .replace(/@viewed/g, `<span>${visitedCount}</span>`)
        .replace(/@total/g, `<span>${pages.length}</span>`);
    }

    const questions = pages.map((page) => {
      let points;
      if (page.isTask) {
        points = `${page.score}/${page.maxScore}`;
      }
      else {
        points = Util.escapeHTML(page.visited ?
          this.params.dictionary.get('l10n.viewed') :
          this.params.dictionary.get('l10n.notViewed'));
      }

      return {
        title: Util.escapeHTML(Util.purifyHTML(page.title)),
        points: points
      };
    });

    this.resultsContainer.innerHTML = '';
    this.resultsContainer.append(H5P.Components.ResultScreen({
      header: this.params.dictionary.get('l10n.resultsHeader'),
      scoreHeader: scoreHeader,
      questionGroups: [{
        listHeaders: [
          this.params.dictionary.get('l10n.contentColumnHeader'),
          this.params.dictionary.get('l10n.scoreColumnHeader')
        ],
        questions: questions
      }]
    }));
  }

  /**
   * Show result screen.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide result screen.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Focus result screen.
   */
  focus() {
    this.dom.focus();
  }
}
