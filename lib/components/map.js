"use babel";

import Leaflet from "leaflet";
import React from "react";

import "../l.control.geosearch";
import "../l.geosearch.provider.nominatim";
import ErrorControl from "../l.control.error";
import ShowLocationControl from "../l.control.showlocation";
import ShowUrlControl from "../l.control.showurl";
import ShowZoomControl from "../l.control.showzoom";

export default class Map extends React.Component {
  componentDidMount() {
    // TODO if no center/zoom is provided, use the first one found in the TileJSON
    this.leaflet = Leaflet.map(this.container, {
      center: this.props.center,
      zoom: this.props.zoom,
      scrollWheelZoom: false
    });

    this.leaflet.attributionControl.setPrefix("");

    this.leaflet.on("moveend", () => this.props.setView(this.leaflet.getCenter(), this.leaflet.getZoom()));

    // TODO would a bottom panel item be better?
    this.errorControl = new ErrorControl({
      position: "bottomleft"
    }).addTo(this.leaflet);

    new ShowUrlControl({
      position: "bottomleft"
    }).addTo(this.leaflet);

    new ShowLocationControl({
      position: "bottomleft"
    }).addTo(this.leaflet);

    new ShowZoomControl({
      position: "bottomleft"
    }).addTo(this.leaflet);

    new L.Control.GeoSearch({
      provider: new L.GeoSearch.Provider.Nominatim(),
      showMarker: false
    }).addTo(this.leaflet);

    // TODO extract into method
    // TODO use TileJSON
    this.props.layers
      .map(layer => Leaflet.tileLayer(layer))
      .map(layer => this.leaflet.addLayer(layer));

    this.layers = this.props.layers;

    // trigger a resize event so that the map uses the full pane
    setImmediate(() => this.leaflet.invalidateSize());
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.props.active !== nextProps.active ||
        this.props.flexScale !== nextProps.flexScale) {
      this.leaflet.invalidateSize();

      return false;
    }

    return true;
  }

  componentDidUnmount() {
    this.leaflet.remove();
  }

  componentDidUpdate() {
    // TODO fold this into a Layer component (that only tracks a list of layers)
    if (!(this.layers.length === this.props.layers &&
          this.layers.every((x, i) => x === this.props.layers[i]))) {
      // replace the map layer
      // cleander if handled by a subcomponent
      // TODO wrangle z-index values if layers are already present

      const layers = [];

      this.leaflet.eachLayer(layer => layers.push(layer));
      layers.forEach(layer => this.leaflet.removeLayer(layer));

      // TODO extract into method (and make smarter)
      this.props.layers
        .map(layer => Leaflet.tileLayer(layer))
        .map(layer => this.leaflet.addLayer(layer));

      this.layers = this.props.layers;
    }
    // const activeLayer = Leaflet.tileLayer(this.urlTemplate)
    //
    // const layers = [];
    //
    // this.leaflet.eachLayer((layer) => layers.push(layer));
    //
    // if (!this.leaflet.hasLayer(activeLayer)) {
    //   console.log("new active layer");
    //   console.log("existing layers:", layers);
    //   // remove existing layers
    //   layers.forEach((layer) => this.leaflet.removeLayer(layer));
    //
    //   // this.leaflet.addLayer(activeLayer);
    // }

    this.leaflet.setView(this.props.center, this.props.zoom);
    this.errorControl.displayError(this.props.error);
  }

  render() {
    return (
      <div ref={(c) => this.container = c} />
    );
  }
}
