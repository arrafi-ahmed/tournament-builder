import $axios from "@/plugins/axios";

export const namespaced = true;

export const state = {
  tournamentFormat: [],
  participants: [],
  teamOptions: {},
  selectedTeamOptions: {},
  entityLastCount: {},
};

export const mutations = {
  setAll(state, payload) {
    // Object.assign(state, { ...payload });
    state.tournamentFormat = payload.tournamentFormat || [];
    state.participants = payload.participants || [];
    state.teamOptions = payload.teamOptions || {};
    state.selectedTeamOptions = payload.selectedTeamOptions || {};
    state.entityLastCount = payload.entityLastCount || {};
  },
  setTournamentFormat(state, payload) {
    state.tournamentFormat = payload;
  },
  addPhase(state, payload) {
    const newPhase = { ...payload, items: [] };
    state.tournamentFormat.push(newPhase);
    state.entityLastCount.phase++;
  },
  removePhase(state, payload) {
    const foundPhaseIndex = state.tournamentFormat.findIndex(
      (phase) => phase.id === payload.id,
    );
    state.tournamentFormat.splice(foundPhaseIndex, 1);

    Object.values(state.selectedTeamOptions).forEach((item) => {
      if (item.phase === payload.id) {
        delete state.selectedTeamOptions[item.id];
      }
    });
    Object.values(state.teamOptions).forEach((item) => {
      if (item.phase === payload.id) {
        delete state.teamOptions[item.id];
      }
    });
  },
  addGroup(state, payload) {
    const foundPhaseIndex = state.tournamentFormat.findIndex(
      (phase) => phase.id === payload.tournamentPhaseId,
    );
    const newGroup = {
      id: payload.id,
      name: payload.name,
      type: "group",
      order: payload.order,
      tournamentPhaseId: payload.tournamentPhaseId,
      doubleRoundRobin: payload.doubleRoundRobin,
      teamsPerGroup: payload.teamsPerGroup,
      // teams: new Array(payload.teamsPerGroup).fill(null),
      teams: payload.teams,
      matches: payload.matches,
    };
    state.tournamentFormat[foundPhaseIndex].items.push(newGroup);
    state.entityLastCount.group++;
    state.entityLastCount.match += payload.matches.length; // prepare next match title in advance

    for (let position = 1; position <= newGroup.teamsPerGroup; position++) {
      const key = `g-${newGroup.id}-${position}`;
      state.teamOptions[key] = {
        name: `${newGroup.name}, Ranking ${position}`,
        used: false,
        phase: newGroup.tournamentPhaseId,
        id: key,
        itemId: newGroup.id, //group.id
        position,
        type: "group",
      };
      state.selectedTeamOptions[key] = state.teamOptions["empty"];
    }
  },
  removeGroup(state, payload) {
    const foundPhaseIndex = state.tournamentFormat.findIndex(
      (phase) => phase.id === payload.tournamentPhaseId,
    );
    const foundGroupIndex = state.tournamentFormat[
      foundPhaseIndex
    ].items.findIndex((item) => item.id === payload.id);
    state.tournamentFormat[foundPhaseIndex].items.splice(foundGroupIndex, 1);

    for (let position = 1; position <= payload.teamsPerGroup; position++) {
      const key = `g-${payload.id}-${position}`;
      delete state.teamOptions[key];
      delete state.selectedTeamOptions[key];
    }
  },
  addBracket(state, payload) {
    const foundPhaseIndex = state.tournamentFormat.findIndex(
      (phase) => phase.id === payload.tournamentPhaseId,
    );
    state.tournamentFormat[foundPhaseIndex].items.push(payload);
    state.entityLastCount.bracket++;

    // const finalMatch = payload.rounds[payload.rounds.length - 1].matches[0];
    payload.rounds.forEach((round, roundIndex) => {
      let targetMatchIndex = 0; //for selectedTeamOptions
      round.matches.forEach((match, matchIndex) => {
        state.entityLastCount.match++;
        const positions = [1, 2];
        //populate teamOptions
        positions.forEach((position) => {
          const textPrepend = position === 1 ? "Winner" : "Loser";
          const key = `m-${match.id}-${position}`;
          state.teamOptions[key] = {
            name: `${textPrepend}, ${match.name}`,
            used: false,
            phase: payload.id,
            id: key,
            itemId: match.id,
            position,
            type: "bracket",
          };
          // populate selectedTeamOptions
          // apply logic for highest round
          if (roundIndex === 0) {
            state.selectedTeamOptions[key] = state.teamOptions["empty"];
          } else {
            const targetKey = `m-${payload.rounds[roundIndex - 1].matches[targetMatchIndex++].id}-1`;
            state.selectedTeamOptions[key] = state.teamOptions[targetKey];
          }
        });
      });
    });
  },
  removeBracket(state, payload) {
    const foundPhaseIndex = state.tournamentFormat.findIndex(
      (phase) => phase.id === payload.tournamentPhaseId,
    );
    const foundBracketIndex = state.tournamentFormat[
      foundPhaseIndex
    ].items.findIndex((item) => item.id === payload.id);

    const foundBracket =
      state.tournamentFormat[foundPhaseIndex].items[foundBracketIndex];

    // remove matches
    foundBracket.rounds.forEach((round, roundIndex) => {
      round.matches.forEach((match, matchIndex) => {
        const positions = [1, 2];
        //populate teamOptions
        positions.forEach((position) => {
          const key = `m-${match.id}-${position}`;
          delete state.teamOptions[key];
          delete state.selectedTeamOptions[key];
        });
      });
    });
    // remove bracket
    state.tournamentFormat[foundPhaseIndex].items.splice(foundBracketIndex, 1);
  },
  addMatch(state, payload) {
    const newMatch = {
      id: payload.id,
      name: payload.name,
      type: "single_match",
      order: payload.order,
      startTime: payload.startTime,
      phaseId: payload.phaseId,
      homeTeamId: payload.homeTeamId,
      awayTeamId: payload.awayTeamId,
      homeTeamScore: null,
      awayTeamScore: null,
      futureTeamReference: payload.futureTeamReference,
    };
    if (payload.type === "single_match") {
      const foundPhaseIndex = state.tournamentFormat.findIndex(
        (phase) => phase.id === payload.phaseId,
      );
      state.tournamentFormat[foundPhaseIndex].items.push(newMatch);
      state.entityLastCount.match++;
    }

    const positions = [1, 2];
    positions.forEach((position) => {
      const textPrepend = position === 1 ? "Winner" : "Loser";
      const key = `m-${newMatch.id}-${position}`;
      state.teamOptions[key] = {
        name: `${textPrepend}, ${newMatch.name}`,
        used: false,
        phase: payload.type === "single_match" ? payload.phaseId : null,
        id: key,
        itemId: newMatch.id,
        position,
        type: "match",
      };
      state.selectedTeamOptions[key] = state.teamOptions["empty"];
    });
  },
  removeMatch(state, payload) {
    const foundPhaseIndex = state.tournamentFormat.findIndex(
      (phase) => phase.id === payload.phaseId,
    );
    const foundMatchIndex = state.tournamentFormat[
      foundPhaseIndex
    ].items.findIndex((item) => item.id === payload.id);
    state.tournamentFormat[foundPhaseIndex].items.splice(foundMatchIndex, 1);

    delete state.teamOptions[`m-${payload.id}-1`];
    delete state.teamOptions[`m-${payload.id}-2`];
    delete state.selectedTeamOptions[`m-${payload.id}-1`];
    delete state.selectedTeamOptions[`m-${payload.id}-2`];
  },
  updateMatch(state, payload) {
    const savedMatch = payload;
    const foundPhaseIndex = state.tournamentFormat.findIndex(
      (phase) => phase.id == savedMatch.phaseId,
    );
    const foundItemIndex = state.tournamentFormat[
      foundPhaseIndex
    ].items.findIndex((item) => {
      console.log(30, item, savedMatch)
      if (item.type === "group") return item.id === savedMatch.groupId;
      if (item.type === "bracket") return item.id === savedMatch.bracketId;
      if (item.type === "single_match") return item.id === savedMatch.id;
      return false;
    });
    console.log(31, foundItemIndex, state.tournamentFormat[
      foundPhaseIndex
      ].items)
    // if item.type = 'single_match'
    const targetItem =
      state.tournamentFormat[foundPhaseIndex].items[foundItemIndex];
    if (targetItem.type === "single_match") {
      state.tournamentFormat[foundPhaseIndex].items[foundItemIndex] = {
        ...targetItem,
        ...savedMatch,
      };
      return
    }

    const foundRoundIndex = state.tournamentFormat[foundPhaseIndex].items[
      foundItemIndex
    ].rounds.findIndex((round) => round.type == savedMatch.roundType);

    let foundMatchIndex = state.tournamentFormat[foundPhaseIndex].items[
      foundItemIndex
    ].rounds[foundRoundIndex].matches.findIndex(
      (match) => match.id === savedMatch.id,
    );

    let targetMatch =
      state.tournamentFormat[foundPhaseIndex].items[foundItemIndex].rounds[
        foundRoundIndex
      ].matches[foundMatchIndex];

    console.log(21, foundMatchIndex, targetMatch, savedMatch);
    state.tournamentFormat[foundPhaseIndex].items[foundItemIndex].rounds[
      foundRoundIndex
    ].matches[foundMatchIndex] = { ...targetMatch, ...savedMatch };
  },
  setEntityLastCount(state, payload) {
    Object.assign(state.entityLastCount, { ...payload });
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
        .post("/api/tournament-format/savePhase", request)
        .then((response) => {
          commit("addPhase", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  addGroup({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-format/saveGroup", request)
        .then((response) => {
          commit("addGroup", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  addMatch({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-format/saveMatch", request)
        .then((response) => {
          commit("addMatch", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  addBracket({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-format/saveBracket", request)
        .then((response) => {
          commit("addBracket", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  createGroupKnockoutPhase({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-format/createGroupKnockoutPhase", request)
        .then((response) => {
          commit("setAll", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  createGroupPhase({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-format/createGroupPhase", request)
        .then((response) => {
          commit("setAll", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  createKnockoutPhase({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-format/createKnockoutPhase", request)
        .then((response) => {
          commit("setAll", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  removePhase({ commit, dispatch, getters }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament-format/removePhase", {
          params: {
            phaseId: request.phaseId,
            tournamentId: request.tournamentId,
            isPhaseEmpty: getters.isPhaseEmpty,
          },
        })
        .then((response) => {
          commit("removePhase", response.data?.payload?.deletedPhase);
          commit("setEntityLastCount", response.data?.payload?.entityLastCount);

          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  removeGroup({ commit, dispatch, getters }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament-format/removeGroup", {
          params: {
            groupId: request.groupId,
            tournamentId: request.tournamentId,
            isPhaseItemsEmpty: getters.isPhaseItemsEmpty,
          },
        })
        .then((response) => {
          commit("removeGroup", response.data?.payload?.deletedGroup);
          commit("setEntityLastCount", response.data?.payload?.entityLastCount);

          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  removeBracket({ commit, dispatch, getters }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament-format/removeBracket", {
          params: {
            bracketId: request.bracketId,
            tournamentId: request.tournamentId,
            isPhaseItemsEmpty: getters.isPhaseItemsEmpty,
          },
        })
        .then((response) => {
          commit("removeBracket", response.data?.payload?.deletedBracket);
          commit("setEntityLastCount", response.data?.payload?.entityLastCount);

          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  removeMatch({ commit, dispatch, getters }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament-format/removeMatch", {
          params: {
            matchId: request.matchId,
            tournamentId: request.tournamentId,
            isPhaseItemsEmpty: getters.isPhaseItemsEmpty,
          },
        })
        .then((response) => {
          commit("removeMatch", response.data?.payload?.deletedMatch);
          commit("setEntityLastCount", response.data?.payload?.entityLastCount);

          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  saveGroupTeam({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-format/saveGroupTeam", request)
        .then((response) => {
          // commit("setAll", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  updateMatch({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-format/saveMatch", request)
        .then((response) => {
          commit("updateMatch", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
};

export const getters = {
  isPhaseItemsEmpty(state) {
    return (
      state.tournamentFormat?.length === 1 &&
      state.tournamentFormat[0]?.items?.length === 1
    );
  },
  isPhaseEmpty(state) {
    return state.tournamentFormat?.length === 1;
  },
};
