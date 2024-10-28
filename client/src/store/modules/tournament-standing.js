import $axios from "@/plugins/axios";

export const namespaced = true;

export const state = {
  standing: [],
  schedule: [],
};

export const mutations = {
  setStanding(state, payload) {
    state.standing = payload.standing || [];
    state.schedule = payload.schedule || [];
  },
};

export const actions = {
  setTournamentStanding({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament-standing/getTournamentStanding", {
          params: { tournamentId: request.tournamentId },
        })
        .then((response) => {
          commit("setStanding", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
};

export const getters = {};
