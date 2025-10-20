import { PointerLockControls } from "./PointerLockControls.js";
import Game from "./Game.js";
import { emitter } from "./Emitter.js";
import * as THREE from "three";
import { settings } from "./Settings.js";
import Player from "./Player.js";
import { gameState } from "./State.js";

export default class Controls {
	constructor(player = new Player()) {
		this.game = new Game();

		this.player = player;
		this.camera = player.camera.instance;

		this.lockedAt = Date.now();

		this.setDefaults();

		this.turnVelocity = new THREE.Vector3();
		this.position = new THREE.Vector3();
		this.direction = new THREE.Vector3();
		this.cameraDirection = new THREE.Vector3();
		this.turnDirection = new THREE.Vector3();
		this.tempBox = new THREE.Box3();
		this.tempMat = new THREE.Matrix4();
		this.tempSegment = new THREE.Line3();
		this.tempVector = new THREE.Vector3();
		this.tempVector2 = new THREE.Vector3();
		this.controlsDirection = new THREE.Vector3();
		this.deltaVector = new THREE.Vector3();
		this.lastDeltaVector = new THREE.Vector3();

		this.instance = new PointerLockControls(
			this.camera,
			this.game.canvas,
			this.player.instance
		);

		this.setListeners();
		this.setDebug();
	}

	setDefaults() {
		this.collider = null;
		this.noclip = false;
		this.enabled = true;

		this.settings = {
			gravity: -5,
			decceleration: 7,
			playerSpeed: 40,
			swimSpeed: 2,
			physicsSteps: 10,
			jumpForce: 2,
			groundCheck: 0.25, //lower value makes the player "stickier"
			maxVelocity: -60,
			headBobEnabled: true,
			gravityEnabled: true,
		};
	}

	setDebug() {
		if (this.game.debug.active) {
			this.folder = this.game.debug.ui.addFolder("Controls");
			this.folder.add(this, "logLocation");
			this.folder.add(this.settings, "groundCheck").min(-10).max(10).step(0.01);
			this.folder.add(this, "noclip");
			this.folder.close();
		}
	}

	logLocation() {
		const _vector = new THREE.Vector3();
		this.camera.getWorldDirection(_vector);
		console.log(
			"this.spawnDirection = new THREE.Vector3(" +
				_vector.x.toFixed(2) +
				", " +
				_vector.y.toFixed(2) +
				", " +
				_vector.z.toFixed(2) +
				"); ",
			"this.spawnPosition = new THREE.Vector3(" +
				this.player.instance.position.x.toFixed(2) +
				", " +
				this.player.instance.position.y.toFixed(2) +
				", " +
				this.player.instance.position.z.toFixed(2) +
				")"
		);
	}

	onControlsLock = () => {
		if (settings.fullscreen && !this.isFullscreen() && !settings.vr) {
			this.autoFullscreen()
				.catch((err) => {
					console.error("Error requesting fullscreen:", err);
				})
				.then(() => {
					this.lock();
				});
		} else {
			this.lock();
		}
	};

	onMobileLock = () => {
		emitter.emit("pointerUnlock");
		this.instance.isLocked = false;
		this.exitFullscreen().catch((err) => {
			console.error("Error exiting fullscreen:", err);
		});
	};

	onPointerLock = () => {
		emitter.emit("pointerLock");
	};

	onPointerUnlock = () => {
		emitter.emit("pointerUnlock");
	};

	setListeners() {
		this.instance.addEventListener("lock", this.onPointerLock);
		this.instance.addEventListener("unlock", this.onPointerUnlock);
		emitter.on("controls-lock", this.onControlsLock);
		emitter.on("mobile-unlock", this.onMobileLock);
	}

	isFullscreen() {
		return !!(document.fullscreenElement || document.webkitFullscreenElement);
	}

	requestFullscreen(elem) {
		return new Promise((resolve, reject) => {
			if (elem.requestFullscreen) {
				elem.requestFullscreen().then(resolve).catch(reject);
			} else if (elem.webkitRequestFullscreen) {
				elem.webkitRequestFullscreen();
				setTimeout(resolve, 500); // Fake promise for webkit
			} else {
				reject(new Error("Fullscreen API not supported"));
			}
		});
	}

	exitFullscreen() {
		return new Promise((resolve, reject) => {
			if (document.exitFullscreen) {
				document.exitFullscreen().then(resolve).catch(reject);
			} else if (document.webkitExitFullscreen) {
				document.webkitExitFullscreen();
				resolve();
			} else {
				reject(new Error("Exit Fullscreen API not supported"));
			}
		});
	}

