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
import Rect from 'zb/geometry/rect';
import HTML5Video from 'zb/device/common/HTML5-video';
import {ResolutionInfo, findLargest} from 'zb/device/resolutions';
import ViewPort from './view-port';
import MediaOption, {serialize as serializeMediaOption, merge as mergeMediaOption} from './media-option';


/**
 */
export default class Video extends HTML5Video {
	/**
	 * @param {Rect} rect
	 */
	constructor(rect) {
		super(rect);

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
			mergeMediaOption(
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
		// Compatibility with updated viewport
		const panelResolution = ResolutionInfo[findLargest(containerRect)];
		const appResolution = panelResolution;

		return new ViewPort(
			panelResolution,
			appResolution,
			this._container,
			this._video
		);
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
			const serializedMediaOption = serializeMediaOption(mediaOption);
			this._source.setAttribute(
				'type',
				`${this._mimeType};mediaOption=${serializedMediaOption}`
			);
		} else if (this._mediaOption && Object.keys(this._mediaOption).length !== 0) {
			warn('Without setting correct MIME type, mediaOption will not work.');
		}
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
}
