import Game from "./Game.js";
import GUI from "lil-gui";
import {
	BlendFunction,
	EffectPass,
	KernelSize,
	TextureEffect,
} from "postprocessing";
import * as THREE from "three";
import { Pane } from "tweakpane";
import { emitter } from "./Emitter.js";

export default class Debug {
	constructor() {
		this.game = new Game();
		this.active = window.location.hash == "#debug";

		this.init();
	}

	init() {
		this.createPanel();
		this.ui = new GUI();
		this.pane = new Pane();
	}

	createPanel() {
		//create a div positioned absolutely to the bottom left of the screen
		this.panel = document.createElement("div");
		this.panel.style.position = "absolute";
		this.panel.style.left = "0";
		this.panel.style.bottom = "0";
		this.panel.style.color = "white";
		this.panel.style.zIndex = "100";
		this.panel.style.backgroundColor = "rgba(0,0,0,1)";
		this.panel.style.padding = "0.25rem";
		this.panel.style.fontFamily = "monospace";
		this.panel.style.fontSize = ".6rem";
		this.panel.style.lineHeight = "1rem";
		this.panel.style.pointerEvents = "none";
		document.body.appendChild(this.panel);
	}

	addLightDebug(light, name) {
		if (!this.active) return;

		const folder = this.ui.addFolder(name ?? light.constructor.name);

		folder.add(light, "intensity", 0, 5, 0.1).name("Intensity");
		folder.addColor(light, "color").name("Color");

		//hemspheric light specific
		if (light.isHemisphereLight) {
			folder.addColor(light, "groundColor").name("Ground Color");
		}

		//Point Light specific
		if (light.isPointLight) {
			const pointLightHelper = new THREE.PointLightHelper(light, 1);
			pointLightHelper.visible = false;
			this.game.scene.add(pointLightHelper);

			this.addPositionSettingsToFolder(light, folder);
			folder.add(light, "distance", 0, 100, 1).name("Distance");
			folder.add(light, "decay", 0, 100, 1).name("Decay");
			folder.add(light, "castShadow").name("Cast Shadow");
			this.addShadowSettingsToFolder(light.shadow, folder);
			console.log(light.shadow.camera);

			this.addShadowCameraSettingsToFolder(light.shadow.camera, folder);
			folder.add(pointLightHelper, "visible").name("Helper Visible");
		}

		//spotlight specific
		if (light.isSpotLight) {
			const spotLightHelper = new THREE.SpotLightHelper(light);
			spotLightHelper.visible = false;
			this.game.scene.add(spotLightHelper);

			this.addPositionSettingsToFolder(light, folder);

			folder.add(light, "distance", 0, 100, 1).name("Distance");
			folder.add(light, "decay", 0, 100, 1).name("Decay");
			folder.add(light, "angle", 0, Math.PI / 2, 0.01).name("Angle");
			folder.add(light, "penumbra", 0, 1, 0.01).name("Penumbra");
			folder.add(light, "castShadow").name("Cast Shadow");
			this.addShadowSettingsToFolder(light.shadow, folder);
			this.addShadowCameraSettingsToFolder(light.shadow.camera, folder);
			folder.add(spotLightHelper, "visible").name("Helper Visible");
		}

		//Directional Light specific
		if (light.isDirectionalLight) {
			const helper = new THREE.DirectionalLightHelper(light, 10);
			helper.visible = false;
			this.game.scene.add(helper);

			this.addPositionSettingsToFolder(light, folder);
			folder.add(light, "castShadow").name("Cast Shadow");
			this.addShadowSettingsToFolder(light.shadow, folder);
			this.addShadowCameraSettingsToFolder(light.shadow.camera, folder);
			folder.add(helper, "visible").name("Helper Visible");
		}

		folder.close();
	}

