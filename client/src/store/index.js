import { createStore } from "vuex";
import * as user from "./modules/user";
import * as team from "./modules/team";
import * as tournament from "./modules/tournament";
import * as tournamentFormat from "./modules/tournament-format";

const store = createStore({
  modules: {
    user,
    team,
    tournament,
    tournamentFormat,
  },
  state: () => ({
    progress: null,
    routeInfo: {},
  }),
  mutations: {
    setProgress(state, payload) {
      state.progress = payload;
    },
    setRouteInfo(state, payload) {
      state.routeInfo = payload;
    },
  },
  actions: {},
});

export default store;
