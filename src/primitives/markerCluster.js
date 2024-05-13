const THREE = require('three');
const markerImage = new Image(128, 128);
markerImage.src = require("../assets/mapMarkerOrange.svg");
const texture = new THREE.Texture();
texture.image = markerImage;
texture.needsUpdate = true;
const size = [0.03, 0.04, 1];
const spriteMaterial = new THREE.SpriteMaterial({
  map: texture,
  alphaTest: 0.5,
  transparent: true,
  depthTest: false,
  depthWrite: false,
  sizeAttenuation: false
});

/**
 * A special graphics type with a tear drop shape.
 * It forms a cluster a marker based on distance.
 * 
 * @class
 * @author Alan Wu
 * @return {Marker}
 */
const MarkerCluster = function(zincObject) {
  (require('./zincObject').ZincObject).call(this);
  this.texture = texture;
  let sprite = undefined;
  this.morph = new THREE.Group();
  this.group = this.morph;
  this.isMarkerCluster = true;
  let enabled = true;
  let sprites = [];
  this.markers = {};
  let _v21 = new THREE.Vector2();
  let _v22 = new THREE.Vector2();
  let _radius = 0.1;

  /**
   * Set the size of the marker.
   * 
   * @param {Number} size - size to be set.
   */ 
  this.setSpriteSize = size => {
    sprite.scale.set(0.015, 0.02, 1);
    sprite.scale.multiplyScalar(size);
  }

  this.clear = () => {
    this.group.clear();
    this.markers = {};
  }

  /**
   * Clean up this object,
   */ 
  this.dispose = () => {
    this.clear();
    if (this.morph) {
      this.morph.clear();
    }
  }

  const createNewSprite = () => {
    //Group is needed to set the position after scaling
    //the sprite
    const localGroup = new THREE.Group();
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.center.set(0.5, 0);
    sprite.position.set(0, 0, 0);
    sprite.renderOrder = 10000;
    sprite.scale.set(size[0], size[1], size[2]);
    sprite.userData = this;
    localGroup.add(sprite);
    this.group.add(localGroup);
    return localGroup;
  }

  const drawClusters = (clusters) => {
    let currentIndex = 0;
    clusters.forEach((cluster) => {
      const length = cluster.members.length;
      if (length === 1) {
        cluster.members[0].setVisibility(true);
      } else {
        cluster.members.forEach((marker) => {
          marker.setVisibility(false);
        });
        if (!sprites[currentIndex]) {
          sprites.push(createNewSprite());
        }
        sprites[currentIndex].visible = true;
        sprites[currentIndex].position.set(
          cluster.coords[0], cluster.coords[1], cluster.coords[2]
        );
        currentIndex++;
      }
    });
    for (currentIndex; currentIndex < sprites.length; currentIndex++) {
      sprites[currentIndex].visible = false;
    }
  }

  //Get clusters based on the ndc coordinate for each cluster.
  const getCluster = (markersObj, clusters) => {
    let first = true;
    let newCluster = {members: [], coords: [0,0,0]};
    let dist = 0;
    for (let prop in markersObj) {
      if (first) {
        _v21.set(markersObj[prop].ndc.x, markersObj[prop].ndc.y);
        this._b1.setFromPoints([markersObj[prop].morph.position]);
        first = false;
        newCluster.members.push(markersObj[prop]);
        clusters.push(newCluster);
        delete markersObj[prop];
      } else {
        _v22.set(markersObj[prop].ndc.x, markersObj[prop].ndc.y);
        dist = _v21.distanceTo(_v22);
        if (_radius > dist) {
          newCluster.members.push(markersObj[prop]);
          this._b1.expandByPoint(markersObj[prop].morph.position);
          delete markersObj[prop];
        }
      }
    }
    this._b1.getCenter(this._v2);
    newCluster.coords = [this._v2.x, this._v2.y, this._v2.z];
    //The following will not be called if there is object left and
    //thus finishing clustering
    if (first !== true) {
      getCluster(markersObj, clusters);
    }
  }

  this.calculate = () => {
    let clusters = [];
    getCluster({...this.markers}, clusters);
    drawClusters(clusters)
  }

  this.isEnabled = () => {
    return enabled;
  }

  /**
   * Enable and visualise the marker.
   */  
  this.enable = () => {
    enabled = true;
    this.morph.visible = true;
  }

  /**
   * Disable and hide the marker.
   */ 
  this.disable = () => {
    enabled = false;
    this.morph.visible = false;
  }

}

MarkerCluster.prototype = Object.create((require('./zincObject').ZincObject).prototype);
exports.MarkerCluster = MarkerCluster;