	addPositionSettingsToFolder(object, folder) {
		folder.add(object.position, "x", -100, 100, 0.1).name("Position X");
		folder.add(object.position, "y", -100, 100, 0.1).name("Position Y");
		folder.add(object.position, "z", -100, 100, 0.1).name("Position Z");
	}

	addShadowSettingsToFolder(shadow, folder) {
		folder.add(shadow, "bias", -0.01, 0.01, 0.0001).name("Shadow Bias");
		folder.add(shadow.mapSize, "width", 0, 4096, 1).name("Shadow Map Width");
		folder.add(shadow.mapSize, "height", 0, 4096, 1).name("Shadow Map Height");
	}

	addShadowCameraSettingsToFolder(camera, folder) {
		folder.add(camera, "near", 0, 100, 1).name("Shadow Camera Near");
		folder.add(camera, "far", 0, 5000, 1).name("Shadow Camera Far");

		if (camera.isOrthographicCamera) {
			folder.add(camera, "left", -100, 100, 1).name("Shadow Camera Left");
			folder.add(camera, "right", -100, 100, 1).name("Shadow Camera Right");
			folder.add(camera, "top", -100, 100, 1).name("Shadow Camera Top");
			folder.add(camera, "bottom", -100, 100, 1).name("Shadow Camera Bottom");
		} else {
			folder.add(camera, "aspect", 1, 10, 0.1).name("Shadow Camera Aspect");
			folder.add(camera, "fov", 0, 100, 1).name("Shadow Camera FOV");
			folder.add(camera, "zoom", 0, 100, 1).name("Shadow Camera Zoom");
		}
	}

	addEffectPanel(effect) {
		if (!this.active) return;

		if (effect.constructor.name === "BloomEffect") {
			this.addBloomEffectPanel(effect);
		}

		if (effect.constructor.name === "ChromaticAberrationEffect") {
			this.addChromaticAberrationEffectPanel(effect);
		}

		if (effect.constructor.name === "ColorDepthEffect") {
			this.addColorDepthEffectPanel(effect);
		}

		if (effect.constructor.name === "DepthOfFieldEffect") {
			this.addDepthOfFieldEffectPanel(effect);
		}

		if (effect.constructor.name === "GodRaysEffect") {
			this.addGodRaysEffectPanel(effect);
		}
	}

	addGodRaysEffectPanel(effect) {
		const folder = this.pane.addFolder({
			title: "God Rays Effect",
			expanded: false,
		});

		const godRaysMaterial = effect.godRaysMaterial;

		folder.addBinding(effect.resolution, "scale", {
			label: "resolution",
			min: 0.5,
			max: 1,
			step: 0.05,
		});
		folder.addBinding(effect, "blur");
		folder.addBinding(effect.blurPass, "kernelSize", {
			label: "blurriness",
			options: KernelSize,
		});
		folder.addBinding(godRaysMaterial, "density", {
			min: 0,
			max: 1,
			step: 0.01,
		});
		folder.addBinding(godRaysMaterial, "decay", { min: 0, max: 1, step: 0.01 });
		folder.addBinding(godRaysMaterial, "weight", {
			min: 0,
			max: 1,
			step: 0.01,
		});
		folder.addBinding(godRaysMaterial, "exposure", {
			min: 0,
			max: 1,
			step: 0.01,
		});
		folder.addBinding(godRaysMaterial, "maxIntensity", {
			min: 0,
			max: 1,
			step: 0.01,
		});
		folder.addBinding(godRaysMaterial, "samples", {
			min: 16,
			max: 128,
			step: 1,
		});

		folder.addBinding(effect.blendMode.opacity, "value", {
			label: "opacity",
			min: 0,
			max: 1,
			step: 0.01,
		});
		folder.addBinding(effect.blendMode, "blendFunction", {
			options: BlendFunction,
		});
	}

