/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2014-2020, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import {State} from 'zb/device/interfaces/i-stateful-video';
import {NativeReadyState} from 'zb/device/common/stateful-html5-video';
import StatefulHtml5Video from './stateful-html5-video';


/**
 */
export default class LegacyStatefulHtml5Video extends StatefulHtml5Video {
	/**
	 * @override
	 */
	_onNativePlaying() {
		if (this._stateMachine.getCurrentState() === State.PLAYING) {
			this._fireEvent(
				this.EVENT_DEBUG_MESSAGE,
				'legacy webos html5 skipped html5 play event'
			);
			return;
		}

		super._onNativePlaying();
	}

	/**
	 * @override
	 */
	_onNativeSeeked() {
		const stateBefore = this._stateBeforeSeeking;

		super._onNativeSeeked();

		if (
			this._videoElement.readyState >= NativeReadyState.HAVE_FUTURE_DATA &&
			stateBefore === State.PLAYING &&
			this._stateMachine.isIn(State.SEEKING)
		) {
			this._fireEvent(
				this.EVENT_DEBUG_MESSAGE,
				'legacy webos html5 jumped to PLAYING without waiting for play event'
			);

			this._stateMachine.setState(State.PLAYING);
		}
	}
}
