"use babel";

import "leaflet";

export default L.Control.extend({
  options: {
    position: "topleft"
  },

  onAdd: function(map) {
    const container = L.DomUtil.create("div", "leaflet-bar leaflet-control leaflet-control-showzoom");

    container.innerHTML = `<strong>${map.getZoom()}</strong>`;

    this.listener = function(evt) {
      container.innerHTML = `<strong>${map.getZoom()}</strong>`;
    };

    map.on("zoomend", this.listener);

    return container;
  },

  onRemove: function(map) {
    map.off("zoomend", this.listener);
  }
});
