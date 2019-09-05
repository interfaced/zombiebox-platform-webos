/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2014-2019, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import AbstractInput from 'zb/device/abstract-input';
import UnsupportedFeature from 'zb/device/errors/unsupported-feature';
import Keys from 'zb/device/input/keys';


/**
 */
export default class Input extends AbstractInput {
	/**
	 */
	constructor() {
		super();

		this.disablePointingDeviceIdle();
	}

	/**
	 * @override
	 */
	isPointingDeviceSupported() {
		return true;
	}

	/**
	 * @override
	 */
	isPointingDeviceActive() {
		return true;
	}

	/**
	 * @override
	 */
	enablePointingDevice() {
		throw new UnsupportedFeature('Pointing device enabling');
	}

	/**
	 * @override
	 */
	disablePointingDevice() {
		throw new UnsupportedFeature('Pointing device disabling');
	}

	/**
	 * @override
	 */
	_createKeysMap() {
		const map = {};

		map[403] = Keys.RED;
		map[404] = Keys.GREEN;
		map[405] = Keys.YELLOW;
		map[406] = Keys.BLUE;

		map[37] = Keys.LEFT;
		map[38] = Keys.UP;
		map[39] = Keys.RIGHT;
		map[40] = Keys.DOWN;

		map[13] = Keys.ENTER;
		map[461] = Keys.BACK;

		map[48] = Keys.DIGIT_0;
		map[49] = Keys.DIGIT_1;
		map[50] = Keys.DIGIT_2;
		map[51] = Keys.DIGIT_3;
		map[52] = Keys.DIGIT_4;
		map[53] = Keys.DIGIT_5;
		map[54] = Keys.DIGIT_6;
		map[55] = Keys.DIGIT_7;
		map[56] = Keys.DIGIT_8;
		map[57] = Keys.DIGIT_9;

		map[19] = Keys.PAUSE;
		map[415] = Keys.PLAY;
		map[413] = Keys.STOP;
		map[417] = Keys.FWD;
		map[412] = Keys.REW;

		map[1056] = Keys.MENU;
		map[457] = Keys.INFO;
		map[33] = Keys.PAGE_UP;
		map[34] = Keys.PAGE_DOWN;

		return map;
	}

	/**
	 * @override
	 */
	_listenForPointingState() {
		const activatePointing = this._setPointingStateActive.bind(this);
		const deactivatePointing = this._setPointingStateInactive.bind(this);

		const cursorVisibilityChange = (event) => {
			if (event && event.detail && event.detail.visibility) {
				activatePointing();
			} else {
				deactivatePointing();
			}
		};

		document.addEventListener('cursorStateChange', cursorVisibilityChange, false);
	}
}
