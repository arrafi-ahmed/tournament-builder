import $axios from "@/plugins/axios";

export const namespaced = true;

export const state = {
  tournaments: [],
  tournament: {},
  joinRequests: [],
  participants: [],
};

export const mutations = {
  setTournaments(state, payload) {
    state.tournaments = payload;
  },
  setTournament(state, payload) {
    state.tournament = payload;
  },
  setSearchedTournaments(state, payload) {
    state.tournaments = payload;
    state.joinRequests.forEach((requestItem) => {
      const foundIndex = state.tournaments.findIndex(
        (tournament) => requestItem.tournamentId == tournament.tournamentId,
      );
      if (foundIndex > -1) {
        state.tournaments[foundIndex] = {
          ...state.tournaments[foundIndex],
          ...requestItem,
        };
      }
    });
  },
  setParticipants(state, payload) {
    state.participants = payload.filter((item) => item?.id);
  },
  resetParticipants(state, payload) {
    state.participants = [];
  },
  setJoinRequests(state, payload) {
    state.joinRequests = payload.map((item) => ({
      ...item,
      sentRequest: true,
    }));
  },
  addJoinRequests(state, payload) {
    const foundIndex = state.tournaments.findIndex(
      (item) => item.tournamentId == payload.tournamentId,
    );
    if (foundIndex > -1) {
      const newJoinRequest = {
        ...state.tournaments[foundIndex],
        ...payload,
        sentRequest: true,
        requestStatus: 2,
      };
      state.joinRequests.unshift(newJoinRequest);
      state.tournaments[foundIndex] = newJoinRequest;
    }
  },
  removeJoinRequests(state, payload) {
    const foundIndexRequest = state.joinRequests.findIndex(
      (item) => item.id == payload.id,
    );
    const foundIndexTournaments = state.tournaments.findIndex(
      (item) => item.id == payload.id,
    );
    state.joinRequests.splice(foundIndexRequest, 1);
    state.tournaments.splice(foundIndexTournaments, 1);
  },
  addTournament(state, payload) {
    state.tournaments.unshift(payload);
  },
  editTournament(state, payload) {
    const foundIndex = state.tournaments.findIndex(
      (item) => item.id == payload.id,
    );
    if (foundIndex !== -1) {
      state.tournaments[foundIndex] = payload;
    } else {
      state.tournaments.unshift(payload);
    }
  },
  removeTournament(state, payload) {
    const foundIndex = state.tournaments.findIndex(
      (item) => item.id == payload.tournamentId,
    );
    if (foundIndex !== -1) {
      state.tournaments.splice(foundIndex, 1);
    }
  },
  addParticipant(state, payload) {
    state.participants.unshift(payload);
  },
  removeParticipant(state, payload) {
    const foundIndex = state.participants.findIndex(
      (item) => item.ttId == payload.id,
    );
    if (foundIndex !== -1) {
      state.participants.splice(foundIndex, 1);
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
        .get("/api/tournament/getTournament", {
          params: { tournamentId: request.tournamentId },
        })
        .then((response) => {
          commit("setTournament", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  setTournamentsByOrganizerId({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament/getTournamentsByOrganizerId", {
          params: { organizerId: request?.organizerId },
        })
        .then((response) => {
          commit("setTournaments", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  setTournamentWEmailOptionalById({ commit, getters, rootGetters }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament/getTournamentWEmailOptionalById", {
          params: { tournamentId: request.tournamentId },
        })
        .then((response) => {
          commit("setTournament", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  setJoinRequestsByTeamId({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament/getJoinRequests", {
          params: { teamId: request?.teamId },
        })
        .then((response) => {
          // commit("setTournaments", response.data?.payload);
          commit("setJoinRequests", response.data?.payload);
          resolve(response.data?.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  searchTournament({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament/searchTournament", {
          params: { searchKeyword: request.searchKeyword },
        })
        .then((response) => {
          commit("setSearchedTournaments", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  joinTournament({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament/saveTeamRequest", {
          params: {
            tournamentId: request.tournamentId,
            teamId: request.teamId,
          },
        })
        .then((response) => {
          commit("addJoinRequests", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  cancelJoinTournament({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament/removeTeamRequest", {
          params: {
            requestId: request?.requestId,
            tournamentId: request?.tournamentId,
            teamId: request?.teamId,
          },
        })
        .then((response) => {
          commit("removeJoinRequests", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  save({ commit }, request) {
    return new Promise((resolve, reject) => {
      console.log(21, request)
      $axios
        .post("/api/tournament/save", request)
        .then((response) => {
          const actionName = request.id ? "edit" : "add";
          commit(`${actionName}Tournament`, response.data?.payload);
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
  setParticipants({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament/getParticipantsWTournament", {
          params: {
            tournamentId: request.tournamentId,
            organizerId: request?.organizerId,
          },
        })
        .then((response) => {
          commit("setParticipants", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  setParticipantsWTournament({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament/getParticipantsWTournament", {
          params: {
            tournamentId: request.tournamentId,
            organizerId: request?.organizerId,
          },
        })
        .then((response) => {
          commit("setParticipants", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  addParticipant({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament/addParticipant", {
          params: {
            teamId: request?.teamId,
            tournamentId: request?.tournamentId,
            tournamentName: request?.tournamentName,
            managerEmail: request?.managerEmail,
          },
        })
        .then((response) => {
          const newParticipant = {
            ttId: response.data?.payload?.id,
            tuId: request.tournamentId,
            tmId: request.teamId,
            name: request.name,
            logo: request.logo,
          };
          commit("addParticipant", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  removeParticipant({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament/removeParticipant", {
          params: {
            id: request?.id,
            teamId: request?.teamId,
            tournamentId: request?.tournamentId,
          },
        })
        .then((response) => {
          commit("removeParticipant", { id: request?.id });
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
