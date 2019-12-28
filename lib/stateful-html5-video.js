import BaseStatefulHtml5Video from 'zb/device/common/stateful-html5-video';
import {State, PrepareOption as BasePrepareOption} from 'zb/device/interfaces/i-stateful-video';
import {node} from 'zb/html';
import {ResolutionInfoItem} from 'zb/device/resolutions';
import UnsupportedFeature from 'zb/device/errors/unsupported-feature';
import {Type as DRMType} from 'zb/device/drm/drm';
import PlayReadyClient from 'zb/device/drm/playready-client';
import VerimatrixClient from 'zb/device/drm/verimatrix-client';
import {serialize as serializeMediaOption, merge as mergeMediaOption} from './media-option';
import AbstractDrmHook from './abstract-drm-hook';
import PlayReadyHook from './playready-hook';
import VerimatrixHook from './verimatrix-hook';


/**
 */
export default class StatefulHtml5Video extends BaseStatefulHtml5Video {
	/**
	 * @param {ResolutionInfoItem} panelResolution
	 * @param {ResolutionInfoItem} appResolution
	 */
	constructor(panelResolution, appResolution) {
		super(panelResolution, appResolution);

		/**
		 * @type {?AbstractDrmHook}
		 * @private
		 */
		this._drmHook = null;

		this._onDRMErrorBound = (event, error) => this._onDRMError(error);
	}

	/**
	 * Use webOS proprietary MediaOption API to set media content type and starting playback position
	 * This is the only way to play dash content
	 * @override
	 */
	prepare(url, options = {}) {
		this._stateMachine.setState(State.LOADING);

		this._sourceElement = /** @type {HTMLSourceElement} */ (node('source'));
		this._sourceElement.setAttribute('src', url);
		this._sourceElement.addEventListener('error', this._onNativeEventGuarded);

		if (BasePrepareOption.START_POSITION in options) {
			this._requestedStartPosition = options[BasePrepareOption.START_POSITION];
		}

		const mimeType = options[BasePrepareOption.TYPE] || null;
		let mediaOption = {};

		const startLoading = () => {
			const serializedMediaOption = serializeMediaOption(mediaOption);

			let type;
			if (mimeType && serializedMediaOption) {
				type = `${mimeType};mediaoption=${serializedMediaOption}`;
			} else if (mimeType) {
				type = mimeType;
			} else if (serializedMediaOption) {
				throw new Error('MediaOption cannot be used without mime-type');
			}

			if (type) {
				this._fireEvent(this.EVENT_DEBUG_MESSAGE, 'media type', type);
				this._sourceElement.setAttribute('type', type);
			}
			this._videoElement.appendChild(this._sourceElement);

			this._videoElement.load();
		};

		if (PrepareOption.MEDIA_OPTION in options) {
			mediaOption = mergeMediaOption(mediaOption, options[PrepareOption.MEDIA_OPTION]);
		}

		if (BasePrepareOption.START_POSITION in options) {
			if (mimeType) {
				// Start position can only be applied via MediaOption api if mime type is known
				mediaOption = mergeMediaOption(mediaOption, {
					option: {
						transmission: {
							playTime: {
								start: options[BasePrepareOption.START_POSITION]
							}
						}
					}
				});
			} else {
				// Otherwise use base implementation that applies it through seeking
				this._reapplyStartPosition();
			}
		}

		if (!this._drmHook) {
			startLoading();
		} else {
			this._drmHook.prepare()
				.then(() => {
					mediaOption = mergeMediaOption(mediaOption, this._drmHook.getMediaOption());
					startLoading();
				}, (error) => {
					if (
						this._stateMachine.isIn(State.DESTROYED) ||
						this._stateMachine.isTransitingTo(State.DESTROYED)
					) {
						// Safe to ignore
						console.error(error); // eslint-disable-line no-console
						this._fireEvent(this.EVENT_DEBUG_MESSAGE, error.message);
					} else {
						this._onError(error instanceof Error ? error : new Error(error));
					}
				});
		}
	}

	/**
	 * @override
	 */
	attachDRM(client) {
		if (client.type === DRMType.PLAYREADY) {
			client = /** @type {PlayReadyClient} */ (client);
			this._drmHook = new PlayReadyHook(client);
			this._drmHook.on(this._drmHook.EVENT_ERROR, this._onDRMErrorBound);
		} else if (client.type === DRMType.VERIMATRIX) {
			client = /** @type {VerimatrixClient} */ (client);
			this._drmHook = new VerimatrixHook(client);
			this._drmHook.on(this._drmHook.EVENT_ERROR, this._onDRMErrorBound);
		} else {
			throw new UnsupportedFeature(`${client.type} DRM`);
		}
	}

	/**
	 * @override
	 */
	detachDRM(type) {
		if (this._drmHook && this._drmHook.type === type) {
			this._drmHook.off(this._drmHook.EVENT_ERROR, this._onDRMErrorBound);
			const promise = this._drmHook.destroy();
			this._drmHook = null;
			return promise;
		}

		return Promise.resolve();
	}

	/**
	 * @override
	 */
	destroy() {
		if (!this._drmHook) {
			super.destroy();
			return;
		}

		this._stateMachine.abortPendingTransition();
		this._stateMachine.startTransitionTo(State.DESTROYED);

		this._destroyDOM();
		this._drmHook.off(this._drmHook.EVENT_ERROR, this._onDRMErrorBound);
		this._drmHook.destroy()
			.then(() => this._stateMachine.setState(State.DESTROYED));
		this._drmHook = null;
	}

	/**
	 * @param {Error} error
	 * @protected
	 */
	_onDRMError(error) {
		this._onError(error);
	}

	/**
	 * @override
	 */
	static isDRMSupported(type) {
		return [
			DRMType.PLAYREADY,
			DRMType.VERIMATRIX
		].includes(type);
	}
}


/**
 * @enum {string}
 */
export const PrepareOption = {
	MEDIA_OPTION: 'webos-media-option'
};
