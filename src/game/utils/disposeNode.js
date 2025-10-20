import * as THREE from "three";

export function disposeNode(parentObject) {
	//log the call stack
	// console.log("disposeNode", new Error().stack);

	if (!parentObject) {
		console.warn("Warning: Target object is undefined", parentObject);
		return;
	}

	if (typeof parentObject.traverse == "function") {
		parentObject.traverse(function (node) {
			if (node.dispose) {
				dispose(node);
			}

			if (node.skeleton) {
				dispose(node.skeleton);
			}

			if (node.geometry) {
				dispose(node.geometry);
			}

			let materials = Array.isArray(node.material)
				? node.material
				: [node.material];
			materials.forEach((material) => {
				if (material) {
					[
						"map",
						"lightMap",
						"bumpMap",
						"normalMap",
						"specularMap",
						"envMap",
						"alphaMap",
						"roughnessMap",
						"metalnessMap",
						"emissiveMap",
						"displacementMap",
						"aoMap",
					].forEach((mapName) => {
						if (material[mapName]) {
							dispose(material[mapName]);
						}
					});

					// Dispose of textures in uniforms
					if (node.material.uniforms) {
						for (let uniformName in node.material.uniforms) {
							let uniform = node.material.uniforms[uniformName];
							if (Array.isArray(uniform.value)) {
								// uniform is an array of textures
								uniform.value.forEach((texture) => {
									if (texture instanceof THREE.Texture) {
										dispose(texture);
									}
								});
							} else if (uniform.value instanceof THREE.Texture) {
								dispose(uniform.value);
							}
						}
					}

					dispose(material);
				}
			});
		});
	}

	if (parentObject.renderTarget) parentObject.renderTarget.dispose();
	if (parentObject.geometry) parentObject.geometry.dispose();
	if (parentObject.material) parentObject.material.dispose();
	if (parentObject.texture) parentObject.texture.dispose();

	// Check for direct disposal function
	if (typeof parentObject.dispose === "function") {
		dispose(parentObject);
	}

	removeFromParent(parentObject);
}

function dispose(object) {
	try {
		object.dispose();
	} catch (err) {
		console.log("ERROR", err, object);
	}
}

function removeFromParent(object) {
	if (object.parent) {
		object.removeFromParent(); // This will remove the object from its parent
	}
}
