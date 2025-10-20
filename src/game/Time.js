// Ensure the UMD tween script from the import map is loaded (side-effect)
import "tween";
// tween is provided as a UMD global by the import map in index.html
// use the global TWEEN when running in the browser UMD build
const TWEEN = (typeof globalThis !== "undefined" && globalThis.TWEEN) || (typeof window !== "undefined" && window.TWEEN);
import * as THREE from "three";
import Game from "./Game.js";
import * as Tone from "tone";

export default class Time {
	constructor() {
		this.game = new Game();

		this.clock = new THREE.Clock();
		this.times = [];
	}

	tick() {
		this.delta = this.clock.getDelta();
		this.elapsed = this.clock.getElapsedTime();
		this.game.player.tick();
		this.game.effectComposer.tick();
		this.game.renderer.tick();
		this.game.vr.tick();

		this.game.updatables.forEach((object) => object.tick());

		TWEEN.update();

		if (this.sampleFps || this.game.debug.active) {
			const now = performance.now();

			while (this.times.length > 0 && this.times[0] <= now - 1000) {
				this.times.shift();
			}

			this.times.push(now);
			this.fps = this.times.length;
		}

		if (this.game.world) {
			this.game.world.tick();
			this.game.world.updatables.forEach((object) => object.tick());
		}

		this.game.renderer.instance.setAnimationLoop(() => {
			this.tick();

			if (this.game.debug.active) {
				this.game.renderer.instance.info.reset();
				// this.game.audio.tick();
			}
		});
	}
}