	addDepthOfFieldEffectPanel(effect) {
		const folder = this.pane.addFolder({
			title: "Depth of Field Effect",
			expanded: false,
		});

		const cocMaterial = effect.cocMaterial;

		folder.addBinding(effect.resolution, "scale", {
			label: "resolution",
			min: 0.5,
			max: 1,
			step: 0.05,
		});

		folder.addBinding(effect.blurPass, "kernelSize", { options: KernelSize });
		folder.addBinding(cocMaterial, "worldFocusDistance", {
			min: 0,
			max: 50,
			step: 0.1,
		});
		folder.addBinding(cocMaterial, "worldFocusRange", {
			min: 0,
			max: 20,
			step: 0.1,
		});
		folder.addBinding(effect, "bokehScale", { min: 0, max: 7, step: 1e-2 });
		folder.addBinding(effect.blendMode.opacity, "value", {
			label: "opacity",
			min: 0,
			max: 1,
			step: 0.01,
		});
		folder.addBinding(effect.blendMode, "blendFunction", {
			options: BlendFunction,
		});
	}

	addColorDepthEffectPanel(effect) {
		const folder = this.pane.addFolder({
			title: "Color Depth Effect",
			expanded: false,
		});
		folder.addBinding(effect, "bitDepth", { min: 1, max: 32, step: 1 });
		folder.addBinding(effect.blendMode.opacity, "value", {
			label: "opacity",
			min: 0,
			max: 1,
			step: 0.01,
		});
		folder.addBinding(effect.blendMode, "blendFunction", {
			options: BlendFunction,
		});
	}

	addBloomEffectPanel(effect) {
		const folder = this.pane.addFolder({
			title: "Bloom Effect",
			expanded: false,
		});
		folder.addBinding(effect, "intensity", { min: 0, max: 10, step: 0.01 });
		folder.addBinding(effect.mipmapBlurPass, "radius", {
			min: 0,
			max: 1,
			step: 1e-3,
		});
		folder.addBinding(effect.mipmapBlurPass, "levels", {
			min: 1,
			max: 9,
			step: 1,
		});

		let subfolder = folder.addFolder({ title: "Luminance Filter" });
		subfolder.addBinding(effect.luminancePass, "enabled");
		subfolder.addBinding(effect.luminanceMaterial, "threshold", {
			min: 0,
			max: 1,
			step: 0.01,
		});
		subfolder.addBinding(effect.luminanceMaterial, "smoothing", {
			min: 0,
			max: 1,
			step: 0.01,
		});

		folder.addBinding(effect.blendMode.opacity, "value", {
			label: "opacity",
			min: 0,
			max: 1,
			step: 0.01,
		});
		folder.addBinding(effect.blendMode, "blendFunction", {
			options: BlendFunction,
		});
	}

	addChromaticAberrationEffectPanel(effect) {
		const folder = this.pane.addFolder({
			title: "Chromatic Aberration Effect",
			expanded: false,
		});
		folder.addBinding(effect, "radialModulation");
		folder.addBinding(effect, "modulationOffset", {
			min: 0,
			max: 1.5,
			step: 1e-2,
		});
		folder.addBinding(effect, "offset", {
			x: { min: -1e-2, max: 1e-2, step: 1e-5 },
			y: { min: -1e-2, max: 1e-2, step: 1e-5, inverted: true },
		});
	}

