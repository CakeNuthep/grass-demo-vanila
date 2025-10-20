import { MeshBVH } from "three-mesh-bvh";
import { BufferGeometryUtils } from "three/addons/Addons.js";
import * as THREE from "three";
import { disposeNode } from "./disposeNode.js";

export function buildCollider(mesh) {
	mesh.updateMatrixWorld(true);

	//geometries to be merged for collider
	const geometries = [];
	const toDispose = [];
	mesh.traverse((c) => {
		if (c.geometry && !c.userData.nonphysical) {
			const cloned = c.geometry.clone();
			toDispose.push(cloned);
			cloned.applyMatrix4(c.matrixWorld);
			for (const key in cloned.attributes) {
				if (key !== "position") {
					cloned.deleteAttribute(key);
				}
			}

			geometries.push(cloned);
		}
	});

	const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, false);

	mergedGeometry.boundsTree = new MeshBVH(mergedGeometry, {
		lazyGeneration: true,
	});

	const collider = new THREE.Mesh(mergedGeometry);
	collider.material.wireframe = true;
	// collider.material.opacity = 0.5;
	// collider.material.transparent = true;
	// collider.visible = false;

	toDispose.forEach((geometry) => {
		disposeNode(geometry);
	});

	return collider;
}
