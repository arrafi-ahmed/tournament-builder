import $axios from "@/plugins/axios";

export const namespaced = true;

export const state = {
  matchDays: [],
};

export const mutations = {
  setMatchDays(state, payload) {
    state.matchDays = payload;
  },
  addMatchDay(state, payload) {
    state.matchDays.unshift(payload);
  },
  editMatchDay(state, payload) {
    const foundIndex = state.matchDays.findIndex(
      (item) => item.id == payload.id,
    );
    if (foundIndex !== -1) {
      state.matchDays[foundIndex] = payload;
    } else {
      state.matchDays.unshift(payload);
    }
  },
  removeMatchDay(state, payload) {
    const foundIndex = state.matchDays.findIndex(
      (item) => item.id == payload.matchDayId,
    );
    if (foundIndex !== -1) {
      state.matchDays.splice(foundIndex, 1);
    }
  },
};

export const actions = {
  setMatchDays({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament-settings/getMatchDays", {
          params: { tournamentId: request.tournamentId },
        })
        .then((response) => {
          commit("setMatchDays", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  saveMatchDay({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-settings/saveMatchDay", request)
        .then((response) => {
          const actionName = request.id ? "edit" : "add";
          commit(`${actionName}MatchDay`, response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  deleteMatchDay({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament-settings/deleteMatchDay", {
          params: { matchDayId: request.matchDayId },
        })
        .then((response) => {
          commit("removeMatchDay", request);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
};

export const getters = {
  getMatchDaysById: (state) => (id) => {
    return state.matchDays.find((item) => item.id == id);
  },
};