	addMaterialDebug(material, name = "Material Debug") {
		if (!this.active) return;

		const folder = this.game.debug.ui.addFolder(name);
		if (material instanceof THREE.MeshStandardMaterial) {
			folder.addColor(material, "color").name("Color");
			folder.add(material, "fog").name("Fog");
			folder.add(material, "depthTest").name("Depth Test");
			folder.add(material, "depthWrite").name("Depth Write");
			folder.add(material, "colorWrite").name("Color Write");
			folder.add(material, "alphaTest", 0, 1).name("Alpha Test");
			folder.add(material, "roughness", 0, 1).name("Roughness");
			folder.add(material, "metalness", 0, 1).name("Metalness");
			folder.add(material, "wireframe").name("Wireframe");
			folder.addColor(material, "emissive").name("Emissive Color");
			folder
				.add(material, "emissiveIntensity", 0, 2)
				.name("Emissive Intensity");
			folder.add(material, "opacity", 0, 1).name("Opacity");
			folder.add(material, "transparent").name("Transparent");
			folder
				.add(material, "displacementScale", 0, 2)
				.name("Displacement Scale");
			folder.add(material.normalScale, "x", -3, 3).name("Normal Scale X");
			folder.add(material.normalScale, "y", -3, 3).name("Normal Scale Y");
			folder
				.add(material, "lightMapIntensity", 0, 10)
				.name("Lightmap Intensity");
			folder.add(material, "aoMapIntensity", 0, 2).name("AO Intensity");
			folder.add(material, "envMapIntensity", 0, 2).name("Envmap Intensity");
			folder.add(material, "flatShading").onChange(() => {
				material.needsUpdate = true;
			});
			folder
				.add(material, "vertexColors")
				.name("Vertex Colors")
				.onChange(() => {
					material.needsUpdate = true;
				});
			folder
				.add(material, "side", {
					Front: THREE.FrontSide,
					Back: THREE.BackSide,
					Double: THREE.DoubleSide,
				})
				.name("Side");
			folder
				.add(material, "blending", {
					Normal: THREE.NormalBlending,
					Additive: THREE.AdditiveBlending,
					Subtractive: THREE.SubtractiveBlending,
					Multiply: THREE.MultiplyBlending,
					Custom: THREE.CustomBlending,
				})
				.name("Blending");
			folder.add;

			let lastCreatedElement = null;

			// for (const map of [
			// 	"map",
			// 	"alphaMap",
			// 	"aoMap",
			// 	"normalMap",
			// 	"displacementMap",
			// 	"envMap",
			// 	"lightMap",
			// 	"metalnessMap",
			// 	"roughnessMap",
			// ]) {
			// 	this.addTextureControl(
			// 		folder,
			// 		material,
			// 		map,
			// 		textureList,
			// 		lastCreatedElement
			// 	);
			// }
		}
		if (material instanceof THREE.MeshBasicMaterial) {
			folder.addColor(material, "color").name("Color");
			folder.add(material, "wireframe").name("Wireframe");
			folder.add(material, "opacity", 0, 1).name("Opacity");
			folder.add(material, "transparent").name("Transparent");
			folder.add(material, "depthTest").name("Depth Test");
			folder.add(material, "depthWrite").name("Depth Write");
			folder.add(material, "colorWrite").name("Color Write");

			folder
				.add(material, "vertexColors")
				.name("Vertex Colors")
				.onChange(() => {
					material.needsUpdate = true;
				});

			folder.add(material, "fog").name("Fog");
			folder
				.add(material, "combine", {
					Multiply: THREE.MultiplyOperation,
					Mix: THREE.MixOperation,
					Add: THREE.AddOperation,
				})
				.name("Combine");

			folder.add(material, "reflectivity", 0, 1).name("Reflectivity");

			folder
				.add(material, "side", {
					Front: THREE.FrontSide,
					Back: THREE.BackSide,
					Double: THREE.DoubleSide,
				})
				.name("Side");
			folder
				.add(material, "blending", {
					Normal: THREE.NormalBlending,
					Additive: THREE.AdditiveBlending,
					Subtractive: THREE.SubtractiveBlending,
					Multiply: THREE.MultiplyBlending,
					Custom: THREE.CustomBlending,
				})
				.name("Blending");
			folder
				.add(material, "lightMapIntensity", 0, 10)
				.name("Lightmap Intensity");

			let lastCreatedElement = null;

			// for (const map of ["map", "alphaMap", "aoMap", "envMap", "lightMap"]) {
			// 	this.addTextureControl(
			// 		folder,
			// 		material,
			// 		map,
			// 		textureList,
			// 		lastCreatedElement
			// 	);
			// }
		}

		folder.close();
	}