	autoFullscreen() {
		return this.requestFullscreen(document.documentElement);
	}

	/**
	 * Wrapper for PointerLockControls instance lock/unlock, slightly different for mobile
	 */
	async lock() {
		if (this.game.sizes.isMobile) {
			emitter.emit("pointerLock");
			this.instance.isLocked = true;
		} else {
			await this.instance.lock();
		}

		gameState.value = "playing";
	}

	unlock() {
		if (this.game.sizes.isMobile) {
			emitter.emit("pointerUnlock");
			this.instance.isLocked = false;
		} else {
			this.instance.unlock();
		}
	}

	jump() {
		this.player.velocity.y = this.settings.jumpForce;
	}

	//apply gravity to the player on the y axis
	//if gravity is negative, the player moves down
	//if gravity is positive, the player moves up
	//this is the only place where the player's Y position is changed
	applyGravity(interval) {
		if (this.noclip || !this.settings.gravityEnabled) return;

		const maxVelocity = this.settings.maxVelocity;
		const gravity = this.settings.gravity;
		if (
			(Math.abs(this.player.velocity.y) <= Math.abs(maxVelocity) &&
				!this.player.isOnGround) ||
			this.settings.gravity > 0
		) {
			this.player.velocity.y += interval * gravity;
		}

		this.player.instance.position.y += this.player.velocity.y * interval;
	}

	//apply deceleration to the player's velocity on the x and z axis
	//this is used to slow the player down when they are not pressing any movement keys
	applyDeceleration(interval) {
		this.player.velocity.x -=
			this.player.velocity.x * this.settings.decceleration * interval;
		this.player.velocity.z -=
			this.player.velocity.z * this.settings.decceleration * interval;

		this.turnVelocity.x -= this.turnVelocity.x * 4 * interval;
		this.turnVelocity.z -= this.turnVelocity.z * 4 * interval;
	}

	//set the direction the player is moving based on the keys pressed
	setDirectionAndTurning() {
		this.direction.z =
			Number(this.player.moving.forward) - Number(this.player.moving.backward);
		this.direction.x =
			Number(this.player.moving.right) - Number(this.player.moving.left);
		this.direction.normalize();

		this.turnDirection.z =
			Number(this.player.turning.up) - Number(this.player.turning.down);
		this.turnDirection.x =
			Number(this.player.turning.right) - Number(this.player.turning.left);
		this.turnDirection.normalize();
	}

	//update the player's x and z velocity based on the direction they are moving
	updateMovementAndTurning(interval, walkSpeed) {
		if (this.player.moving.forward || this.player.moving.backward) {
			this.player.velocity.z -= this.direction.z * walkSpeed * interval;
		}

		if (this.player.moving.left || this.player.moving.right) {
			this.player.velocity.x -= this.direction.x * walkSpeed * interval;
		}

		if (this.player.turning.left || this.player.turning.right) {
			this.turnVelocity.x -= this.turnDirection.x * 0.005 * interval;
		}
		if (this.player.turning.up || this.player.turning.down) {
			this.turnVelocity.z -= this.turnDirection.z * 0.005 * interval;
		}
	}

	//update the position of the pointer lock controls
	updatePointerLockPosition(interval, walkSpeed) {
		this.instance.updatePosition(-1, 0, this.turnVelocity.x);
		this.instance.updatePosition(0, 1, this.turnVelocity.z);

		this.instance.moveRight(-this.player.velocity.x * interval);
		this.instance.moveForward(-this.player.velocity.z * interval);

		if (
			this.settings.headBobEnabled &&
			!this.player.isFlying &&
			!this.player.isUnderwater
		) {
			this.instance.updateHeadBob(this.game.time.delta, walkSpeed);
		}
	}

	//when the player is underwater, forward movement causes them to rise
	//this must be applied before gravity
	applySwimVelocity(interval) {
		if (!this.player.isUnderwater || !this.player.moving.forward) return;

		const maxVelocity = this.settings.maxVelocity;

		this.player.velocity.y += this.settings.swimSpeed * interval;
		if (Math.abs(this.player.velocity.y) > Math.abs(maxVelocity)) {
			this.player.velocity.y =
				this.player.velocity.y > 0
					? Math.abs(maxVelocity)
					: -Math.abs(maxVelocity);
		}
	}

	updateCameraPosition(interval) {
		if (this.player.moving.up || this.player.moving.down) {
			this.camera.position.y +=
				interval * this.player.moving.up ? 0.001 : -0.001;
		}
	}

