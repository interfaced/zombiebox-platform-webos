import {State} from 'zb/device/interfaces/i-stateful-video';
import StatefulHtml5Video from './stateful-html5-video';


/**
 */
export default class LegacyStatefulHtml5Video extends StatefulHtml5Video {
	/**
	 * @override
	 */
	_onNativePlaying() {
		if (this._stateMachine.getCurrentState() === State.PLAYING) {
			return;
		}

		super._onNativePlaying();
	}
}