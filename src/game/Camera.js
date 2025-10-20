import * as THREE from "three";
import Game from "./Game.js";
// Ensure the UMD tween script from the import map is loaded (side-effect)
import "tween";
// tween is provided as a UMD global by the import map in index.html
// use the global TWEEN when running in the browser UMD build
const TWEEN = (typeof globalThis !== "undefined" && globalThis.TWEEN) || (typeof window !== "undefined" && window.TWEEN);
import { emitter } from "./Emitter.js";

export default class Camera {
	constructor() {
		this.game = new Game();
		this.sizes = this.game.sizes;

		this.mobileFOV = 70;
		this.desktopFOV = 70;

		this.setInstance();
		this.setDefaults();

		if (this.game.debug.active) {
			this.setDebug();
		}

		emitter.on("game-state", (state) => {
			if (state == "playing") {
				this.zoomIn();
			} else if (state == "ready" || state == "paused") {
				this.zoomOut();
			}
		});
	}

	setInstance() {
		this.instance = new THREE.PerspectiveCamera();
	}

	zoomOut() {
		const dist = -1;
		const player = this.game.player;
		const cameraDir = new THREE.Vector3();

		player.camera.instance.getWorldDirection(cameraDir);
		cameraDir.multiplyScalar(dist);

		const offset = Math.abs(cameraDir.y * 0.5);
		cameraDir.x += cameraDir.x < 0 ? -offset : offset;
		cameraDir.z += cameraDir.z < 0 ? -offset : offset;

		const zoomTarget = new THREE.Vector3(
			cameraDir.x + player.instance.position.x,
			player.instance.position.y + 0.25,
			cameraDir.z + player.instance.position.z
		);

		// Convert zoomTarget to local space
		const localZoomTarget = zoomTarget
			.sub(player.instance.position)
			.applyQuaternion(player.instance.quaternion.clone().invert());

		new TWEEN.Tween(this.instance.position)
			.to(localZoomTarget, 1000)
			.easing(TWEEN.Easing.Quadratic.Out)
			.onUpdate(() => this.instance.lookAt(player.instance.position))
			.start();
	}

	zoomIn() {
		// Return to player's center in local space
		const target = new THREE.Vector3(0, 0, 0);
		new TWEEN.Tween(this.instance.position)
			.to(target, 1000)
			.easing(TWEEN.Easing.Quadratic.Out)
			.start();
	}

	resize() {
		this.instance.aspect = this.sizes.width / this.sizes.height;
		this.instance.fov = this.game.sizes.isMobile
			? this.mobileFOV
			: this.desktopFOV;
		this.instance.updateProjectionMatrix();
	}

	setDefaults() {
		this.instance.near = 0.1;
		this.instance.far = 10000;
		this.instance.zoom = 1;
		this.instance.updateProjectionMatrix();
		this.resize();
	}

	setDebug() {
		this.folder = this.game.debug.ui.addFolder("Camera");
		this.folder.add(this.instance, "fov", 1, 100, 1).onChange(() => {
			this.instance.updateProjectionMatrix();
		});

		this.folder.add(this.instance, "zoom", 0, 5, 0.01).onChange(() => {
			this.instance.updateProjectionMatrix();
		});

		this.folder.add(this.instance, "near", 0, 1000, 0.01).onChange(() => {
			this.instance.updateProjectionMatrix();
		});

		this.folder.add(this.instance, "far", 100, 10000, 10).onChange(() => {
			this.instance.updateProjectionMatrix();
		});

		this.folder.close();
	}
}
