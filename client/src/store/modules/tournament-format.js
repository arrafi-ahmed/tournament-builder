import $axios from "@/plugins/axios";

export const namespaced = true;

export const state = {
  tournamentFormat: [],
};

export const mutations = {
  setTournamentFormat(state, payload) {
    state.tournamentFormat = payload;
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
          commit("setTournamentFormat", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
};
