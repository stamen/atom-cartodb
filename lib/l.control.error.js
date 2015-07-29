"use babel";

import "leaflet";
import request from "request";

export default L.Control.extend({
  initialize: function(message, options) {
    this.message = message;
    L.Util.setOptions(this, options);
  },

  options: {
    position: "bottomleft"
  },

  onAdd: function(map) {
    this.container = L.DomUtil.create("div", "error-control");

    this.listener = (evt) => {
      this.container.innerHTML = "";

      evt.layer.once("tileerror", (evt) => {
        console.log("url:", evt.url);

        return request.get({
          json: true,
          uri: evt.url
        }, (err, rsp, body) => {
          if (err) {
            console.warn(err);
            return;
          }

          if (body.errors) {
            console.log(body.errors.join("\n\n"));

            const message = body.errors.join("\n\n").replace(/\n/g, "<br>\n");

            this.container.innerHTML = `
<atom-panel class='bottom'>
    <div class="padded">
        <div class="inset-panel">
            <div class="panel-heading text-error"><strong>CartoDB Error</strong></div>
            <div class="panel-body padded"><code>${message}</code></div>
        </div>
    </div>
</atom-panel>
`;

            return;
          }

          console.warn(rsp.statusCode, body);
        });
      });
    };

    map.on("layeradd", this.listener);

    return this.container;
  },

  onRemove: function(map) {
    map.off("layeradd", this.listener);
  },

  displayError: function(message) {
    this.container.innerHTML = `
<atom-panel class='bottom'>
<div class="padded">
<div class="inset-panel">
    <div class="panel-heading text-error"><strong>CartoDB Error</strong></div>
    <div class="panel-body padded"><code>${message}</code></div>
</div>
</div>
</atom-panel>
`;
  }
});
