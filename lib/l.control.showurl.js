"use babel";

import "leaflet";

export default L.Control.extend({
  options: {
    position: "topleft"
  },

  onAdd: function(map) {
    const container = L.DomUtil.create("div", "leaflet-bar leaflet-control leaflet-control-showurl");

    this.listener = function(evt) {
      container.innerHTML = evt.layer._url;
    };

    map.on("layeradd", this.listener);

    return container;
  },

  onRemove: function(map) {
    map.off("layeradd", this.listener);
  }
});
