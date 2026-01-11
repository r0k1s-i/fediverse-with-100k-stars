import * as THREE from "three";

export class Gyroscope extends THREE.Object3D {
  constructor() {
    super();
    this.translation = new THREE.Vector3();
    this.rotationQ = new THREE.Quaternion();
    this.scaleV = new THREE.Vector3();
  }

  updateMatrixWorld(force) {
    if (this.matrixAutoUpdate) this.updateMatrix();

    if (this.matrixWorldNeedsUpdate || force) {
      if (this.parent !== null) {
        this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);

        this.matrixWorld.decompose(
          this.translation,
          this.rotationQ,
          this.scaleV,
        );
        
        const worldX = this.translation.x;
        const worldY = this.translation.y;
        const worldZ = this.translation.z;

        this.matrix.decompose(this.translation, this.rotationQ, this.scaleV);

        this.translation.set(worldX, worldY, worldZ);

        this.matrixWorld.compose(this.translation, this.rotationQ, this.scaleV);
      } else {
        this.matrixWorld.copy(this.matrix);
      }

      this.matrixWorldNeedsUpdate = false;

      force = true;
    }

    for (let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].updateMatrixWorld(force);
    }
  }
}
