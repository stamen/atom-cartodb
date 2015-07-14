"use babel";

import "leaflet";

export default L.Control.extend({
  initialize: function(message, options) {
    this.message = message;
    L.Util.setOptions(this, options);
  },

  options: {
    position: "bottomleft"
  },

  onAdd: function(map) {
    const container = L.DomUtil.create("div", "error-control");

    container.innerHTML = `
<atom-panel class='bottom'>
    <div class="padded">
        <div class="inset-panel">
            <div class="panel-heading text-error"><strong>CartoDB Error</strong></div>
            <div class="panel-body padded"><code>${this.message.replace(/\n/g, "<br>")}</code></div>
        </div>
    </div>
</atom-panel>
`;

    return container;
  }
});
