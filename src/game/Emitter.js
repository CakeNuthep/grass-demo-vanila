// Minimal event emitter to replace the mitt dependency
function createEmitter() {
	const handlers = Object.create(null);

	return {
		on(type, handler) {
			;(handlers[type] ||= new Set()).add(handler);
		},
		off(type, handler) {
			const set = handlers[type];
			if (set) set.delete(handler);
		},
		emit(type, event) {
			const set = handlers[type];
			if (set) {
				// copy to prevent mutation during iteration
				for (const h of Array.from(set)) h(event);
			}
		},
		once(type, handler) {
			const wrapper = (ev) => {
				handler(ev);
				this.off(type, wrapper);
			};
			this.on(type, wrapper);
		},
	};
}

const emitter = createEmitter();

export { emitter };
