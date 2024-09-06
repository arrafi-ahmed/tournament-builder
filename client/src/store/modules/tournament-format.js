import $axios from "@/plugins/axios";

export const namespaced = true;

export const state = {
  tournamentFormat: [],
  participants: [],
  groups: {},
  teams: {},
  matches: {},
  teamOptions: {},
  selectedTeamOptions: {},
  entityCount: {},
};

export const mutations = {
  setAll(state, payload) {
    state.tournamentFormat = payload?.tournamentFormat;
    state.participants = payload?.participants;
    state.groups = payload?.groups;
    state.teams = payload?.teams;
    state.matches = payload?.matches;
    state.teamOptions = payload?.teamOptions;
    state.selectedTeamOptions = payload?.selectedTeamOptions;
    state.entityCount = payload?.entityCount;
  },
};

export const actions = {
  setTournamentFormat({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament-format/getTournamentFormat", {
          params: { tournamentId: request.tournamentId },
        })
        .then((response) => {
          commit("setAll", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  addPhase({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-format/addPhase", request)
        .then((response) => {
          commit("addPhase", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
};
