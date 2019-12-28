// These APIs are not documented by LG and their description mostly comes from
// webOSTV.js sources: http://webostv.developer.lge.com/api/webostvjs/ or reverse-engineering

/**
 */
class IPalmSystem {
	/**
	 */
	constructor() {
		/**
		 * @type {string}
		 */
		this.identifier;

		/**
		 * @type {string}
		 */
		this.launchParams;
	}

	/**
	 */
	platformBack() {}
}


/**
 * @type {IPalmSystem}
 */
let PalmSystem;
