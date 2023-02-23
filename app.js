
var frag = `#define GLSLIFY 1
vec3 getDepth(sampler2D depth, vec2 uvs) {
  return texture2D(depth, uvs).rgb;
}
vec3 getDepthFromBottomHalf(sampler2D tex, vec2 uvs) {
  vec2 lower_half_uvs = vec2(uvs.x, uvs.y * 0.5);
  return texture2D(tex, lower_half_uvs).rgb;
}
vec3 getColorFromUpperHalf(sampler2D tex, vec2 uvs) {
  vec2 upper_half_uvs = vec2(uvs.x, (uvs.y * 0.5) + 0.5);
  return texture2D(tex, upper_half_uvs).rgb;
}
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform float debugDepth;
uniform float opacity;
uniform vec3 chromaColor;
varying vec2 vUv;
vec3 depth;
vec3 color;
void main() {
  #ifdef TOP_BOTTOM
  depth = getDepthFromBottomHalf(colorTexture, vUv);
  color = getColorFromUpperHalf(colorTexture, vUv);
  #endif
  #ifdef SEPERATE
  depth = getDepth(depthTexture, vUv);
  color = texture2D(colorTexture, vUv).rgba;
  #endif
  vec3 depthColorMixer = mix(color, depth, debugDepth);
  float alpha = smoothstep(0.0, 0.5, length(depthColorMixer - chromaColor));

  gl_FragColor = vec4(depthColorMixer, alpha);
}`;

var vert = `#define GLSLIFY 1
vec3 getDepth(sampler2D depth, vec2 uvs) {
  return texture2D(depth, uvs).rgb;
}
vec3 getDepthFromBottomHalf(sampler2D tex, vec2 uvs) {
  vec2 lower_half_uvs = vec2(uvs.x, uvs.y * 0.5);
  return texture2D(tex, lower_half_uvs).rgb;
}
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform float pointSize;
uniform float displacement;
varying vec2 vUv;
varying float alpha;
float depth;
void main() {
  vUv = uv;
  gl_PointSize = pointSize;
  #ifdef TOP_BOTTOM
  depth = getDepthFromBottomHalf(colorTexture, vUv).r;
  #endif
  #ifdef SEPERATE
  depth = getDepth(depthTexture, vUv).r;
  #endif
  float disp = displacement * depth;
  vec3 offset = position + (-normal) * disp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(offset, 1.0);
}`;

var Uniforms = {
  colorTexture: {
    type: 't',
    value: null
  },
  depthTexture: {
    type: 't',
    value: null
  },
  time: {
    type: 'f',
    value: 0.0
  },
  opacity: {
    type: 'f',
    value: 1.0
  },
  pointSize: {
    type: 'f',
    value: 3.0
  },
  debugDepth: {
    type: 'f',
    value: 0.0
  },
  displacement: {
    type: 'f',
    value: 1.0
  },
  chromaColor: { type: "c", value: new THREE.Color(0x000000) }
};

class Viewer extends THREE.Object3D {
  constructor(texture, depth, is_video, is_equi) {
    super();
    texture = this.setDefaultTextureProps(texture);
    this.material = new THREE.ShaderMaterial({
      uniforms: Uniforms,
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      side: THREE.BackSide
    });
    var radius = 6;
    var density = 256;
    if (is_video === true) {
      this.setShaderDefines(this.material, ["TOP_BOTTOM"]);
    } else {
      this.setShaderDefines(this.material, ["SEPERATE"]);
    }

    if (!Viewer.geometry && is_equi != true) {
      var ratio = 1280.0 / 720.0;
      Viewer.geometry = this.createPlaneGeometry(ratio, radius, density);
    }

    if (!Viewer.geometry && is_equi == true) {
      Viewer.geometry = this.createSphereGeometry(radius, density);
    }

    if (is_video == true) {
      console.log("IS VIDEO");
      this.assignVideoTexture(texture);
    } else {

      this.assignImageTexture(texture, depth);
    }
    this.displacement = 7.0;



    this.mesh_obj = this.createMesh(Viewer.geometry, this.material);
    super.add(this.createMesh(Viewer.geometry, this.material));
  }

  setShaderDefines(material, defines) {
    console.log("DEFINE");
    defines.forEach(function (define) {

      console.log(define);
      return material.defines[define] = '';
    });
  }

  createPlaneGeometry(ratio, radius, meshDensity) {
    return new THREE.PlaneGeometry(ratio * radius, radius, meshDensity, meshDensity);
  }

  createSphereGeometry(radius, meshDensity) {
    return new THREE.SphereGeometry(radius, meshDensity, meshDensity);
  }

  assignImageTexture(colorTexture, depthTexture) {
    if (!depthTexture) throw new Error('Depthmap must be provided sir!');
    this.depth = depthTexture;
    this.texture = colorTexture;
  }
  assignVideoTexture(videoTexture) {
    this.texture = videoTexture;

  }

  setDefaultTextureProps(texture) {
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    texture.generateMipmaps = false;
    return texture;
  }

  createMesh(geo, mat) {
    if (this.material.wireframe) this.material.wireframe = false;
    return new THREE.Mesh(geo, mat);
  }

  toggleDepthDebug(state) {
    this.material.uniforms.debugDepth.value = state != undefined ? state : !this.material.uniforms.debugDepth.value;
  }

  set displacement(val) {
    this.material.uniforms.displacement.value = val;
  }

  set depth(map) {
    this.material.uniforms.depthTexture.value = map;
  }


  set texture(map) {
    this.material.uniforms.colorTexture.value = map;
  }

  set opacity(val) {
    this.material.uniforms.opacity.value = val;
  }

  set pointSize(val) {
    this.material.uniforms.pointSize.value = val;
  }

  get mesh_object() {
    return this.mesh_object;
  }
  get config() {
    return this.props;
  }

  get opacity() {
    return this.material.uniforms.opacity.value;
  }

  get pointSize() {
    return this.material.uniforms.pointSize.value;
  }

  get displacement() {
    return this.material.uniforms.displacement.value;
  }

  get texture() {
    return this.material.uniforms.colorTexture.value;
  }

  get depth() {
    return this.material.uniforms.opacity.value;
  }
}