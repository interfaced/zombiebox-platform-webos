/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2014-2019, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import {error, warn} from 'zb/console/console';
import AbstractDevice from 'zb/device/abstract-device';
import UnsupportedFeature from 'zb/device/errors/unsupported-feature';
import LocalStorage from 'zb/device/common/local-storage';
import Info from './info';
import Input from './input';
import Video from './video';


/**
 */
export default class Device extends AbstractDevice {
	/**
	 * @param {HTMLElement} videoContainer
	 */
	constructor(videoContainer) {
		super();

		/**
		 * @type {Info}
		 */
		this.info;

		/**
		 * @type {LocalStorage}
		 */
		this.storage;

		/**
		 * @type {Input}
		 */
		this.input;

		/**
		 * @type {HTMLElement}
		 * @protected
		 */
		this._videoContainer = videoContainer;
	}

	/**
	 * @override
	 */
	init() {
		this.info = new Info(Device.requestService);
		this.input = new Input();
		this.storage = new LocalStorage();

		this.info
			.init()
			.then(
				() => this._fireEvent(this.EVENT_READY),
				(error) => {
					warn(`Initialization error: ${error}`);
					this._fireEvent(this.EVENT_READY);
				}
			);
	}

	/**
	 * @override
	 */
	exit() {
		window.close();
	}

	/**
	 * @override
	 * @return {Video}
	 */
	createVideo() {
		return new Video(this._videoContainer);
	}

	/**
	 * @override
	 */
	setOSDOpacity(value) {
		throw new UnsupportedFeature('OSD opacity setting');
	}

	/**
	 * @override
	 */
	getOSDOpacity() {
		throw new UnsupportedFeature('OSD opacity getting');
	}

	/**
	 * @override
	 */
	setOSDChromaKey(chromaKey) {
		throw new UnsupportedFeature('OSD chroma key setting');
	}

	/**
	 * @override
	 */
	getOSDChromaKey() {
		throw new UnsupportedFeature('OSD chroma key getting');
	}

	/**
	 * @override
	 */
	removeOSDChromaKey() {
		throw new UnsupportedFeature('OSD chroma key removing');
	}

	/**
	 * @override
	 */
	hasOSDOpacityFeature() {
		return false;
	}

	/**
	 * @override
	 */
	hasOSDChromaKeyFeature() {
		return false;
	}

	/**
	 * @override
	 */
	getMAC() {
		throw new UnsupportedFeature('MAC address getting');
	}

	/**
	 * @override
	 */
	getIP() {
		return this.info.getSystemInformation().ip;
	}

	/**
	 * @override
	 */
	isUHDSupported() {
		return this.info.getSystemInformation().UHD;
	}

	/**
	 * @override
	 */
	getEnvironment() {
		throw new UnsupportedFeature('Environment getting');
	}

	/**
	 * @override
	 */
	getLaunchParams() {
		const params = window['PalmSystem']['launchParams'];

		if (params) {
			try {
				return /** @type {Object} */ (JSON.parse(params));
			} catch (e) {
				if (e instanceof SyntaxError) {
					warn('Error parsing launch parameters: ' + e.message);
				} else {
					throw e;
				}
			}
		}

		return {};
	}

	/**
	 * @override
	 */
	hasOSDAlphaBlendingFeature() {
		return true;
	}

	/**
	 *
	 */
	showAppsManager() {
		window['PalmSystem']['platformBack']();
	}

	/**
	 * @param {string} uri
	 * @param {string} method
	 * @param {Object} parameters
	 * @return {IThenable<Object>}
	 */
	static requestService(uri, method, parameters) {
		/**
		 * Workaround for bug #3586
		 * @param {Function} func
		 * @param {...*} args
		 */
		function asap(func, ...args) {
			setTimeout(() => {
				func(...args);
			}, 0);
		}

		return new Promise((resolve, reject) => {
			if (!window['PalmServiceBridge']) {
				error('PalmServiceBridge not found, service request is not possible');
				asap(reject);

				return;
			}

			const bridge = new window['PalmServiceBridge']();
			bridge['onservicecallback'] = (rawData) => {
				let data;
				try {
					data = JSON.parse(rawData);
				} catch (e) {
					data = {
						'errorCode': -1,
						'errorText': rawData
					};
				}

				if (data['errorCode'] || data['returnValue'] === false) {
					asap(reject, data['errorText']);
				} else {
					asap(resolve, data);
				}
			};

			let command = uri;
			if (command.charAt(command.length - 1) !== '/') {
				command += '/';
			}
			command += method;

			bridge.call(command, JSON.stringify(parameters));
		});
	}

	/**
	 * @return {boolean}
	 */
	static detect() {
		return /Web0S/.test(navigator.userAgent);
	}
}
