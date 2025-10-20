import { emitter } from "./Emitter.js";

/**
 * loading
 * ready
 * paused
 * playing
 * done
 */
function createRef(initial) {
	let _value = initial;
	const listeners = new Set();

	return {
		get value() {
			return _value;
		},
		set value(v) {
			const old = _value;
			_value = v;
			if (v !== old) {
				for (const cb of listeners) cb(v, old);
			}
		},
		onChange(cb) {
			listeners.add(cb);
			return () => listeners.delete(cb);
		},
	};
}

export const gameState = createRef("loading");

// forward changes to the emitter to preserve original behavior
gameState.onChange((newVal) => {
	emitter.emit("game-state", newVal);
});
