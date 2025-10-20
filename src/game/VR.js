import Game from "./Game.js";
import { settings } from "./Settings.js";
import { emitter } from "./Emitter.js";
import { gameState } from "./State.js";

export default class VR {
	constructor() {
		this.game = new Game();
		this.renderer = this.game.renderer.instance;

		this.currentSession = null;
		this.hasBeenActivated = false;

		this.gamepadThreshold = 0.5;
		this.gamepadDirectionMap = [
			{ axis: 0, positive: "right", negative: "left" },
			{ axis: 1, positive: "backward", negative: "forward" },
			{ axis: 2, positive: "right", negative: "left" },
			{ axis: 3, positive: "backward", negative: "forward" },
		];

		this.gamepads = [];
		this.combinedMovements = new Set();
		this.triggerMovement = false; // Flag for trigger-based movement

		this.setListeners();
	}

	setListeners() {
		emitter.on("user-interaction", () => {
			if (settings.vr && !this.currentSession) {
				if (!this.hasBeenActivated) {
					this.hasBeenActivated = true;
					this.activate();
					console.log("activating vr");
				}
			}
		});

		emitter.on("quality", (val) => {
			this.setQuality();
		});

		emitter.on("level-ready", () => {});
	}

	setQuality() {
		this.game.renderer.instance.xr.enabled = false;
		switch (settings.quality) {
			case "high":
				this.game.renderer.instance.xr.setFramebufferScaleFactor(1);
				this.game.renderer.instance.xr.setFoveation(0);
				break;
			case "medium":
				this.game.renderer.instance.xr.setFramebufferScaleFactor(0.75);
				this.game.renderer.instance.xr.setFoveation(0.25);
				break;
			case "low":
				this.game.renderer.instance.xr.setFramebufferScaleFactor(0.5);
				this.game.renderer.instance.xr.setFoveation(0.5);

				break;
		}

		this.game.renderer.instance.xr.enabled = true;
	}

	activate() {
		const onSessionStarted = async (session) => {
			session.addEventListener("end", onSessionEnded);
			console.log("xr session started");
			await this.renderer.xr.setSession(session);

			this.currentSession = session;

			this.activateController();
			this.game.effectComposer.instance.setSize();
		};

		const onSessionEnded = () => {
			// this.currentSession.removeEventListener("end", onSessionEnded);
			console.log("session ended");

			emitter.emit("mobile-unlock");

			this.currentSession = null;
			this.hasBeenActivated = false;

			this.game.effectComposer.instance.setSize();
		};

		if (typeof navigator !== "undefined" && "xr" in navigator) {
			// console.log("activating XR");

			if (this.currentSession === null) {
				const sessionInit = {
					optionalFeatures: [],
				};
				navigator.xr
					.requestSession("immersive-vr", sessionInit)
					.then(onSessionStarted)
					.catch((error) => {
						console.error("Failed to start XR session:", error);
					});
			} else {
				this.currentSession.end();
			}
		} else {
			console.log("XR not available");
		}
	}

	//deactivate the current xr session
	deactivate() {
		if (this.currentSession) {
			this.currentSession.end();
		}
	}

	onControllerSelectStart() {
		console.log("select start");
		if (gameState.value == "playing") {
			this.triggerMovement = true; // Enable trigger-based movement
			this.game.player.moving.forward = true;
		}

		if (gameState.value == "paused" || gameState.value == "ready") {
			emitter.emit("controls-lock");
		}
	}

	onControllerSelectEnd() {
		this.triggerMovement = false; // Disable trigger-based movement
		this.game.player.moving.forward = false;
	}

	onControllerConnected(event) {
		if (event.data.gamepad) {
			this.gamepads.push(event.data.gamepad);
		}
	}

	onControllerDisconnected(event) {
		console.log("disconnected");
	}

	activateController() {
		this.controllers = [
			this.renderer.xr.getController(0),
			this.renderer.xr.getController(1),
		];

		this.controllers.forEach((controller) => {
			controller.addEventListener(
				"selectstart",
				this.onControllerSelectStart.bind(this)
			);
			controller.addEventListener(
				"selectend",
				this.onControllerSelectEnd.bind(this)
			);
			controller.addEventListener(
				"connected",
				this.onControllerConnected.bind(this)
			);
			controller.addEventListener(
				"disconnected",
				this.onControllerDisconnected.bind(this)
			);
		});
	}

	tick() {
		if (!this.currentSession || this.gamepads.length == 0) return;

		this.combinedMovements.clear();

		// Skip axis-based movement if trigger-based movement is active
		if (!this.triggerMovement) {
			this.gamepads.forEach((gamepad) => {
				const axes = gamepad.axes;

				this.gamepadDirectionMap.forEach(({ axis, positive, negative }) => {
					if (axes[axis] > this.gamepadThreshold)
						this.combinedMovements.add(positive);
					if (axes[axis] < -this.gamepadThreshold)
						this.combinedMovements.add(negative);
				});
			});

			emitter.emit("mobile-move", Array.from(this.combinedMovements));
		}
	}

	adjustVROrientation(spawnDirection) {}
}
