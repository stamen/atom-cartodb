"use babel";

import {applyMiddleware, createStore} from "redux";
import createLogger from "redux-logger";

import reducer from "./reducers";

const createStoreWithMiddleware = applyMiddleware(createLogger())(createStore);

export default function makeStore(initialState) {
  return createStoreWithMiddleware(reducer, initialState);
}
