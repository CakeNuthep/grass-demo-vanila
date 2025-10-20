import { emitter } from "./Emitter.js";

const savedSettings = {
	fullscreen: true,
	quality: "high",
	vr: false,
};

if (typeof window !== "undefined") {
	if (localStorage.getItem("vr")) {
		savedSettings.vr = localStorage.getItem("vr") == "false" ? false : true;
	}
	// restore other saved values if present
	if (localStorage.getItem("fullscreen")) {
		savedSettings.fullscreen = localStorage.getItem("fullscreen") === "true";
	}
	if (localStorage.getItem("quality")) {
		savedSettings.quality = localStorage.getItem("quality");
	}
}

// Simple reactive settings using Proxy and listeners
function createReactiveSettings(initial) {
	const listeners = new Set();
	const obj = Object.assign({}, initial);

	return new Proxy(obj, {
		set(target, prop, value) {
			const old = target[prop];
			target[prop] = value;
			if (value !== old) {
				for (const cb of listeners) cb(prop, value, old);
			}
			return true;
		},
		get(target, prop) {
			if (prop === "onChange") return (cb) => listeners.add(cb);
			if (prop === "offChange") return (cb) => listeners.delete(cb);
			return target[prop];
		},
	});
}

export const settings = createReactiveSettings(savedSettings);

// Watch vr specifically (mirror previous behavior)
settings.onChange((prop, val, old) => {
	if (prop === "vr") {
		console.log(val, old);
		if (val !== old) {
			window.location.reload();
		}
		localStorage.setItem("vr", val);
		emitter.emit("vr-select", val);
	}
	if (prop === "fullscreen" || prop === "quality") {
		localStorage.setItem("fullscreen", settings.fullscreen);
		localStorage.setItem("quality", settings.quality);

		emitter.emit("quality", settings.quality);
	}
});
