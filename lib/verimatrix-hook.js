import VerimatrixClient from 'zb/device/drm/verimatrix-client';
import AbstractDrmHook from './abstract-drm-hook';


/**
 */
export default class VerimatrixHook extends AbstractDrmHook {
	/**
	 * @param {VerimatrixClient} client
	 */
	constructor(client) {
		super(client);

		/**
		 * @override
		 * @type {VerimatrixClient}
		 */
		this._client = client;

		/**
		 * @override
		 */
		this._webosClientDrmType = 'viewright_web';

		/**
		 * @override
		 */
		this._mediaOptionDrmType = 'verimatrix';

		/**
		 * @override
		 */
		this._drmSystemId = '0x5601';

		/**
		 * @override
		 */
		this._drmMessageType = 'json';
	}

	/**
	 * @override
	 */
	_getMessage() {
		const params = this._client.getParams();

		return JSON.stringify({
			'company_name': params.company || '',
			'vcas_boot_address': params.address || ''
		});
	}
}
