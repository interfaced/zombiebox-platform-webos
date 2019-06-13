/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2014-2019, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import {State} from 'zb/device/interfaces/i-video';
import {warn} from 'zb/console/console';
import HTML5Video from 'zb/device/common/HTML5-video';
import ViewPort from './view-port';


/**
 */
export default class Video extends HTML5Video {
	/**
	 * @param {HTMLElement} videoContainer
	 */
	constructor(videoContainer) {
		super(videoContainer);

		/**
		 * @type {ViewPort}
		 * @protected
		 */
		this._viewport;

		/**
		 * @type {?string}
		 * @protected
		 */
		this._mimeType = null;

		/**
		 * @type {MediaOption}
		 * @protected
		 */
		this._mediaOption = {};
	}

	/**
	 * @override
	 */
	play(url, startFrom) {
		// Initializing _startTime before initialize video object
		this._startTime = startFrom || NaN;

		this._initVideoObject(url);
		this._setState(State.LOADING);

		this._video.play();
	}

	/**
	 * Set mimeType to null for auto-detecting MIME type
	 * but this disable startFromPosition feature.
	 * @param {?string} mimeType
	 */
	setMimeType(mimeType) {
		this._mimeType = mimeType;
	}

	/**
	 * @param {MediaOption} mediaOption
	 */
	setMediaOption(mediaOption) {
		this._mediaOption = mediaOption;
	}

	/**
	 * @override
	 */
	_createVideoObject() {
		const videoObject = super._createVideoObject();
		const startTimeMediaOption = this._startTime ?
			Video.createStartTimeMediaOption(this._startTime) :
			{};

		const resultMediaOption = /** @type {MediaOption} */ (
			this._deepAssign(
				startTimeMediaOption,
				this._mediaOption || {}
			)
		);

		this._applyTypeAttribute(resultMediaOption);

		return videoObject;
	}

	/**
	 * @override
	 */
	_createViewPort(containerRect) {
		this._innerVideoContainer = this._createInnerVideoContainer();

		return new ViewPort(containerRect, this._innerVideoContainer, this._video);
	}

	/**
	 * @override
	 */
	_initEvents() {
		super._initEvents();

		this._replaceEventListener('loadedmetadata', () => {
			this._fireEvent(this.EVENT_LOADED_META_DATA);
		});

		this._replaceEventListener('playing', () => {
			this._setState(State.PLAYING);
			this._fireEvent(this.EVENT_PLAY);
		});
	}

	/**
	 * @param {string} event
	 * @param {Function} listener
	 * @protected
	 */
	_replaceEventListener(event, listener) {
		this._video.removeEventListener(event, this._eventListeners[event], false);
		this._eventListeners[event] = listener;
		this._video.addEventListener(event, this._eventListeners[event], false);
	}

	/**
	 * @param {MediaOption} mediaOption
	 * @protected
	 */
	_applyTypeAttribute(mediaOption) {
		if (this._mimeType) {
			const serializedMediaOption = Video.serializeMediaOption(mediaOption);
			this._source.setAttribute(
				'type',
				`${this._mimeType};mediaOption=${serializedMediaOption}`
			);
		} else if (this._mediaOption && Object.keys(this._mediaOption).length !== 0) {
			warn('Without setting correct MIME type, mediaOption will not work.');
		}
	}

	/**
	 * NOTE: Target will be changed
	 * @param {!Object} target
	 * @param {!Object} source
	 * @return {!Object}
	 * @protected
	 */
	_deepAssign(target, source) {
		const hasKey = Object.prototype.hasOwnProperty;

		Object.keys(source).forEach((key) => {
			const value = source[key];
			const continueCondition = hasKey.call(target, key) && typeof value === 'object';

			if (continueCondition) {
				target[key] = this._deepAssign(Object(target[key]), Object(value));
			} else {
				target[key] = value;
			}
		});

		return target;
	}

	/**
	 * @param {number} startTime
	 * @return {MediaOption}
	 */
	static createStartTimeMediaOption(startTime) {
		return /** @type {MediaOption} */ ({
			option: {
				transmission: {
					playTime: {
						start: startTime
					}
				}
			}
		});
	}

	/**
	 * @param {MediaOption} mediaOption
	 * @return {string}
	 */
	static serializeMediaOption(mediaOption) {
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

		return encodeURIComponent(JSON.stringify(dictMediaOption, filterEmptyObjects));
	}
}


/**
 * @link http://webostv.developer.lge.com/api/web-api/mediaoption-parameter/
 * Note that "3dMode" is renamed to "mode3d" because JS tokens can't start with numbers
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
export let MediaOption;
