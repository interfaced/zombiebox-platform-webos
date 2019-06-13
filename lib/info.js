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
import {Resolution} from 'zb/device/resolutions';
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
		return this.getSystemInformation().modelName;
	}

	/**
	 * Example: "3.6.0"
	 * @override
	 */
	version() {
		return this.getSystemInformation().sdkVersion;
	}

	/**
	 * Example: "03.60.01"
	 * @override
	 */
	softwareVersion() {
		return this.getSystemInformation().firmwareVersion;
	}

	/**
	 * Example: "M2R_DVB_EU"
	 * @override
	 */
	hardwareVersion() {
		return this.getSystemInformation().boardType;
	}

	/**
	 * @override
	 */
	osdResolutionType() {
		const resolutions = this._getResolutionsByScreenSize(window.innerWidth, window.innerHeight);

		return resolutions[0] || Resolution.HD;
	}

	/**
	 * @return {IThenable}
	 */
	init() {
		const getSystemInfo = this._requestService(
			'luna://com.webos.service.tv.systemproperty', 'getSystemInfo',
			{
				'keys': [
					'firmwareVersion',
					'modelName',
					'sdkVersion',
					'UHD'
				]
			});

		const getSystemSettings = this._requestService(
			'luna://com.webos.settingsservice', 'getSystemSettings',
			{
				'keys': [
					'localeInfo'
				]
			});

		const getDeviceIds = this._requestService(
			'luna://com.webos.service.sm', 'deviceid/getIDs',
			{
				'idType': [
					'LGUDID'
				]
			})
			.then(null, () => ({}));

		const getBoardType = this._requestService(
			'luna://com.webos.service.tv.systemproperty', 'getSystemInfo',
			{
				'keys': [
					'boardType'
				]
			})
			.then((info) => info['boardType'], () => undefined);

		const getConnectionStatus = this._requestService(
			'luna://com.palm.connectionmanager', 'getStatus',
			{});

		return Promise.all([getSystemInfo, getSystemSettings, getDeviceIds, getBoardType, getConnectionStatus])
			.then(([systemInfo, systemSettings, deviceIds, boardType, connectionStatus]) => {
				let udid = '';

				if (deviceIds['idList'] && deviceIds['idList'][0] && deviceIds['idList'][0]['idValue']) {
					udid = deviceIds['idList'][0]['idValue'];
				} else {
					warn('LGUDID is available only on webOS 3.x and later');
				}

				if (!boardType) {
					warn('boardType is available only on webOS 2.x and later');
				}

				let ipAddress = '';
				if (connectionStatus['wired']['state'] === 'connected') {
					ipAddress = connectionStatus['wired']['ipAddress'];
				} else if (connectionStatus['wifi']['state'] === 'connected') {
					ipAddress = connectionStatus['wifi']['ipAddress'];
				}

				this._systemInformation = {
					udid,
					firmwareVersion: systemInfo['firmwareVersion'],
					modelName: systemInfo['modelName'],
					sdkVersion: systemInfo['sdkVersion'],
					boardType: boardType || '',
					UHD: systemInfo['UHD'] !== 'false',
					locale: systemSettings['settings']['localeInfo']['locales']['UI'],
					ip: ipAddress
				};
			});
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
		return this._systemInformation.locale;
	}
}


/**
 * Note: `udid` is available in WebOS 3.x and later
 * Note: `boardType` is available in WebOS 2.x and later
 * @typedef {{
 *     udid: string,
 *     firmwareVersion: string,
 *     modelName: string,
 *     sdkVersion: string,
 *     boardType: string,
 *     UHD: boolean,
 *     locale: string,
 *     ip: string
 * }}
 */
export let SystemInformation;


/**
 * @typedef {function(string, string, Object): IThenable<Object>}
 */
export let ServiceRequester;
