import $axios from "@/plugins/axios";

export const namespaced = true;

export const state = {
  schedule: [],
  fields: [],
  matchDays: [],
  unplannedMatches: [],
  titles: {},
};

export const mutations = {
  setSchedule(state, payload) {
    state.schedule = payload;
  },
  setFields(state, payload) {
    state.fields = payload;
  },
  setMatchDays(state, payload) {
    state.matchDays = payload;
  },
  setUnplannedMatches(state, payload) {
    state.unplannedMatches = payload;
  },
  setTitles(state, payload) {
    state.titles = payload;
  },
  addField(state, payload) {
    state.schedule.push({
      ...payload,
      matchDays: state.matchDays.map((item) => ({ id: item.id, matches: [] })),
    });
    state.fields.push(payload);
  },
  editField(state, payload) {
    const { id, name, startTime } = payload;
    const foundFieldIndex = state.fields.findIndex((field) => field.id === id);
    if (foundFieldIndex !== -1) {
      Object.assign(state.fields[foundFieldIndex], { name, startTime });
    }
    const foundScheduleIndex = state.schedule.findIndex(
      (field) => field.id === id,
    );
    if (foundScheduleIndex !== -1) {
      Object.assign(state.schedule[foundScheduleIndex], { name, startTime });
    }
  },
  removeField(state, payload) {
    const foundFieldIndex = state.fields.findIndex(
      (field) => field.id === payload,
    );
    if (foundFieldIndex !== -1) {
      const a = state.fields.splice(foundFieldIndex, 1);
    }
    const foundScheduleIndex = state.schedule.findIndex(
      (field) => field.id === payload,
    );
    if (foundScheduleIndex !== -1) {
      const b = state.schedule.splice(foundScheduleIndex, 1);
    }
  },
  addUnplannedMatches(state, payload) {
    state.unplannedMatches = state.unplannedMatches.concat(payload);
  },
  addMatchToField(state, payload) {
    //add match to field->matchday
    const foundFieldIndex = state.schedule.findIndex(
      (item) => item.id === payload.fieldId,
    );
    if (foundFieldIndex === -1) return;

    const foundMatchDayIndex = state.schedule[
      foundFieldIndex
    ].matchDays.findIndex((item) => item.id === payload.matchDayId);
    if (foundMatchDayIndex === -1) return;

    state.schedule[foundFieldIndex].matchDays[foundMatchDayIndex].matches.push(
      payload,
    );
    //remove from unplanned matchlist
    const foundMatchIndex = state.unplannedMatches.findIndex(
      (item) => item.id === payload.id,
    );
    state.unplannedMatches.splice(foundMatchIndex, 1);
  },
  updateMatches(state, payload) {
    const { fieldIndex, matchDayIndex, matches } = payload;
    state.schedule[fieldIndex].matchDays[matchDayIndex].matches = matches;
  },
};

export const actions = {
  setSchedule({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament-schedule/getSchedule", {
          params: { tournamentId: request.tournamentId },
        })
        .then((response) => {
          commit("setSchedule", response.data?.payload?.schedule);
          commit("setFields", response.data?.payload?.fields);
          commit("setMatchDays", response.data?.payload?.matchDays);
          commit(
            "setUnplannedMatches",
            response.data?.payload?.unplannedMatches,
          );
          commit("setTitles", response.data?.payload?.titles);
          resolve(response.data.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  saveField({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-schedule/saveField", request)
        .then((response) => {
          const actionName = request.newField.id ? "edit" : "add";
          commit(`${actionName}Field`, response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  deleteField({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-schedule/deleteField", request)
        .then((response) => {
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
        .post("/api/tournament-format/updateMatch", {
          newMatch: request.newMatch,
          emailContent: request.emailContent,
        })
        .then((response) => {
          commit("addMatchToField", {
            ...response.data?.payload,
            hostName: request.hostName,
          });
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  updateMatches({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-format/updateMatches", {
          matches: request.matches.map(
            ({ hostName, homeTeamName, awayTeamName, ...rest }) => ({
              ...rest,
            }),
          ),
          emailContent: request.emailContent,
        })
        .then((response) => {
          commit("updateMatches", {
            fieldIndex: request.fieldIndex,
            matchDayIndex: request.matchDayIndex,
            matches: request.matches,
          });
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  deleteMatch({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-schedule/deleteMatch", request)
        .then((response) => {
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  broadcastUpdate({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-schedule/broadcastUpdate", request)
        .then((response) => {
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
