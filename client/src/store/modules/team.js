import $axios from "@/plugins/axios";

export const namespaced = true;

export const state = {
  teams: [],
  team: {},
  members: [],
  teamRequests: [],
  matches: [], // used in team manager dashboard
};

export const mutations = {
  setTeams(state, payload) {
    state.teams = payload;
  },
  setTeam(state, payload) {
    state.team = payload;
  },
  setMembers(state, payload) {
    state.members = payload;
  },
  setTeamRequests(state, payload) {
    state.teamRequests = payload;
  },
  addTeam(state, payload) {
    state.teams.unshift(payload);
  },
  editTeam(state, payload) {
    const foundIndex = state.teams.findIndex((item) => item.id == payload.id);
    if (foundIndex !== -1) {
      state.teams[foundIndex] = payload;
    } else {
      state.teams.unshift(payload);
    }
  },
  removeTeam(state, payload) {
    const foundIndex = state.teams.findIndex(
      (item) => item.id == payload.teamId,
    );
    if (foundIndex !== -1) {
      state.teams.splice(foundIndex, 1);
    }
  },
  updateTeamRequest(state, payload) {
    const foundIndex = state.teamRequests.findIndex(
      (item) => item.id == payload.id,
    );
    if (foundIndex !== -1) {
      Object.assign(state.teamRequests[foundIndex], { ...payload });
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
  removeMember(state, payload) {
    const foundIndex = state.members.findIndex((item) => item.id == payload.id);
    if (foundIndex !== -1) {
      state.members.splice(foundIndex, 1);
    }
  },
  resetTeams(state) {
    state.teams = [];
  },
  setMatches(state, payload) {
    state.matches = payload;
  },
};

export const actions = {
  setTeamsWEmail({ commit }) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/team/getAllTeamsWEmail")
        .then((response) => {
          commit("setTeams", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  setTeamWEmail({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/team/getTeamWEmailOptionalById", {
          params: { teamId: request.teamId },
        })
        .then((response) => {
          commit("setTeam", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  setTeams({ commit }) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/team/getAllTeams")
        .then((response) => {
          commit("setTeams", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  setTeamWSquad({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/team/getTeamWSquad", { params: { teamId: request?.teamId } })
        .then((response) => {
          commit("setTeam", response.data?.payload?.team);
          commit("setMembers", response.data?.payload?.members);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  save({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/team/save", request)
        .then((response) => {
          const actionName = request.id ? "edit" : "add";
          commit(`${actionName}Team`, response.data?.payload);
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
        .post("/api/team/saveMember", request)
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
  removeTeam({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/team/removeTeam", {
          params: { teamId: request.teamId },
        })
        .then((response) => {
          commit("removeTeam", request);
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
        .get("/api/team/removeMember", {
          params: { id: request.id, teamId: request?.teamId },
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
  setTeamRequestsByOrganizerId({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/team/getTeamRequestsByOrganizerId", {
          params: { organizerId: request?.organizerId },
        })
        .then((response) => {
          // commit("setTournaments", response.data?.payload);
          commit("setTeamRequests", response.data?.payload);
          resolve(response.data?.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  setTeamRequestsByTournamentId({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/team/getTeamRequestsByTournamentId", {
          params: {
            organizerId: request?.organizerId,
            tournamentId: request?.tournamentId,
          },
        })
        .then((response) => {
          // commit("setTournaments", response.data?.payload);
          commit("setTeamRequests", response.data?.payload);
          resolve(response.data?.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  updateTeamRequest({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/team/updateTeamRequest", request)
        .then((response) => {
          // commit("setTournaments", response.data?.payload);
          commit("updateTeamRequest", response.data?.payload);
          resolve(response.data?.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  searchTeam({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/team/searchTeam", {
          params: { searchKeyword: request?.searchKeyword },
        })
        .then((response) => {
          commit("setTeams", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  setMatches({ commit }) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/team/getMatchesByTeam")
        .then((response) => {
          commit("setMatches", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
};

export const getters = {
  getTeamById: (state) => (id) => {
    return state.teams.find((item) => item.id == id);
  },
};
