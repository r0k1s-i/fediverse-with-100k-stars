
(function() {
    'use strict';

    function convertGeometryToBuffer(geometry, material) {
        var bufferGeometry = new THREE.BufferGeometry();
        var vertices = geometry.vertices;
        var colors = geometry.colors;

        var count = vertices.length;
        var positions = new Float32Array(count * 3);
        
        for (var i = 0; i < count; i++) {
            positions[i * 3] = vertices[i].x;
            positions[i * 3 + 1] = vertices[i].y;
            positions[i * 3 + 2] = vertices[i].z;
        }

        bufferGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        if (colors.length > 0) {
            var colorArray = new Float32Array(count * 3);
            for (var i = 0; i < colors.length; i++) {
                colorArray[i * 3] = colors[i].r;
                colorArray[i * 3 + 1] = colors[i].g;
                colorArray[i * 3 + 2] = colors[i].b;
            }
            bufferGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        }

        if (material && material.attributes) {
            for (var name in material.attributes) {
                var attr = material.attributes[name];
                if (attr.value && attr.value.length > 0) {
                    var itemSize = 1;
                    if (attr.type === 'c') itemSize = 3;
                    else if (attr.type === 'v2') itemSize = 2;
                    else if (attr.type === 'v3') itemSize = 3;
                    else if (attr.type === 'v4') itemSize = 4;

                    var flatArray;
                    if (attr.value[0] instanceof THREE.Color) {
                        flatArray = new Float32Array(count * 3);
                        for (var i = 0; i < count; i++) {
                            var val = attr.value[i] || new THREE.Color();
                            flatArray[i * 3] = val.r;
                            flatArray[i * 3 + 1] = val.g;
                            flatArray[i * 3 + 2] = val.b;
                        }
                        bufferGeometry.setAttribute(name, new THREE.BufferAttribute(flatArray, 3));
                    } else if (typeof attr.value[0] === 'number') {
                        flatArray = new Float32Array(count);
                        for (var i = 0; i < count; i++) {
                            flatArray[i] = attr.value[i] || 0;
                        }
                        bufferGeometry.setAttribute(name, new THREE.BufferAttribute(flatArray, 1));
                    }
                }
            }
            delete material.attributes;
        }

        return bufferGeometry;
    }

    function convertSimpleGeometryToBuffer(geometry) {
        var bufferGeometry = new THREE.BufferGeometry();
        var vertices = geometry.vertices;

        if (vertices && vertices.length > 0) {
            var positions = new Float32Array(vertices.length * 3);
            for (var i = 0; i < vertices.length; i++) {
                positions[i * 3] = vertices[i].x;
                positions[i * 3 + 1] = vertices[i].y;
                positions[i * 3 + 2] = vertices[i].z;
            }
            bufferGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        }

        if (geometry.colors && geometry.colors.length > 0) {
            var colors = new Float32Array(geometry.colors.length * 3);
            for (var i = 0; i < geometry.colors.length; i++) {
                colors[i * 3] = geometry.colors[i].r;
                colors[i * 3 + 1] = geometry.colors[i].g;
                colors[i * 3 + 2] = geometry.colors[i].b;
            }
            bufferGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        }

        return bufferGeometry;
    }

    if (!THREE.ImageUtils) {
        THREE.ImageUtils = {};
    }

    var textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = '';

    THREE.ImageUtils.crossOrigin = '';

    THREE.ImageUtils.loadTexture = function(url, mapping, onLoad, onError) {
        var texture = textureLoader.load(url, onLoad, undefined, onError);
        if (mapping) texture.mapping = mapping;
        return texture;
    };

    THREE.ImageUtils.loadTextureCube = function(urls, mapping, onLoad, onError) {
        var loader = new THREE.CubeTextureLoader();
        var texture = loader.load(urls, onLoad, undefined, onError);
        if (mapping) texture.mapping = mapping;
        return texture;
    };

    if (!THREE.Geometry) {
        THREE.Geometry = function() {
            this.uuid = THREE.MathUtils.generateUUID();
            this.name = '';
            this.vertices = [];
            this.colors = [];
            this.faces = [];
            this.faceVertexUvs = [[]];
            this.morphTargets = [];
            this.morphNormals = [];
            this.skinWeights = [];
            this.skinIndices = [];
            this.boundingBox = null;
            this.boundingSphere = null;
            this.elementsNeedUpdate = false;
            this.verticesNeedUpdate = false;
            this.colorsNeedUpdate = false;
            this.normalsNeedUpdate = false;
        };

        THREE.Geometry.prototype = {
            constructor: THREE.Geometry,

            applyMatrix: function(matrix) {
                return this.applyMatrix4(matrix);
            },

            applyMatrix4: function(matrix) {
                var normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
                for (var i = 0; i < this.vertices.length; i++) {
                    this.vertices[i].applyMatrix4(matrix);
                }
                return this;
            },

            toBufferGeometry: function() {
                var geometry = new THREE.BufferGeometry();
                var vertices = this.vertices;
                var colors = this.colors;

                var positions = new Float32Array(vertices.length * 3);
                var colorArray = null;

                for (var i = 0; i < vertices.length; i++) {
                    positions[i * 3] = vertices[i].x;
                    positions[i * 3 + 1] = vertices[i].y;
                    positions[i * 3 + 2] = vertices[i].z;
                }

                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

                if (colors.length > 0) {
                    colorArray = new Float32Array(colors.length * 3);
                    for (var i = 0; i < colors.length; i++) {
                        colorArray[i * 3] = colors[i].r;
                        colorArray[i * 3 + 1] = colors[i].g;
                        colorArray[i * 3 + 2] = colors[i].b;
                    }
                    geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
                }

                return geometry;
            },

            computeBoundingBox: function() {
                if (this.boundingBox === null) {
                    this.boundingBox = new THREE.Box3();
                }
                this.boundingBox.setFromPoints(this.vertices);
            },

            computeBoundingSphere: function() {
                if (this.boundingSphere === null) {
                    this.boundingSphere = new THREE.Sphere();
                }
                this.boundingSphere.setFromPoints(this.vertices);
            },

            dispose: function() {
            }
        };
    }

    if (!THREE.ParticleSystem) {
        THREE.ParticleSystem = class extends THREE.Points {
            constructor(geometry, material) {
                var bufferGeometry = geometry;
                if (geometry && (geometry.isGeometry || geometry.vertices)) {
                    bufferGeometry = convertGeometryToBuffer(geometry, material);
                }
                super(bufferGeometry, material);
            }
        };
        THREE.ParticleSystemMaterial = THREE.PointsMaterial;
    }

    if (typeof THREE.LinePieces === 'undefined') {
        THREE.LinePieces = 1;
    }

    var OriginalLine = THREE.Line;
    THREE.Line = function(geometry, material, mode) {
        var bufferGeometry = geometry;
        if (geometry && (geometry.isGeometry || geometry.vertices)) {
            bufferGeometry = convertSimpleGeometryToBuffer(geometry);
        }

        if (mode === THREE.LinePieces || mode === 1) {
            return new THREE.LineSegments(bufferGeometry, material);
        }
        return new OriginalLine(bufferGeometry, material);
    };
    THREE.Line.prototype = OriginalLine.prototype;

    if (!THREE.Face3) {
        THREE.Face3 = function(a, b, c, normal, color, materialIndex) {
            this.a = a;
            this.b = b;
            this.c = c;
            this.normal = normal instanceof THREE.Vector3 ? normal : new THREE.Vector3();
            this.vertexNormals = Array.isArray(normal) ? normal : [];
            this.color = color instanceof THREE.Color ? color : new THREE.Color();
            this.vertexColors = Array.isArray(color) ? color : [];
            this.materialIndex = materialIndex !== undefined ? materialIndex : 0;
        };
    }

    if (!THREE.GeometryUtils) {
        THREE.GeometryUtils = {
            merge: function(geometry1, geometry2, materialIndexOffset) {
                if (geometry2.vertices) {
                    for (var i = 0; i < geometry2.vertices.length; i++) {
                        geometry1.vertices.push(geometry2.vertices[i].clone());
                    }
                }
                if (geometry2.colors) {
                    for (var i = 0; i < geometry2.colors.length; i++) {
                        geometry1.colors.push(geometry2.colors[i].clone());
                    }
                }
            }
        };
    }

    if (!THREE.LensFlare) {
        THREE.LensFlare = class extends THREE.Object3D {
            constructor(texture, size, distance, blending, color) {
                super();
                this.lensFlares = [];
                this.positionScreen = new THREE.Vector3();
                this.customUpdateCallback = null;
                this.size = size || 16000;

                if (texture) {
                    this.add(texture, size, distance, blending, color);
                }
            }

            add(texture, size, distance, blending, color, opacity) {
                if (texture && texture.isTexture) {
                    this.lensFlares.push({
                        texture: texture,
                        size: size || -1,
                        distance: distance || 0,
                        x: 0,
                        y: 0,
                        z: 0,
                        scale: 1,
                        rotation: 0,
                        opacity: opacity !== undefined ? opacity : 1,
                        color: color || new THREE.Color(0xffffff),
                        blending: blending || THREE.NormalBlending
                    });
                } else {
                    super.add(texture);
                }
            }

            updateLensFlares() {
            }
        };
    }

    if (!THREE.Gyroscope) {
        THREE.Gyroscope = class extends THREE.Object3D {
            constructor() {
                super();
            }

            updateMatrixWorld(force) {
                if (this.matrixAutoUpdate) this.updateMatrix();

                if (this.matrixWorldNeedsUpdate || force) {
                    if (this.parent !== null) {
                        this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);

                        var worldPosition = new THREE.Vector3();
                        worldPosition.setFromMatrixPosition(this.matrixWorld);

                        this.matrixWorld.copy(this.matrix);
                        this.matrixWorld.setPosition(worldPosition);
                    } else {
                        this.matrixWorld.copy(this.matrix);
                    }

                    this.matrixWorldNeedsUpdate = false;
                    force = true;
                }

                for (var i = 0, l = this.children.length; i < l; i++) {
                    this.children[i].updateMatrixWorld(force);
                }
            }
        };
    }

    var originalSetPosition = THREE.Matrix4.prototype.setPosition;
    THREE.Matrix4.prototype.setPosition = function(x, y, z) {
        if (x instanceof THREE.Vector3) {
            return originalSetPosition.call(this, x);
        }
        var te = this.elements;
        te[12] = x;
        te[13] = y;
        te[14] = z;
        return this;
    };

    if (typeof Math.TWO_PI === 'undefined') {
        Math.TWO_PI = Math.PI * 2;
    }

    if (THREE.WebGLRenderer) {
        var OriginalWebGLRenderer = THREE.WebGLRenderer;
        THREE.WebGLRenderer = class extends OriginalWebGLRenderer {
            constructor(parameters) {
                super(parameters);
                
                if (!this.getMaxAnisotropy && this.capabilities) {
                    this.getMaxAnisotropy = function() {
                        return this.capabilities.getMaxAnisotropy();
                    };
                }
            }
        };
    }

    console.log('Three.js Compatibility Layer loaded (r58 -> r158)');
})();