	addObject3DDebug(object, name = "Object3D Debug") {
		if (!this.active) return;

		const folder = this.game.debug.ui.addFolder(name);

		folder.add(object.position, "x", -100, 100, 0.1).name("Position X");
		folder.add(object.position, "y", -100, 100, 0.1).name("Position Y");
		folder.add(object.position, "z", -100, 100, 0.1).name("Position Z");

		folder
			.add(object.rotation, "x", -Math.PI, Math.PI, 0.01)
			.name("Rotation X");
		folder
			.add(object.rotation, "y", -Math.PI, Math.PI, 0.01)
			.name("Rotation Y");
		folder
			.add(object.rotation, "z", -Math.PI, Math.PI, 0.01)
			.name("Rotation Z");

		folder.add(object.scale, "x", 0, 10, 0.1).name("Scale X");
		folder.add(object.scale, "y", 0, 10, 0.1).name("Scale Y");
		folder.add(object.scale, "z", 0, 10, 0.1).name("Scale Z");

		folder.close();
	}

	addSceneDebug(scene, name = "Scene Debug") {
		if (!this.active) return;

		const folder = this.game.debug.ui.addFolder(name);

		folder.addColor(scene, "background").name("Background");
		folder.addColor(scene.fog, "color").name("Fog");
		folder.add(scene.fog, "near", 0, 100, 1).name("Fog Near");
		folder.add(scene.fog, "far", 0, 1000, 1).name("Fog Far");

		folder.close();
	}

	addTextureDebug(texture = new THREE.Texture(), name = "Texture Debug") {
		if (!this.active) return;

		const folder = this.ui.addFolder(name);

		folder
			.add(texture, "wrapS", {
				Clamp: THREE.ClampToEdgeWrapping,
				Repeat: THREE.RepeatWrapping,
				Mirror: THREE.MirroredRepeatWrapping,
			})
			.onChange(() => {
				texture.needsUpdate = true;
			});
		folder
			.add(texture, "wrapT", {
				Clamp: THREE.ClampToEdgeWrapping,
				Repeat: THREE.RepeatWrapping,
				Mirror: THREE.MirroredRepeatWrapping,
			})
			.onChange(() => {
				texture.needsUpdate = true;
			});
		folder
			.add(texture, "magFilter", {
				Nearest: THREE.NearestFilter,
				Linear: THREE.LinearFilter,
			})
			.onChange(() => {
				texture.needsUpdate = true;
			});
		folder
			.add(texture, "minFilter", {
				Nearest: THREE.NearestFilter,
				Linear: THREE.LinearFilter,
				NearestMipMapNearest: THREE.NearestMipMapNearestFilter,
				LinearMipMapNearest: THREE.LinearMipMapNearestFilter,
				NearestMipMapLinear: THREE.NearestMipMapLinearFilter,
				LinearMipMapLinear: THREE.LinearMipMapLinearFilter,
			})
			.onChange(() => {
				texture.needsUpdate = true;
			});
		folder.add(texture, "anisotropy", 0, 16);

		folder.add(texture, "colorSpace", {
			None: THREE.NoColorSpace,
			SRGB: THREE.SRGBColorSpace,
			Linear: THREE.LinearSRGBColorSpace,
		});

		for (let i of ["x", "y"]) {
			folder.add(texture.offset, i, -10, 10).name(`Offset ${i.toUpperCase()}`);
		}

		folder
			.add(texture.repeat, "x", 0, 200)
			.name("Repeat")
			.onChange(() => {
				texture.repeat.y = texture.repeat.x;
			});

		folder.add(texture, "rotation", 0, 6.28).name("Rotation");
		folder.add(texture, "flipY").name("Flip Y");

		folder.close();
	}
}
