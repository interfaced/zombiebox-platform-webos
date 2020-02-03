/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2014-2020, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import {error, warn} from 'zb/console/console';
import Rect from 'zb/geometry/rect';
import AbstractDevice from 'zb/device/abstract-device';
import UnsupportedFeature from 'zb/device/errors/unsupported-feature';
import LocalStorage from 'zb/device/common/local-storage';
import {Resolution, ResolutionInfo} from 'zb/device/resolutions';
import StatefulHtml5Video from './stateful-html5-video';
import Info from './info';
import Input from './input';
import Video from './video';
import LegacyStatefulHtml5Video from './legacy-stateful-html5-video';


/**
 */
export default class Device extends AbstractDevice {
	/**
	 */
	constructor() {
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
	 * @param {Rect} rect
	 * @return {Video}
	 */
	createVideo(rect) {
		return new Video(rect);
	}

	/**
	 * @override
	 * @return {StatefulHtml5Video}
	 */
	createStatefulVideo() {
		const panelResolutionInfo = ResolutionInfo[this.info.getPanelResolution() || Resolution.HD];
		const appResolutionInfo = ResolutionInfo[this.info.getOSDResolution() || Resolution.HD];

		if (this.info.getMajorVersionNumber() <= 2) {
			return new LegacyStatefulHtml5Video(
				panelResolutionInfo,
				appResolutionInfo
			);
		}

		return new StatefulHtml5Video(
			panelResolutionInfo,
			appResolutionInfo
		);
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
		const ip = this.info.getSystemInformation().ip;
		if (ip) {
			return ip;
		}
		throw new UnsupportedFeature('IP address getting');
	}

	/**
	 * @override
	 */
	isUHDSupported() {
		return this.info.getSystemInformation().UHD || false;
	}

	/**
	 * @override
	 */
	isUHD8KSupported() {
		return false;
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
		const params = PalmSystem.launchParams;

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
		PalmSystem.platformBack();
	}

	/**
	 * @param {string} uri
	 * @param {string} method
	 * @param {Object} parameters
	 * @return {Promise<Object>}
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
			if (!PalmServiceBridge) {
				error('PalmServiceBridge not found, service request is not possible');
				asap(reject);

				return;
			}

			const bridge = new PalmServiceBridge();
			bridge.onservicecallback = (rawData) => {
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
