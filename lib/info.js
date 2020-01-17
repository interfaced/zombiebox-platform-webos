/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2014-2019, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import {warn} from 'zb/console/console';
import AbstractInfo from 'zb/device/abstract-info';
import {findLargest, Resolution} from 'zb/device/resolutions';
import Rect from 'zb/geometry/rect';
import UnsupportedFeature from 'zb/device/errors/unsupported-feature';


/**
 */
export default class Info extends AbstractInfo {
	/**
	 * @param {ServiceRequester} requestService
	 */
	constructor(requestService) {
		super();

		/**
		 * @type {ServiceRequester}
		 * @protected
		 */
		this._requestService = requestService;

		/**
		 * @type {SystemInformation}
		 * @protected
		 */
		this._systemInformation;
	}

	/**
	 * @override
	 */
	type() {
		return 'webos';
	}

	/**
	 * @override
	 */
	manufacturer() {
		return 'LG Electronics';
	}

	/**
	 * @override
	 */
	serialNumber() {
		throw new UnsupportedFeature('Serial number getting');
	}

	/**
	 * @override
	 */
	model() {
		const {modelName} = this.getSystemInformation();
		if (modelName !== undefined) {
			return modelName;
		}
		throw new UnsupportedFeature('Model name getting');
	}

	/**
	 * Example: "3.6.0"
	 * @override
	 */
	version() {
		const {sdkVersion} = this.getSystemInformation();
		if (sdkVersion !== undefined) {
			return sdkVersion;
		}
		throw new UnsupportedFeature('Version getting');
	}

	/**
	 * Example: "03.60.01"
	 * @override
	 */
	softwareVersion() {
		const {firmwareVersion} = this.getSystemInformation();
		if (firmwareVersion !== undefined) {
			return firmwareVersion;
		}
		throw new UnsupportedFeature('Software version getting');
	}

	/**
	 * Example: "M2R_DVB_EU"
	 * @override
	 */
	hardwareVersion() {
		const {boardType} = this.getSystemInformation();
		if (boardType !== undefined) {
			return boardType;
		}
		throw new UnsupportedFeature('Hardware version getting');
	}

	/**
	 * @override
	 */
	getPanelResolution() {
		return this.getOSDResolution();
	}

	/**
	 * @override
	 */
	getOSDResolution() {
		return findLargest(new Rect({
			x0: 0,
			y0: 0,
			x1: window.innerWidth,
			y1: window.innerHeight
		})) || Resolution.HD;
	}

	/**
	 * @return {Promise}
	 */
	init() {
		this._systemInformation = {};

		const getSystemInfo = this._requestService(
			'luna://com.webos.service.tv.systemproperty',
			'getSystemInfo',
			{
				'keys': [
					'firmwareVersion',
					'modelName',
					'sdkVersion',
					'UHD'
				]
			}
		).then(
			(systemInfo) => {
				this._systemInformation.firmwareVersion = systemInfo['firmwareVersion'];
				this._systemInformation.modelName = systemInfo['modelName'];
				this._systemInformation.sdkVersion = systemInfo['sdkVersion'];
				this._systemInformation.UHD = systemInfo['UHD'] !== 'false';
			},
			(error) => warn(`Failed to fetch system info: ${error}`)
		);

		const getBoardType = this._requestService(
			'luna://com.webos.service.tv.systemproperty',
			'getSystemInfo',
			{
				'keys': [
					'boardType'
				]
			}
		).then(
			(systemInfo) => {
				if (systemInfo['boardType']) {
					this._systemInformation.boardType = systemInfo['boardType'];
				} else {
					warn('boardType is available only on webOS 2.x and later');
				}
			},
			(error) => warn(`Failed to fetch system info: ${error}`)
		);

		const getSystemSettings = this._requestService(
			'luna://com.webos.settingsservice',
			'getSystemSettings',
			{
				'keys': [
					'localeInfo'
				]
			}
		).then(
			(systemSettings) => {
				this._systemInformation.locale = systemSettings['settings']['localeInfo']['locales']['UI'];
			},
			(error) => warn(`Failed to fetch system locale: ${error}`)
		);

		const getDeviceIds = this._requestService(
			'luna://com.webos.service.sm',
			'deviceid/getIDs',
			{
				'idType': [
					'LGUDID'
				]
			}
		).then(
			(deviceIds) => {
				if (deviceIds['idList'] && deviceIds['idList'][0] && deviceIds['idList'][0]['idValue']) {
					this._systemInformation.udid = deviceIds['idList'][0]['idValue'];
				} else {
					warn('LGUDID is only available on webOS 3.x and later');
				}
			},
			(error) => warn(`Failed to fetch device id: ${error}`)
		);

		const getConnectionStatus =
			getSystemInfo
				.then(() => {
					const versionString = this._systemInformation.sdkVersion || '0.0.0';
					const majorVersion = parseInt(versionString.split('.')[0], 10);
					return majorVersion >= 2 ?
						'luna://com.webos.service.connectionmanager' :
						'luna://com.palm.connectionmanager';
				})
				.then((serviceUrl) => this._requestService(serviceUrl, 'getstatus', {}))
				.then(
					(connectionStatus) => {
						if (connectionStatus['wired']['state'] === 'connected') {
							this._systemInformation.ip = connectionStatus['wired']['ipAddress'];
						} else if (connectionStatus['wifi']['state'] === 'connected') {
							this._systemInformation.ip = connectionStatus['wifi']['ipAddress'];
						}
					},
					(error) => warn(`Failed to fetch connection status: ${error.message}`)
				);

		return Promise.allSettled([getSystemInfo, getBoardType, getSystemSettings, getDeviceIds, getConnectionStatus])
			.then(() => {/* consume values */});
	}

	/**
	 * @return {number}
	 */
	getMajorVersionNumber() {
		const version = this.version();
		const exp = /^(\d+)\./;

		return parseInt(exp.test(version) ? exp.exec(version)[1] : NaN, 10);
	}

	/**
	 * @return {SystemInformation}
	 */
	getSystemInformation() {
		return this._systemInformation;
	}

	/**
	 * @override
	 */
	_getLocale() {
		const {locale} = this.getSystemInformation();
		if (locale !== undefined) {
			return locale;
		}
		throw new UnsupportedFeature('Locale version getting');
	}
}


/**
 * Note: `udid` is available in WebOS 3.x and later
 * Note: `boardType` is available in WebOS 2.x and later
 * @typedef {{
 *     udid: (string|undefined),
 *     firmwareVersion: (string|undefined),
 *     modelName: (string|undefined),
 *     sdkVersion: (string|undefined),
 *     boardType: (string|undefined),
 *     UHD: (boolean|undefined),
 *     locale: (string|undefined),
 *     ip: (string|undefined)
 * }}
 */
export let SystemInformation;


/**
 * @typedef {function(string, string, Object): Promise<Object>}
 */
export let ServiceRequester;
