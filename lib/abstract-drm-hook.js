import EventPublisher from 'zb/events/event-publisher';
import {Type} from 'zb/device/drm/drm';
import IDrmClient from 'zb/device/interfaces/i-drm-client';
import MediaOption from './media-option';


/**
 * @abstract
 */
export default class AbstractDrmHook extends EventPublisher {
	/**
	 * @param {IDrmClient} client
	 */
	constructor(client) {
		super();

		/**
		 * @type {Type|string}
		 */
		this.type = client.type;

		/**
		 * @type {string}
		 * @protected
		 */
		this._webosClientDrmType;

		/**
		 * @type {string}
		 * @protected
		 */
		this._mediaOptionDrmType;

		/**
		 * @type {string}
		 * @protected
		 */
		this._drmSystemId;

		/**
		 * @type {string}
		 * @protected
		 */
		this._drmMessageType;

		/**
		 * @type {IDrmClient}
		 * @protected
		 */
		this._client = client;

		/**
		 * @type {PalmServiceBridge}
		 * @protected
		 */
		this._errorSubscription;

		/**
		 * @type {?string}
		 * @protected
		 */
		this._drmMessageId = null;

		/**
		 * @type {Promise}
		 * @protected
		 */
		this._initPromise = null;

		/**
		 * @type {?string}
		 * @protected
		 */
		this._webosClientId = null;

		/**
		 * Fired with: {Error}
		 * @const {string}
		 */
		this.EVENT_ERROR = 'error';

		this._onClientError = (event, error) => this._fireEvent(this.EVENT_ERROR, error);
		this._client.on(this._client.EVENT_ERROR, this._onClientError);

		this._initPromise = this._init();
	}

	/**
	 * @return {Promise}
	 */
	async prepare() {
		await this._initPromise;
		this._assertNotDestroyed();

		await this._client.prepare();
		this._assertNotDestroyed();

		const result = await this._lunaFetch('luna://com.webos.service.drm', 'sendDrmMessage', {
			'clientId': this._webosClientId,
			'msgType': this._drmMessageType,
			'msg': this._getMessage(),
			'drmSystemId': this._drmSystemId
		});
		this._drmMessageId = result['msgId'];
		this._assertNotDestroyed();

		this._errorSubscription = this._lunaRequest('luna://com.webos.service.drm', 'getRightsError', {
			'clientId': this._webosClientId,
			'subscribe': true
		}, (data) => {
			const contentId = data['contentId'];

			if (contentId !== this._drmMessageId || data['returnValue']) {
				return;
			}

			const errorState = {
				'0': 'No license',
				'1': 'Invalid license'
			}[data['errorState']] || 'Unknown DRM error';

			this._fireEvent(this.EVENT_ERROR, new Error(errorState));
		});
	}

	/**
	 * @return {MediaOption}
	 */
	getMediaOption() {
		return {
			option: {
				drm: {
					type: this._mediaOptionDrmType,
					clientId: /** @type {string} */ (this._webosClientId)
				}
			}
		};
	}

	/**
	 * @return {Promise}
	 */
	async destroy() {
		this._client.off(this._client.EVENT_ERROR, this._onClientError);
		this._client = null;
		this._initPromise = null;

		if (this._errorSubscription) {
			this._errorSubscription.cancel();
		}

		if (this._webosClientId) {
			await this._unloadClient(this._webosClientId)
				.catch((error) => {
					console.error(error); // eslint-disable-line no-console
				});
		}

		this._webosClientId = null;
	}

	/**
	 * @return {Promise}
	 * @protected
	 */
	async _init() {
		await this._unloadPreviousClient();
		this._assertNotDestroyed();

		const load = this._lunaFetch('luna://com.webos.service.drm', 'load', {
			'drmType': this._webosClientDrmType,
			'appId': PalmSystem.identifier
		});

		const result = await Promise.all([
			load,
			this._client.init()
		]);
		// Workaround for JSC_PARTIAL_NAMESPACE
		const [clientResult] = result;

		this._webosClientId = clientResult['clientId'];
	}

	/**
	 * destroy can be called in any moment, including during asynchronous initialization,
	 * with how volatile DRM we need to make sure no unnecessary actions are made after abrupt destruction
	 * @throws {Error}
	 * @protected
	 */
	_assertNotDestroyed() {
		if (!this._initPromise) {
			throw new Error('DRM hook was destroyed during preparation');
		}
	}

	/**
	 * @abstract
	 * @return {string}
	 * @protected
	 */
	_getMessage() {}

	/**
	 * @param {string} url
	 * @param {string} method
	 * @param {Object} parameters
	 * @param {function(Object)} callback
	 * @return {?}
	 * @protected
	 */
	_lunaRequest(url, method, parameters, callback) {
		const bridge = new PalmServiceBridge();
		bridge.onservicecallback = (data) => {
			/**
			 * @type {Object}
			 */
			let message;
			try {
				message = /** @type {Object} */ (JSON.parse(data));
			} catch (e) {
				message = {
					'errorCode': -1,
					'errorText': data
				};
			}

			if (message['errorCode'] || message['returnValue'] === false) {
				this._onLunaError(message);
				throw new Error(message['errorText']);
			} else {
				callback(message);
			}
		};
		bridge.call(`${url}/${method}`, JSON.stringify(parameters));

		return bridge;
	}

	/**
	 * @param {string} url
	 * @param {string} method
	 * @param {Object} parameters
	 * @return {Promise<Object>}
	 * @protected
	 */
	async _lunaFetch(url, method, parameters) {
		return new Promise((resolve) => {
			this._lunaRequest(url, method, parameters, resolve);
		});
	}

	/**
	 * @return {Promise}}
	 * @protected
	 */
	async _unloadPreviousClient() {
		const isLoadedResult = await this._lunaFetch('luna://com.webos.service.drm', 'isLoaded', {
			'appId': PalmSystem.identifier
		});

		this._assertNotDestroyed();
		if (isLoadedResult && isLoadedResult['clientId']) {
			await this._unloadClient(isLoadedResult['clientId']);
		}
	}

	/**
	 * @param {?string} clientId
	 * @return {Promise}
	 * @protected
	 */
	async _unloadClient(clientId) {
		await this._lunaFetch('luna://com.webos.service.drm', 'unload', {
			'clientId': clientId
		});
	}

	/**
	 * @param {Object} data
	 * @protected
	 */
	_onLunaError(data) {
		const message = [
			'Luna service DRM request error',
			data['errorCode'],
			data['errorText']
		]
			.filter((value) => value !== undefined)
			.join(' ');
		this._fireEvent(this.EVENT_ERROR, new Error(message));
	}
}
