import PlayReadyClient from 'zb/device/drm/playready-client';
import AbstractDrmHook from './abstract-drm-hook';


/**
 */
export default class PlayReadyHook extends AbstractDrmHook {
	/**
	 * @param {PlayReadyClient} client
	 */
	constructor(client) {
		super(client);

		/**
		 * @override
		 * @type {PlayReadyClient}
		 */
		this._client = client;

		/**
		 * @override
		 */
		this._webosClientDrmType = 'playready';

		/**
		 * @override
		 */
		this._mediaOptionDrmType = 'playready';

		/**
		 * @override
		 */
		this._drmSystemId = 'urn:dvb:casystemid:19219';

		/**
		 * @override
		 */
		this._drmMessageType = 'application/vnd.ms-playready.initiator+xml';
	}

	/**
	 * @override
	 */
	_getMessage() {
		return '<?xml version="1.0" encoding="utf-8"?>' +
			'<PlayReadyInitiator xmlns="http://schemas.microsoft.com/DRM/2007/03/protocols/">' +
			(
				this._client.licenseServer ?
					'<LicenseServerUriOverride>' +
					'<LA_URL>' + this._client.licenseServer + '</LA_URL>' +
					'</LicenseServerUriOverride>' :
					''
			) +
			'<SetCustomData>' +
			'<CustomData>' + (this._client.getCustomData() || '') + '</CustomData>' +
			'</SetCustomData>' +
			'</PlayReadyInitiator>';
	}
}
