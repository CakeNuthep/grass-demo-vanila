/* eslint-disable camelcase */
import { Camera, Euler, EventDispatcher, Object3D, Vector3 } from "three";

const _changeEvent = { type: "change" };
const _lockEvent = { type: "lock" };
const _unlockEvent = { type: "unlock" };

const _PI_2 = Math.PI / 2;

export default class PointerLockControls extends EventDispatcher {
	domElement: HTMLElement;
	camera: Camera;
	player: Object3D;
	isLocked = false;

	minPolarAngle = 0; // radians
	maxPolarAngle = Math.PI; // radians

	vector = new Vector3();
	euler = new Euler(0, 0, 0, "YXZ");

	previousTouch?: Touch;

	onMouseMoveBind = this.onMouseMove.bind(this);
	onPointerlockChangeBind = this.onPointerlockChange.bind(this);
	onPointerlockErrorBind = this.onPointerlockError.bind(this);
	onTouchMoveBind = this.onTouchMove.bind(this);
	onTouchEndBind = this.onTouchEnd.bind(this);

	headBobActive: Boolean;
	headBobTimer: number;

	movementMultiplier: number;

	constructor(camera: Camera, domElement: HTMLElement, player: Object3D) {
		super();

		if (domElement === undefined) {
			console.warn(
				'THREE.PointerLockControls: The second parameter "domElement" is now mandatory.'
			);
			domElement = document.body;
		}

		this.camera = camera;
		this.domElement = domElement;
		this.player = player;

		this.headBobActive = false;
		this.headBobTimer = 0;

		this.movementMultiplier = 0.002;

		this.connect();
	}

	onTouchMove(e: TouchEvent) {
		if (this.isLocked === false) return;
		let touch: Touch | undefined;

		// alert(e.touches[0].target)
		switch (e.touches.length) {
			case 1:
				if (e.touches[0].target === this.domElement) touch = e.touches[0];
				break;
			case 2:
				if (e.touches[0].target === this.domElement) touch = e.touches[0];
				else if (e.touches[1].target === this.domElement) touch = e.touches[1];
				break;
		}

		if (!touch) return;

		const movementX = this.previousTouch
			? touch.pageX - this.previousTouch.pageX
			: 0;
		const movementY = this.previousTouch
			? touch.pageY - this.previousTouch.pageY
			: 0;

		this.updatePosition(movementX, movementY, 0.01);

		this.previousTouch = touch;
	}

	onTouchEnd() {
		this.previousTouch = undefined;
	}

	onMouseMove(event: MouseEvent) {
		if (this.isLocked === false) return;

		const movementX: number =
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		const movementY: number =
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		this.updatePosition(movementX, movementY, this.movementMultiplier);
	}

	updatePosition(movementX: number, movementY: number, multiplier: number) {
		this.euler.setFromQuaternion(this.camera.quaternion);

		this.euler.y -= movementX * multiplier;
		this.euler.x -= movementY * multiplier;

		this.euler.x = Math.max(
			_PI_2 - this.maxPolarAngle,
			Math.min(_PI_2 - this.minPolarAngle, this.euler.x)
		);

		this.camera.quaternion.setFromEuler(this.euler);

		this.dispatchEvent(_changeEvent);
	}

	onPointerlockChange() {
		if (this.domElement.ownerDocument.pointerLockElement === this.domElement) {
			this.dispatchEvent(_lockEvent);

			this.isLocked = true;
		} else {
			this.dispatchEvent(_unlockEvent);
			this.isLocked = false;
		}
	}

	onPointerlockError(e) {
		console.error(
			"THREE.PointerLockControls: Unable to use Pointer Lock API",
			e
		);
	}

	connect() {
		this.domElement.addEventListener("touchmove", this.onTouchMoveBind, false);
		this.domElement.addEventListener("touchend", this.onTouchEndBind, false);
		this.domElement.ownerDocument.addEventListener(
			"mousemove",
			this.onMouseMoveBind
		);
		this.domElement.ownerDocument.addEventListener(
			"pointerlockchange",
			this.onPointerlockChangeBind
		);
		this.domElement.ownerDocument.addEventListener(
			"pointerlockerror",
			this.onPointerlockErrorBind
		);
	}

	disconnect() {
		this.domElement.removeEventListener(
			"touchmove",
			this.onTouchMoveBind,
			false
		);
		this.domElement.removeEventListener("touchend", this.onTouchEndBind, false);
		this.domElement.ownerDocument.removeEventListener(
			"mousemove",
			this.onMouseMoveBind
		);
		this.domElement.ownerDocument.removeEventListener(
			"pointerlockchange",
			this.onPointerlockChangeBind
		);
		this.domElement.ownerDocument.removeEventListener(
			"pointerlockerror",
			this.onPointerlockErrorBind
		);
	}

	dispose() {
		this.disconnect();
	}

	getDirection() {
		const direction = new Vector3(0, 0, -1);

		return (v: Vector3) => {
			return v.copy(direction).applyQuaternion(this.camera.quaternion);
		};
	}

	updateHeadBob(time: number, speed: number) {
		if (this.headBobActive) {
			const verticalFrequency = 0.205 * Math.min(speed, 15);
			const lateralFrequency = 0.1 * Math.min(speed, 15);
			const amplitude = 0.0001 * (1 - Math.exp(-speed / 5));

			const wavelength = Math.PI * 2;
			const nextStep =
				1 +
				Math.floor(
					((this.headBobTimer + 0.000001) * verticalFrequency) / wavelength
				);
			const nextStepTime = (nextStep * wavelength) / verticalFrequency;

			this.headBobTimer = Math.min(this.headBobTimer + time, nextStepTime);

			const verticalBob =
				Math.sin(this.headBobTimer * verticalFrequency) * amplitude;
			const lateralBob =
				Math.cos(this.headBobTimer * lateralFrequency) * amplitude;

			this.camera.position.y += verticalBob;
			this.camera.position.x += lateralBob;

			if (this.headBobTimer == nextStepTime) {
				this.headBobActive = false;
			}
		}
	}

	moveForward(distance: number) {
		this.vector.setFromMatrixColumn(this.camera.matrix, 0);

		this.vector.crossVectors(this.camera.up, this.vector);

		this.player.position.addScaledVector(this.vector, distance);

		if (distance > 0.001) {
			this.headBobActive = true;
		}
	}

	moveRight(distance: number) {
		this.vector.setFromMatrixColumn(this.camera.matrix, 0);

		this.player.position.addScaledVector(this.vector, distance);
	}

	async lock() {
		if (typeof this.domElement.requestPointerLock !== "undefined") {
			this.domElement.requestPointerLock();
		}
	}

	unlock() {
		if (typeof this.domElement.requestPointerLock !== "undefined") {
			this.domElement.ownerDocument.exitPointerLock();
		}
	}
}

export { PointerLockControls };
