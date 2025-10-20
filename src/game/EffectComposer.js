import Game from "./Game.js";
import {
	EffectPass,
	RenderPass,
	EffectComposer as ThreeEffectComposer,
} from "postprocessing";
import { settings } from "./Settings.js";
import { emitter } from "./Emitter.js";
import { HalfFloatType } from "three";

export default class EffectComposer {
	constructor() {
		this.game = new Game();

		this.setInstance();
		this.resize();
		this.setListeners();
		this.setDefaults();
	}

	setInstance() {
		this.instance = new ThreeEffectComposer(this.game.renderer.instance, {
			stencilBuffer: false,
		});

		this.setQuality();
	}

	setListeners() {
		emitter.on("quality", (val) => {
			this.setQuality();
		});

		emitter.on("resize", () => {
			this.resize();
		});
	}

	resize() {
		this.instance.setSize(this.game.sizes.width, this.game.sizes.height);
	}

	tick() {
		this.game.world.onRender();
	}

	/**
	 * Called on instantiation and when user changes quality
	 */
	setQuality() {
		switch (settings.quality) {
			case "high":
				this.instance.multisampling = 2;
				break;
			case "medium":
				this.instance.multisampling = 1;
				break;
			case "low":
				this.instance.multisampling = 0;
				break;
		}
	}
	setDefaults() {
		this.instance.removeAllPasses();

		this.renderPass = new RenderPass(
			this.game.scene,
			this.game.player.camera.instance
		);

		this.instance.addPass(this.renderPass);
	}
}
