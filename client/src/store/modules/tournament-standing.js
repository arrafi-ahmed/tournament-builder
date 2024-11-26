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
  setPublicView({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament-standing/getPublicView", {
          params: { tournamentSlug: request.tournamentSlug },
        })
        .then((response) => {
          commit(
            "tournament/setTournament",
            response.data?.payload?.tournament,
            { root: true },
          );
          commit(
            "tournament/setParticipants",
            response.data?.payload?.participants,
            { root: true },
          );
          commit("setStanding", response.data?.payload?.standing);
          resolve(response.data?.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
};

export const getters = {};
