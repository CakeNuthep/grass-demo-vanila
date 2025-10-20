import * as THREE from "three";
import {
	computeBoundsTree,
	disposeBoundsTree,
	computeBatchedBoundsTree,
	disposeBatchedBoundsTree,
	acceleratedRaycast,
} from "three-mesh-bvh";
import Renderer from "./Renderer.js";
import Debug from "./Debug.js";
import Time from "./Time.js";
import Sizes from "./Sizes.js";
import { emitter } from "./Emitter.js";
import World from "./World.js";
import Player from "./Player.js";
import EffectComposer from "./EffectComposer.js";
import ResourceLoader from "./ResourceLoader.js";
import { gameState } from "./State.js";
import VR from "./VR.js";

let gameInstance = null;

export default class Game {
	constructor() {
		// Singleton
		if (gameInstance) {
			return gameInstance;
		}

		this.isLocal = /localhost|192/.test(window.location.hostname);

		gameInstance = this;
		window.gameInstance = this;

		// Canvas
		// prefer a canvas with class 'webgl', fall back to '#game-canvas' or first canvas
		this.canvas =
			document.querySelector("canvas.webgl") ||
			document.querySelector("#game-canvas") ||
			document.querySelector("canvas");

		THREE.ColorManagement.enabled = true;

		// Add the extension functions when available
		if (THREE?.BufferGeometry?.prototype) {
			THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
			THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
		}
		if (THREE?.Mesh?.prototype) {
			THREE.Mesh.prototype.raycast = acceleratedRaycast;
		}
		// BatchedMesh is optional in some three builds
		if (THREE?.BatchedMesh?.prototype) {
			THREE.BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;
			THREE.BatchedMesh.prototype.disposeBoundsTree = disposeBatchedBoundsTree;
			THREE.BatchedMesh.prototype.raycast = acceleratedRaycast;
		}
	}

	async setAutoQuality() {
		if (typeof getGPUTier === "function") {
			try {
				this.gpuTier = await getGPUTier();
			} catch (e) {
				// ignore and fall back
				this.gpuTier = null;
			}
		} else {
			this.gpuTier = null;
		}

		// switch (this.gpuTier.tier) {
		// 	case 0:
		// 		settings.quality = "low";
		// 		break;
		// 	case 1:
		// 		settings.quality = "low";
		// 		break;
		// 	case 2:
		// 		settings.quality = "medium";
		// 		break;
		// 	case 3:
		// 		settings.quality = "high";
		// 		break;
		// }
	}

	init() {
		//world arrays
		this.updatables = [];
		this.disposables = [];
		this.scene = new THREE.Scene();

		this.debug = new Debug();
		this.sizes = new Sizes();
		this.time = new Time();
		this.world = new World();
		this.player = new Player();

		this.scene.add(this.player.instance);

		this.renderer = new Renderer();
		this.effectComposer = new EffectComposer();
		this.resourceLoader = new ResourceLoader();
		this.vr = new VR();

		this.time.tick();

		emitter.on("resize", (sizes) => {
			this.player.camera.resize();
			this.renderer.resize();
			this.effectComposer.resize();
		});

		emitter.on("pointerUnlock", () => {
			if (gameState.value == "playing") {
				gameState.value = "paused";
			}
		});
	}
}
