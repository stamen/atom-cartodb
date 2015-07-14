"use babel";

import "leaflet";

export default L.Control.extend({
  options: {
    position: "topleft"
  },

  onAdd: function(map) {
    const container = L.DomUtil.create("div", "leaflet-bar leaflet-control leaflet-control-showlocation");

    container.innerHTML = `<strong>${map.getCenter().wrap().lat.toFixed(4)}, ${map.getCenter().wrap().lng.toFixed(4)}</strong>`;

    this.listener = function(evt) {
      container.innerHTML = `<strong>${map.getCenter().wrap().lat.toFixed(4)}, ${map.getCenter().wrap().lng.toFixed(4)}</strong>`;
    };

    map.on("move", this.listener);

    return container;
  },

  onRemove: function(map) {
    map.off("move", this.listener);
  }
});
