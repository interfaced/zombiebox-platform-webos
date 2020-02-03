/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2014-2020, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import {Common} from 'zb/device/aspect-ratio/proportion';
import {Transferring} from 'zb/device/aspect-ratio/aspect-ratio';
import HTML5ViewPort from 'zb/device/common/HTML5-view-port';


/**
 */
export default class ViewPort extends HTML5ViewPort {
	/**
	 * @override
	 */
	isAspectRatioSupported(ratio) {
		const transferring = ratio.getTransferring();
		const proportion = ratio.getProportion();

		const isProportionAuto = proportion === Common.AUTO;
		const isTransferringAutoOrCrop = transferring === Transferring.AUTO || transferring === Transferring.CROP;

		return isProportionAuto && isTransferringAutoOrCrop;
	}

	/**
	 * @override
	 */
	updateViewPort() {
		super.updateViewPort();

		this._forceRedraw(this._video);
	}

	/**
	 * @param {HTMLElement} element
	 * @protected
	 */
	_forceRedraw(element) {
		const displayState = element.style.display;
		element.style.display = 'none';

		window.hashForceRedraw = element.offsetHeight;

		element.style.display = displayState;
	}
}
