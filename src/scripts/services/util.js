import { decode } from 'he';

/** Class for utility functions */
export default class Util {
  /**
   * Extend an object just like JQuery's extend.
   * @param {object} target Target.
   * @param {...object} sources Sources.
   * @returns {object} Merged objects.
   */
  static extend(target, ...sources) {
    sources.forEach((source) => {
      for (let key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          if (key === '__proto__' || key === 'constructor') {
            continue; // Prevent prototype pollution
          }

          if (source[key] === undefined) {
            continue;
          }

          if (
            typeof target[key] === 'object' && !Array.isArray(target[key]) &&
            typeof source[key] === 'object' && !Array.isArray(source[key])
          ) {
            this.extend(target[key], source[key]);
          }
          else if (Array.isArray(source[key])) {
            target[key] = source[key].slice();
          }
          else {
            target[key] = source[key];
          }
        }
      }
    });
    return target;
  }

  /**
   * Format language tag (RFC 5646). Assuming "language-coutry". No validation.
   * Cmp. https://tools.ietf.org/html/rfc5646
   * @param {string} languageCode Language tag.
   * @returns {string} Formatted language tag.
   */
  static formatLanguageCode(languageCode) {
    if (typeof languageCode !== 'string') {
      return languageCode;
    }

    /*
     * RFC 5646 states that language tags are case insensitive, but
     * recommendations may be followed to improve human interpretation
     */
    const segments = languageCode.split('-');
    segments[0] = segments[0].toLowerCase(); // ISO 639 recommendation
    if (segments.length > 1) {
      segments[1] = segments[1].toUpperCase(); // ISO 3166-1 recommendation
    }
    languageCode = segments.join('-');

    return languageCode;
  }

  /**
   * Call callback function once dom element gets visible in viewport.
   * @param {HTMLElement} dom DOM element to wait for.
   * @param {function} callback Function to call once DOM element is visible.
   */
  static callOnceVisible(dom, callback) {
    if (typeof dom !== 'object' || typeof callback !== 'function') {
      return; // Invalid arguments
    }

    // iOS is behind ... Again ...
    const idleCallback = window.requestIdleCallback ?
      window.requestIdleCallback :
      window.requestAnimationFrame;

    idleCallback(() => {
      // Get started once visible and ready
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          observer.unobserve(dom);
          callback();
        }
      }, {
        threshold: 0
      });
      observer.observe(dom);
    });
  }

  /**
   * HTML decode and strip HTML.
   * @param {string|object} html html.
   * @returns {string} html value.
   */
  static purifyHTML(html) {
    if (typeof html !== 'string') {
      return '';
    }

    let text = decode(html);
    const div = document.createElement('div');
    div.innerHTML = text;
    text = div.textContent || div.innerText || '';

    return text;
  }
}
