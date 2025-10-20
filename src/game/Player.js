import Camera from "./Camera.js";
import Game from "./Game.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import * as THREE from "three";
import Controls from "./Controls.js";
import { emitter } from "./Emitter.js";
// Ensure the UMD tween script from the import map is loaded (side-effect)
import "tween";
// tween is provided as a UMD global by the import map in index.html
// use the global TWEEN when running in the browser UMD build
const TWEEN = (typeof globalThis !== "undefined" && globalThis.TWEEN) || (typeof window !== "undefined" && window.TWEEN);
import * as Tone from "tone";

export default class Player {
	constructor() {
		this.game = new Game();

		this.init();

		if (this.game.debug.active) {
			this.setDebug();
		}
	}

	init() {
		this.setDefaults();
		this.setInstance();
		this.camera = new Camera();
		this.instance.add(this.camera.instance);
		this.controls = new Controls(this);
		this.enableInputListeners();
		// this.setWaterTransitionTweens();
	}

	setDefaults() {
		this.velocity = new THREE.Vector3();

		this.isOnGround = true;
		this.isUnderwater = false;
		this.isFlying = false;
		this.isAutomoving = false;
		this.isPortalling = false;
		this.height = 1;

		this.info = {
			radius: 0.4,
			segment: new THREE.Line3(
				new THREE.Vector3(),
				new THREE.Vector3(0, -this.height, 0.0)
			),
		};

		this.moving = {
			forward: false,
			left: false,
			right: false,
			backward: false,
			up: false,
			down: false,
			propelling: false,
		};

		this.turning = {
			left: false,
			right: false,
			up: false,
			down: false,
		};

		this.slowed = false;
	}

	setInstance() {
		this.instance = new THREE.Mesh(
			new RoundedBoxGeometry(1.0, 2.0, 1.0, 10, 0.4),
			new THREE.MeshNormalMaterial({
				visible: false,
			})
		);

		this.instance.geometry.translate(0, -0.5, 0);
	}

	tick() {
		if (this.panel) {
			this.printDebug();
		}
		this.controls.tick();
	}

	enableInputListeners() {
		this.controls.instance.connect();
		document.addEventListener("keydown", this.handleKeyDownEvents);
		document.addEventListener("keyup", this.handleKeyUpEvents);
		document.addEventListener("mousedown", this.handleMouseDownEvents);
		emitter.on("mobile-move", this.handleMobileMovement);
	}

	disableInputListeners() {
		this.controls.instance.disconnect();
		document.removeEventListener("keydown", this.handleKeyDownEvents);
		document.removeEventListener("keyup", this.handleKeyUpEvents);
		document.removeEventListener("mousedown", this.handleMouseDownEvents);
		emitter.off("mobile-move", this.handleMobileMovement);
	}

	handleMobileMovement = (moving) => {
		this.moving.forward = moving.includes("forward");
		this.moving.backward = moving.includes("backward");
		this.moving.left = moving.includes("left");
		this.moving.right = moving.includes("right");
	};

	handleMouseDownEvents = (event) => {
		switch (event.button) {
			case 0:
				// left mouse button
				break;
			case 1:
				// middle mouse button
				break;
			default:
				this.propel();
		}
	};

	handleKeyDownEvents = (event) => {
		switch (event.code) {
			case "ArrowUp":
			case "KeyW":
				this.moving.forward = true;
				break;

			case "ArrowLeft":
			case "KeyA":
				this.moving.left = true;
				break;

			case "ArrowDown":
			case "KeyS":
				this.moving.backward = true;
				break;

			case "ArrowRight":
			case "KeyD":
				this.moving.right = true;
				break;

			case "KeyJ":
				this.turning.left = true;
				break;

			case "KeyL":
				this.turning.right = true;
				break;

			case "KeyI":
				this.turning.up = true;
				break;

			case "KeyK":
				this.turning.down = true;
				break;

			case "ShiftLeft":
				this.slowed = true;
				break;

			case "Space":
				if (this.isOnGround === true) {
					this.controls.jump();
				}
				break;

			case "KeyQ":
				this.moving.up = true;
				break;

			case "KeyE":
				this.moving.down = true;
				break;

			case "AltLeft":
				this.controls.noclip = !this.controls.noclip;
				this.controls.settings.headBobEnabled =
					!this.controls.settings.headBobEnabled;
				break;

			case "KeyH":
				console.log(Tone.getTransport().position);
				break;

			case "KeyY":
				this.game.helper.takeTiledScreenshot();
				break;
		}
	};

