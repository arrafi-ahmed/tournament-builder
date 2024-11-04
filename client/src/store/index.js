import { createStore } from "vuex";
import * as user from "./modules/user";
import * as team from "./modules/team";
import * as tournament from "./modules/tournament";
import * as tournamentFormat from "./modules/tournament-format";
import * as tournamentSettings from "./modules/tournament-settings";
import * as tournamentSchedule from "./modules/tournament-schedule";
import * as tournamentResult from "./modules/tournament-result";
import * as tournamentStanding from "./modules/tournament-standing";
import * as subscription from "./modules/subscription";

const store = createStore({
  modules: {
    subscription,
    user,
    team,
    tournament,
    tournamentFormat,
    tournamentSettings,
    tournamentSchedule,
    tournamentResult,
    tournamentStanding,
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
  getters: {},
});

export default store;
