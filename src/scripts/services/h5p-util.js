import semantics from '@root/semantics.json';

/**
 * Determine whether an H5P instance is a task.
 * @param {H5P.ContentType} instance Instance.
 * @returns {boolean} True, if instance is a task.
 */
export const isInstanceTask = (instance = {}) => {
  if (!instance) {
    return false;
  }

  if (typeof instance.isTask === 'boolean') {
    return instance.isTask; // Content will determine if it's task on its own
  }

  // Check for maxScore > 0 as indicator for being a task
  const hasGetMaxScore = (typeof instance.getMaxScore === 'function');
  if (hasGetMaxScore && instance.getMaxScore() > 0) {
    return true;
  }

  return false;
};

/**
 * Get default values from semantics fields.
 * @param {object[]} start Start semantics field.
 * @returns {object} Default values from semantics.
 */
export const getSemanticsDefaults = (start = semantics) => {
  let defaults = {};

  if (!Array.isArray(start)) {
    return defaults; // Must be array, root or list
  }

  start.forEach((entry) => {
    if (typeof entry.name !== 'string') {
      return;
    }

    if (typeof entry.default !== 'undefined') {
      defaults[entry.name] = entry.default;
    }
    if (entry.type === 'list') {
      defaults[entry.name] = []; // Does not set defaults within list items!
    }
    else if (entry.type === 'group' && entry.fields) {
      const groupDefaults = getSemanticsDefaults(entry.fields);
      if (Object.keys(groupDefaults).length) {
        defaults[entry.name] = groupDefaults;
      }
    }
  });

  return defaults;
};

/**
 * Stupid workaround for H5P core mutating prototype to inject its isRoot.
 * @param {boolean} isStandalone extras.standalone from content's constructor.
 * @returns {boolean} True, if content type is root. Else false.
 */
export const isRoot = (isStandalone) =>{
  return !!isStandalone;
};

/**
 * Stupid workaround for H5P core mutating prototype to inject its getLibraryFilePath.
 * @param {string} filePath Original filePath parameter.
 * @returns {string} versionedNameNoSpaces `${machineName}-${major}-${minor}` like H5P.Gamifier-1.1.
 */
export const getLibraryFilePath = (filePath, versionedNameNoSpaces) => {
  return `${H5P.getLibraryPath(versionedNameNoSpaces)}/${filePath}`;
};
