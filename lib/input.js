/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2014-2020, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import AbstractInput from 'zb/device/abstract-input';
import UnsupportedFeature from 'zb/device/errors/unsupported-feature';
import Key from 'zb/device/input/key';


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

		map[403] = Key.RED;
		map[404] = Key.GREEN;
		map[405] = Key.YELLOW;
		map[406] = Key.BLUE;

		map[37] = Key.LEFT;
		map[38] = Key.UP;
		map[39] = Key.RIGHT;
		map[40] = Key.DOWN;

		map[13] = Key.ENTER;
		map[461] = Key.BACK;

		map[48] = Key.DIGIT_0;
		map[49] = Key.DIGIT_1;
		map[50] = Key.DIGIT_2;
		map[51] = Key.DIGIT_3;
		map[52] = Key.DIGIT_4;
		map[53] = Key.DIGIT_5;
		map[54] = Key.DIGIT_6;
		map[55] = Key.DIGIT_7;
		map[56] = Key.DIGIT_8;
		map[57] = Key.DIGIT_9;

		map[19] = Key.PAUSE;
		map[415] = Key.PLAY;
		map[413] = Key.STOP;
		map[417] = Key.FWD;
		map[412] = Key.REW;

		map[1056] = Key.MENU;
		map[457] = Key.INFO;
		map[33] = Key.PAGE_UP;
		map[34] = Key.PAGE_DOWN;

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
