import $axios from "@/plugins/axios";

export const namespaced = true;

export const state = {
  teams: [],
  team: {},
  members: [],
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
  removeTeam(state, payload) {
    const foundIndex = state.teams.findIndex(
      (item) => item.id == payload.teamId
    );
    if (foundIndex !== -1) {
      state.teams.splice(foundIndex, 1);
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
  setTeamsWEmail({ commit }) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/team/getAllTeamsWEmail")
        .then((response) => {
          commit("setTeams", response.data?.payload);
          console.log(5, response.data?.payload);
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
          console.log(5, response.data?.payload);
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
        .get("/api/team/getTeamWSquad", { params: { teamId: request.teamId } })
        .then((response) => {
          commit("setMembers", response.data?.payload);
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
          params: { id: request.id, teamId: request.teamId },
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
  getTeamById: (state) => (id) => {
    return state.teams.find((item) => item.id == id);
  },
};
