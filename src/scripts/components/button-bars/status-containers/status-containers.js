import Util from '@services/util.js';
import StatusContainer from './status-container.js';
import './status-containers.scss';

export default class StatusContainers {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
    }, callbacks);

    this.containers = new Map();

    this.dom = document.createElement('div');
    this.dom.classList.add('status-containers');
  }

  /**
   * Get container DOM.
   * @returns {HTMLElement} lives container DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Add container.
   * @param {object} params Parameters for container.
   */
  addContainer(params = {}) {
    if (typeof params.id !== 'string') {
      return;
    }

    const container = new StatusContainer(params);
    this.containers.set(params.id, container);
    this.dom.append(container.getDOM());
  }

  /**
   * Show container.
   * @param {string} id Id of container to show.
   */
  showContainer(id) {
    this.containers.get(id)?.show();
  }

  /**
   * Hide container.
   * @param {string} id Id of container to hide.
   */
  hideContainer(id) {
    this.containers.get(id)?.hide();
  }

  /**
   * Set container status.
   * @param {string} id Id of container to set status for.
   * @param {object} params Parameters to set.
   */
  setStatus(id, params = {}) {
    this.containers.get(id)?.setStatus(params);
  }

  /**
   * Get container status.
   * @param {string} id Id of container to get status for.
   * @returns {object} Status of container, null if not found.
   */
  getStatus(id) {
    return this.containers.get(id)?.getStatus() ?? {};
  }

  /**
   * Animate container.
   * @param {string} id Container id.
   * @param {string|null} animationName Animation name, null to stop animation.
   */
  animate(id, animationName) {
    this.containers.get(id)?.animate(animationName);
  }
}
