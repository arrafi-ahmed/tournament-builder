export const namespaced = true;

export const state = {
  subscription: {},
  stripeSubscription: {},
  subscriptionPlans: [],
};

export const mutations = {
  setSubscription(state, payload) {
    Object.assign(state.subscription, payload);
  },
  setStripeSubscription(state, payload) {
    Object.assign(state.stripeSubscription, payload);
  },
  resetSubscription(state) {
    state.subscription = {};
  },
  resetStripeSubscription(state) {
    state.stripeSubscription = {};
  },
  setSubscriptionPendingCancel(state, payload) {
    state.subscription.pendingCancel = payload;
  },
  setSubscriptionPlans(state, payload) {
    Object.assign(state.subscriptionPlans, payload);
  },
};

export const actions = {
  setSubscription({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/subscription/getSubscription", {
          params: {
            userId: request.userId,
            tournamentId: request.tournamentId,
          },
        })
        .then((response) => {
          commit("setSubscription", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  setStripeSubscription({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/subscription/getStripeSubscription", {
          params: { subscriptionId: request },
        })
        .then((response) => {
          commit("setStripeSubscription", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  fetchPremiumSubscriptionData({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/subscription/fetchPremiumSubscriptionData", {
          params: {
            userId: request.userId,
            tournamentId: request.tournamentId,
          },
        })
        .then((response) => {
          // for basic plan, backend returns null. so,
          // do resetSubscription, resetStripeSubscription
          // set subscription, then check & reset stripeSubscription
          commit("resetSubscription");
          commit("resetStripeSubscription");
          commit("setSubscription", response.data?.payload?.subscription);
          console.log(17, response.data?.payload?.subscription);
          if (
            response.data?.payload?.subscription?.stripeSubscriptionId !== "0"
          ) {
            commit(
              "setStripeSubscription",
              response.data?.payload?.stripeSubscription,
            );
          }
          resolve(response.data?.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  setSubscriptionPlans({ commit }) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/subscription/getSubscriptionPlans")
        .then((response) => {
          commit("setSubscriptionPlans", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  payOnce({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/subscription/payOnce", {
          params: {
            subscription: request.subscription,
          },
        })
        .then((response) => {
          if (request.title === "basic") {
            commit(
              "setSubscription",
              response.data?.payload?.insertedSubscription,
            );
          }
          resolve(response.data?.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  saveSubscription({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/subscription/saveSubscription", {
          params: {
            subscription: request.subscription,
          },
        })
        .then((response) => {
          if (request.title === "basic") {
            commit(
              "setSubscription",
              response.data?.payload?.insertedSubscription,
            );
          }
          resolve(response.data?.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  saveSubscriptionManually({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/subscription/saveSubscriptionManually", {
          params: {
            planId: request.planId,
            planTitle: request.planTitle,
            userId: request.userId,
          },
        })
        .then((response) => {
          resolve(response.data?.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  cancelSubscription({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/subscription/cancelSubscription", {
          params: {
            subscription: request.subscription,
          },
        })
        .then((response) => {
          if (response.data?.payload?.stripeSubscriptionId === "0") {
            commit("resetSubscription");
          } else {
            const action =
              request.subscription?.instantCancel === true
                ? "resetSubscription"
                : "setSubscriptionPendingCancel";
            commit(action, true);
          }
          resolve(response.data?.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  cancelOncePayment({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/subscription/cancelOncePayment", {
          params: {
            subscription: request.subscription,
          },
        })
        .then((response) => {
          commit("resetSubscription");
          resolve(response.data?.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  deleteSubscription({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/subscription/deleteSubscription", {
          params: {
            userId: request.userId,
          },
        })
        .then((response) => {
          resolve(response.data?.payload);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  async canAddParticipant(
    { dispatch, rootGetters, rootState },
    { tournamentId, userId },
  ) {
    const isSudo = rootGetters["user/isSudo"];
    console.log(13, getters.isSubscriptionValid(tournamentId));
    console.log(14, rootState.subscription.subscription);
    console.log(15, rootState.tournament.participants);
    if (!isSudo && !rootState.subscription.subscription?.id) {
      await dispatch(
        "subscription/fetchPremiumSubscriptionData",
        {
          userId,
          tournamentId,
        },
        { root: true },
      );
      console.log(
        16,
        "calling fetchPremiumSubscriptionData",
        rootState.subscription.subscription,
      );
    }
    if (!isSudo && !rootState.tournament.participants?.length) {
      await dispatch(
        "tournament/setParticipantsWTournament",
        { tournamentId },
        { root: true },
      );
    }
    if (isSudo) {
      return true;
    } else {
      return (
        rootState.tournament.participants?.length < 6 ||
        rootGetters["subscription/isPremiumSubscriptionActive"](tournamentId)
      );
    }
  },
};

export const getters = {
  isSubscriptionValid: (state) => (tournamentId) => {
    console.log(45, tournamentId, state.subscription, state.stripeSubscription);
    return (
      Number(tournamentId) === state.subscription?.tournamentId &&
      state.subscription?.active === true &&
      (state.stripeSubscription?.status === "active" ||
        state.stripeSubscription?.status === "trialing")
    );
  },
  isSubscriptionActive: (state) => (tournamentId) => {
    return (
      Number(tournamentId) === state.subscription?.tournamentId &&
      state.subscription?.active === true
    );
  },
  isPremiumSubscriptionActive: (state) => (tournamentId) => {
    console.log(91, state.subscription)
    return (
      Number(tournamentId) === state.subscription?.tournamentId &&
      state.subscription?.active === true &&
      state.subscription?.stripeSubscriptionId !== "0"
    );
  },
  pendingCancel: (state) => (tournamentId) => {
    return (
      Number(tournamentId) === state.subscription?.tournamentId &&
      state.subscription?.pendingCancel === true
    );
  },
};
