"use babel";

import {connect} from "react-redux";

import Map from "./map";
import * as actions from "../actions";

const mapStateToProps = (state) => state;

// export a connected version of the Map
export default connect(mapStateToProps, actions)(Map);
