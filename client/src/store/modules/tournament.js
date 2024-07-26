import $axios from "@/plugins/axios";

export const namespaced = true;

export const state = {
  tournaments: [],
  tournament: {},
  members: [],
};

export const mutations = {
  setTournaments(state, payload) {
    state.tournaments = payload;
  },
  setTournament(state, payload) {
    state.tournament = payload;
  },
  setMembers(state, payload) {
    state.members = payload;
  },
  addTournament(state, payload) {
    state.tournaments.unshift(payload);
  },
  editTournament(state, payload) {
    const foundIndex = state.tournaments.findIndex((item) => item.id == payload.id);
    console.log(48, foundIndex)
    if (foundIndex !== -1) {
      state.tournaments[foundIndex] = payload;
    } else {
      state.tournaments.unshift(payload);
    }
  },
  addMember(state, payload) {
    state.members.unshift(payload);
  },
  editMember(state, payload) {
    const foundIndex = state.members.findIndex((item) => item.id == payload.id);
    if (foundIndex !== -1) {
      state.members[foundIndex] = payload;
    } else {
      state.members.unshift(payload);
    }
  },
  removeTournament(state, payload) {
    const foundIndex = state.tournaments.findIndex(
      (item) => item.id == payload.tournamentId
    );
    if (foundIndex !== -1) {
      state.tournaments.splice(foundIndex, 1);
    }
  },
  removeMember(state, payload) {
    const foundIndex = state.members.findIndex((item) => item.id == payload.id);
    if (foundIndex !== -1) {
      state.members.splice(foundIndex, 1);
    }
  },
};

export const actions = {
  setTournaments({ commit }) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament/getAllTournaments")
        .then((response) => {
          commit("setTournaments", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  setTournament({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament/getTournament", { params: { tournamentId: request.tournamentId } })
        .then((response) => {
          commit("setTournament", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  setTournamentWEmailOptionalById({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament/getTournamentWEmailOptionalById", { params: { tournamentId: request.tournamentId } })
        .then((response) => {
          commit("setTournament", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  save({ commit }, request) {
    console.log(47)
    return new Promise((resolve, reject) => {
      console.log(48, request)
      $axios
        .post("/api/tournament/save", request)
        .then((response) => {
          console.log(49)
          const actionName = request.id ? "edit" : "add";
          commit(`${actionName}Tournament`, response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  saveMember({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament/saveMember", request)
        .then((response) => {
          const actionName = request.id ? "edit" : "add";
          commit(`${actionName}Member`, response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  removeTournament({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament/removeTournament", {
          params: { tournamentId: request.tournamentId },
        })
        .then((response) => {
          commit("removeTournament", request);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  removeMember({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament/removeMember", {
          params: { id: request.id, tournamentId: request.tournamentId },
        })
        .then((response) => {
          commit("removeMember", request);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
};

export const getters = {
  getTournamentById: (state) => (id) => {
    return state.tournaments.find((item) => item.id == id);
  },
};