	applyFlyingDirection(interval) {
		this.camera.getWorldDirection(this.cameraDirection);
		this.player.velocity.y = this.cameraDirection.y * -this.player.velocity.z;
		this.player.instance.position.y += this.player.velocity.y * interval;
	}

	updatePlayer(interval) {
		const walkSpeed =
			(this.player.slowed
				? this.settings.playerSpeed * 0.5
				: this.settings.playerSpeed) * (settings.vr ? 0.75 : 1);

		this.setDirectionAndTurning();

		if (this.player.isFlying) {
			this.applyDeceleration(interval);
			this.applyFlyingDirection(interval);
			this.updateMovementAndTurning(interval, walkSpeed);
			this.updatePointerLockPosition(interval, walkSpeed);
			// this.updateCameraPosition(interval);
		} else {
			this.applySwimVelocity(interval);
			this.applyGravity(interval);
			this.applyDeceleration(interval);
			this.updateMovementAndTurning(interval, walkSpeed);
			this.updatePointerLockPosition(interval, walkSpeed);
			this.updateCameraPosition(interval);
		}

		//at this point the player has been moved according to the controller input, but has not been checked for collisions

		this.tempVector.copy(this.player.instance.position);

		this.player.instance.updateMatrixWorld();

		const playerInfo = this.player.info;

		if (this.collider && !this.noclip) {
			// adjust player position based on collisions
			this.tempBox.makeEmpty();
			this.tempMat.copy(this.collider.matrixWorld).invert();
			this.tempSegment.copy(playerInfo.segment);

			// get the position of the capsule in the local space of the this.collider
			this.tempSegment.start
				.applyMatrix4(this.player.instance.matrixWorld)
				.applyMatrix4(this.tempMat);
			this.tempSegment.end
				.applyMatrix4(this.player.instance.matrixWorld)
				.applyMatrix4(this.tempMat);

			// get the axis aligned bounding box of the capsule
			this.tempBox.expandByPoint(this.tempSegment.start);
			this.tempBox.expandByPoint(this.tempSegment.end);

			this.tempBox.min.addScalar(-playerInfo.radius);
			this.tempBox.max.addScalar(playerInfo.radius);

			this.collider.geometry.boundsTree.shapecast({
				intersectsBounds: (box) => box.intersectsBox(this.tempBox),

				intersectsTriangle: (tri) => {
					// check if the triangle is intersecting the capsule and adjust the
					// capsule position if it is.
					const triPoint = this.tempVector;
					const capsulePoint = this.tempVector2;

					const distance = tri.closestPointToSegment(
						this.tempSegment,
						triPoint,
						capsulePoint
					);
					if (distance < playerInfo.radius) {
						const depth = playerInfo.radius - distance;
						const direction = capsulePoint.sub(triPoint).normalize();

						this.tempSegment.start.addScaledVector(direction, depth);
						this.tempSegment.end.addScaledVector(direction, depth);
					}
				},
			});

			// get the adjusted position of the capsule collider in world space after checking
			// triangle collisions and moving it. playerInfo.segment.start is assumed to be
			// the origin of the player model.
			const newPosition = this.tempVector;
			newPosition
				.copy(this.tempSegment.start)
				.applyMatrix4(this.collider.matrixWorld);

			// check how much the collider was moved
			this.deltaVector = this.tempVector2;
			this.deltaVector.subVectors(newPosition, this.player.instance.position);

			// if the player was primarily adjusted vertically we assume it's on something we should consider ground
			this.player.isOnGround =
				this.deltaVector.y >
				Math.abs(interval * this.player.velocity.y * this.settings.groundCheck);

			const offset = Math.max(0.0, this.deltaVector.length() - 1e-5);
			this.deltaVector.normalize().multiplyScalar(offset);

			// adjust the player model
			this.player.instance.position.add(this.deltaVector);

			//slow the player down if they hit something
			if (this.player.isOnGround) {
				this.player.velocity.y = Math.abs(this.player.velocity.y) * 0.1;
			}
		}
	}

	tick() {
		if (!this.enabled) return;
		if (gameState.value === "playing") {
			for (let i = 0; i < this.settings.physicsSteps; i++) {
				this.updatePlayer(this.game.time.delta / this.settings.physicsSteps);
			}
		} else {
			/**
			 * Idle animation, wandering camera
			 */
			// this.instance.updatePosition(
			// 	Math.sin(this.game.time.elapsed * 0.5) * 0.05,
			// 	Math.sin(this.game.time.elapsed * 0.25) * 0.025,
			// 	0.002
			// );
		}
	}
}
