import $axios from "@/plugins/axios";

export const namespaced = true;

export const state = {
  results: [],
};

export const mutations = {
  setResults(state, payload) {
    state.results = payload;
  },
  saveResult(state, payload) {
    const foundMatchDayIndex = state.results.findIndex(
      (item) => item.id === payload.selectedMatchDate.id,
    );
    if (foundMatchDayIndex !== -1) {
      state.results[foundMatchDayIndex].matches[
        payload.selectedMatchIndex
      ].resultId = payload.savedMatchResult.id;
    }
    const updatedMatchesMap = new Map(
      payload.updatedMatches.map((updatedMatch) => [
        updatedMatch.id,
        updatedMatch,
      ]),
    );
    const selectedMatch =
      state.results[foundMatchDayIndex].matches[payload.selectedMatchIndex];

    state.results.forEach((matchDay) => {
      matchDay.matches.forEach((match) => {
        const updatedMatch = updatedMatchesMap.get(match.id);
        if (updatedMatch) {
          match.homeTeamId = updatedMatch.homeTeamId;
          match.awayTeamId = updatedMatch.awayTeamId;
          match.futureTeamReference = updatedMatch.futureTeamReference;

          if (updatedMatch.homeTeamId === selectedMatch.homeTeamId)
            match.homeTeamName = selectedMatch.homeTeamName;
          if (updatedMatch.homeTeamId === selectedMatch.awayTeamId)
            match.homeTeamName = selectedMatch.awayTeamName;
          if (updatedMatch.awayTeamId === selectedMatch.awayTeamId)
            match.awayTeamName = selectedMatch.awayTeamName;
          if (updatedMatch.awayTeamId === selectedMatch.homeTeamId)
            match.awayTeamName = selectedMatch.homeTeamName;
        }
      });
    });
  },
  clearResult(state, payload) {
    const foundMatchDayIndex = state.results.findIndex(
      (item) => item.id === payload.selectedMatchDate.id,
    );
    if (foundMatchDayIndex !== -1) {
      const foundResultIndex = state.results[
        foundMatchDayIndex
      ].matches?.findIndex(
        (item) => item.resultId && item.resultId === payload.resultId,
      );
      if (foundResultIndex !== -1) {
        state.results[foundMatchDayIndex].matches[foundResultIndex] = {
          ...state.results[foundMatchDayIndex].matches[foundResultIndex],
          resultId: null,
          homeTeamScore: null,
          awayTeamScore: null,
          homeTeamId: null,
          awayTeamId: null,
          winnerId: null,
        };
      }
    }
  },
};

export const actions = {
  setResults({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament-result/getResults", {
          params: { tournamentId: request.tournamentId },
        })
        .then((response) => {
          commit("setResults", response.data?.payload);
          resolve(response.data.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  saveSingleMatchResult({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-result/saveSingleMatchResult", request)
        .then((response) => {
          commit("saveResult", {
            savedMatchResult: response.data?.payload?.savedMatchResult,
            selectedMatchDate: request.selectedMatchDate,
            selectedMatchIndex: request.selectedMatchIndex,
            updatedMatches: response.data?.payload?.updatedMatches,
          });
          resolve(response.data.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  saveGroupMatchResult({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/tournament-result/saveGroupMatchResult", request)
        .then((response) => {
          commit("saveResult", {
            savedMatchResult: response.data?.payload?.savedMatchResult,
            selectedMatchDate: request.selectedMatchDate,
            selectedMatchIndex: request.selectedMatchIndex,
            updatedMatches: response.data?.payload?.updatedMatches,
          });
          resolve(response.data.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  clearResult({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/tournament-result/clearResult", {
          params: { resultId: request.resultId },
        })
        .then((response) => {
          commit("clearResult", request);
          resolve(response.data.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  updateFutureTeamReferenceForSingleMatch({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post(
          "/api/tournament-result/updateFutureTeamReferenceForSingleMatch",
          request,
        )
        .then((response) => {
          // commit("setResults", response.data?.payload);
          resolve(response.data.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
};

export const getters = {};