/**
 * @param {MediaOption} mediaOption
 * @return {string}
 */
export const serialize = (mediaOption) => {
	const dictMediaOption = {
		'mediaTransportType': mediaOption.mediaTransportType,
		'option': mediaOption.option && {
			'mediaFormat': mediaOption.option.mediaFormat && {
				'type': mediaOption.option.mediaFormat.type
			},
			'drm': mediaOption.option.drm && {
				'type': mediaOption.option.drm.type,
				'clientId': mediaOption.option.drm.clientId,
				'widevine': mediaOption.option.drm.widevine && {
					'separatedStream': mediaOption.option.drm.widevine.separatedStream
				}
			},
			'transmission': mediaOption.option.transmission && {
				'playTime': mediaOption.option.transmission.playTime && {
					'start': mediaOption.option.transmission.playTime.start
				}
			},
			'adaptiveStreaming': mediaOption.option.adaptiveStreaming && {
				'audioOnly': mediaOption.option.adaptiveStreaming.audioOnly,
				/**
				 * Not a typo
				 * @see http://webostv.developer.lge.com/api/web-api/mediaoption-parameter/
				 */
				'apativeResolution': mediaOption.option.adaptiveStreaming.apativeResolution,
				'seamlessPlay': mediaOption.option.adaptiveStreaming.seamlessPlay,
				'maxWidth': mediaOption.option.adaptiveStreaming.maxWidth,
				'maxHeight': mediaOption.option.adaptiveStreaming.maxHeight,
				'bps': mediaOption.option.adaptiveStreaming.bps && {
					'start': mediaOption.option.adaptiveStreaming.bps.start
				}
			},
			'3dMode': mediaOption.option.mode3d
		}
	};

	/**
	 * @param {string} key
	 * @param {*} value
	 * @return {*}
	 */
	const filterEmptyObjects = (key, value) => {
		if (typeof value === 'object' && value !== null) {
			Object.keys(/** @type {!Object} */ (value))
				.forEach((childKey) => {
					if (value[childKey] === undefined) {
						delete value[childKey];
					} else {
						const newValue = filterEmptyObjects(childKey, value[childKey]);
						if (newValue !== undefined) {
							value[childKey] = newValue;
						} else {
							delete value[childKey];
						}
					}
				});

			return Object.keys(/** @type {!Object} */ (value)).length !== 0 ?
				value :
				undefined;
		}
		return value;
	};

	const json = JSON.stringify(dictMediaOption, filterEmptyObjects);
	return json === undefined ? '' : encodeURIComponent(json);
};

/**
 * NOTE: Target will be changed
 * @param {!Object} target
 * @param {!Object} source
 * @return {!Object}
 */
export const merge = (target, source) => {
	const hasKey = Object.prototype.hasOwnProperty;

	Object.keys(source).forEach((key) => {
		const value = source[key];
		const continueCondition = hasKey.call(target, key) && typeof value === 'object';

		if (continueCondition) {
			target[key] = merge(Object(target[key]), Object(value));
		} else {
			target[key] = value;
		}
	});

	return target;
};


/**
 * @see {@link http://webostv.developer.lge.com/api/web-api/mediaoption-parameter/}
 * Note that "3dMode" is renamed to "mode3d" because JS tokens can't start with numbers
 * "apativeResolution" is deliberately left with a typo, that's how it is in webOS docs
 * @typedef {{
 *     mediaTransportType: (string|undefined),
 *     option: ({
 *         mediaFormat: ({
 *             type: (string|undefined)
 *         }|undefined),
 *         drm: ({
 *             type: (string|undefined),
 *             clientId: (string|undefined),
 *             widevine: ({
 *                 separatedStream: boolean
 *             }|undefined)
 *         }|undefined),
 *         transmission: ({
 *             playTime: ({
 *                 start: (number|undefined)
 *             }|undefined)
 *         }|undefined),
 *         adaptiveStreaming: ({
 *             audioOnly: (boolean|undefined),
 *             apativeResolution: (boolean|undefined),
 *             seamlessPlay: (boolean|undefined),
 *             maxWidth: (number|undefined),
 *             maxHeight: (number|undefined),
 *             bps: ({
 *                 start: (number|undefined)
 *             }|undefined)
 *         }|undefined),
 *         mode3d: (string|undefined)
 *     }|undefined)
 * }}
 */
let MediaOption;

export default MediaOption;
