import Game from "./Game.js";
import { settings } from "./Settings.js";
import { emitter } from "./Emitter.js";

export default class Sizes {
	constructor() {
		this.game = new Game();

		this.setQuality();
		this.detectMobile();

		// Resize event
		window.addEventListener("resize", () => {
			this.resize();
		});

		window.addEventListener("orientationchange", () => {
			this.resize();
		});

		emitter.on("quality", (val) => {
			this.setQuality();
		});

		emitter.on("vr-select", (val) => {
			this.detectMobile();
		});
	}

	detectMobile() {
		this.isMobile =
			settings.vr ||
			/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile/i.test(
				navigator.userAgent
			) ||
			(navigator.userAgent.match(/Mac/) &&
				navigator.maxTouchPoints &&
				navigator.maxTouchPoints > 2);
	}

	resize() {
		if (this.game.renderer && this.game.renderer.instance.xr.isPresenting) {
			return;
		}

		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.pixelRatio = window.devicePixelRatio * this.scale;

		emitter.emit("resize");
	}

	setSize(width, height) {
		this.width = width;
		this.height = height;

		this.pixelRatio = window.devicePixelRatio * this.scale;

		emitter.emit("resize");
	}

	/**
	 * Called on instantiation and when user changes quality
	 */
	setQuality() {
		switch (settings.quality) {
			case "high":
				this.scale = 1;
				break;
			case "medium":
				this.scale = 0.75;
				break;
			case "low":
				this.scale = 0.5;
				break;
		}

		this.resize();
	}
}