	handleKeyUpEvents = (event) => {
		switch (event.code) {
			case "ArrowUp":
			case "KeyW":
				this.moving.forward = false;
				break;

			case "ArrowLeft":
			case "KeyA":
				this.moving.left = false;
				break;

			case "ArrowDown":
			case "KeyS":
				this.moving.backward = false;
				break;

			case "ArrowRight":
			case "KeyD":
				this.moving.right = false;
				break;

			case "KeyJ":
				this.turning.left = false;
				break;

			case "KeyL":
				this.turning.right = false;
				break;

			case "KeyI":
				this.turning.up = false;
				break;

			case "KeyK":
				this.turning.down = false;
				break;

			case "ShiftLeft":
				this.slowed = false;
				break;

			case "KeyQ":
				this.moving.up = false;
				break;

			case "KeyE":
				this.moving.down = false;
				break;
		}
	};

	setDebug() {
		this.panel = document.createElement("div");
		this.game.debug.panel.appendChild(this.panel);
	}

	printDebug() {
		this.panel.innerHTML = `Player`;

		//is the player on the ground. show green text for true, red for false
		this.panel.innerHTML += `&nbsp;<span style="color:${
			this.isOnGround ? "green" : "red"
		}">onGround</span>`;

		//if the player is underwater. show green text for true, red for false
		this.panel.innerHTML += `&nbsp;<span style="color:${
			this.isUnderwater ? "green" : "red"
		}">underwater</span>`;

		this.panel.innerHTML += `&nbsp;<span style="color:${
			this.isFlying ? "green" : "red"
		}">flying</span>`;

		//if the player is underwater. show green text for true, red for false
		this.panel.innerHTML += `&nbsp;<span style="color:${
			this.isAutomoving ? "green" : "red"
		}">automoving</span>`;

		//display the controls isLocked in red if false, green if true
		this.panel.innerHTML += `&nbsp;<span style="color:${
			this.controls.instance.isLocked ? "green" : "red"
		}">isLocked</span>`;

		//display the velocity of the player
		this.panel.innerHTML += `&nbsp;velocity: ${this.velocity.x.toFixed(
			4
		)}, ${this.velocity.y.toFixed(4)}, ${this.velocity.z.toFixed(4)}`;

		//display the position of the player
		this.panel.innerHTML += `&nbsp;position: ${this.instance.position.x.toFixed(
			2
		)}, ${this.instance.position.y.toFixed(
			2
		)}, ${this.instance.position.z.toFixed(2)}`;

		//display with arrows in which direction is current being moved
		this.panel.innerHTML += `&nbsp;moving: ${this.moving.forward ? "↑" : ""}${
			this.moving.left ? "←" : ""
		}${this.moving.backward ? "↓" : ""}${this.moving.right ? "→" : ""}`;

		//display the camera rotation
		this.panel.innerHTML += `&nbsp;camera: ${this.camera.instance.rotation.x.toFixed(
			2
		)}, ${this.camera.instance.rotation.y.toFixed(
			2
		)}, ${this.camera.instance.rotation.z.toFixed(2)}`;

		//display the controls settings maxVelocity
		this.panel.innerHTML += `&nbsp;maxVelocity: ${this.controls.settings.maxVelocity}`;

		//display the controls settings gravity
		this.panel.innerHTML += `&nbsp;gravity: ${this.controls.settings.gravity}`;
	}

	propel() {
		if (!this.game.isLocal || !this.controls.instance.isLocked) {
			return;
		}

		const direction = new THREE.Vector3();
		const velocity = new THREE.Vector3();
		const savedVelocity = this.velocity.clone();
		this.camera.instance.getWorldDirection(direction);

		velocity.y = direction.y * 30;

		new TWEEN.Tween(this.velocity)
			.to({ z: -30, x: 0, y: velocity.y })
			.easing(TWEEN.Easing.Sinusoidal.Out)
			.duration(200)
			.start()
			.onComplete(() => {
				new TWEEN.Tween(this.velocity)
					.to({ z: savedVelocity.z, x: savedVelocity.x, y: savedVelocity.y })
					.duration(1000)
					.easing(TWEEN.Easing.Sinusoidal.Out)
					.start();
			});
	}
}
