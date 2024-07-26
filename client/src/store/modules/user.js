import $axios from "@/plugins/axios";

export const namespaced = true;

export const state = {
  token: localStorage.getItem("token") || null,
  currentUser: JSON.parse(localStorage.getItem("currentUser")) || {},
  users: [],
  organizers: [],
  managers: [],
};

export const mutations = {
  setToken(state, payload) {
    localStorage.setItem("token", payload);
    state.token = payload;
  },
  setCurrentUser(state, payload) {
    state.currentUser = { ...state.currentUser, ...payload };
    let currentUser = JSON.parse(localStorage.getItem("currentUser"));
    currentUser = { ...currentUser, ...payload };
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
  },
  removeToken(state) {
    localStorage.removeItem("token");
    state.token = null;
  },
  removeCurrentUser(state) {
    localStorage.removeItem("currentUser");
    state.currentUser = {};
  },
  setUsers(state, payload) {
    state.users = payload;
  },
  addOrganizer(state, payload) {
    state.users.unshift(payload);
    state.organizers.unshift(payload);
  },
  addManager(state, payload) {
    state.users.unshift(payload);
    state.managers.unshift(payload);
  },
  editOrganizer(state, payload) {
    const foundIndex = state.organizers.findIndex(
      (item) => item.id == payload.id
    );
    if (foundIndex !== -1) {
      state.organizers[foundIndex] = payload;
    }
  },
  editManager(state, payload) {
    const foundIndex = state.managers.findIndex(
      (item) => item.id == payload.id
    );
    if (foundIndex !== -1) {
      state.managers[foundIndex] = payload;
    }
  },
  setOrganizers(state) {
    state.organizers = state.users.filter((item) => item.role === "organizer");
  },
  setManagers(state) {
    state.managers = state.users.filter((item) => item.role === "team_manager");
  },
  removeUser(state, payload) {
    const foundIndex = state.users.findIndex((item) => item.id == payload.id);
    if (foundIndex !== -1) {
      state.users.splice(foundIndex, 1);
    }
  },
};

export const actions = {
  signin({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/user/signin", request)
        .then((response) => {
          commit("setToken", response.headers?.authorization);
          commit("setCurrentUser", response.data?.payload?.currentUser);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  signout({ commit }) {
    return new Promise((resolve, reject) => {
      commit("removeToken");
      commit("removeCurrentUser");
      resolve();
    });
  },
  save({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .post("/api/user/save", request)
        .then((response) => {
          const actionType = request.id ? "edit" : "add";
          const actionName =
            request.role === "organizer"
              ? `${actionType}Organizer`
              : request.role === "team_manager"
              ? `${actionType}Manager`
              : null;
          commit(actionName, response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  setUsers({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/user/getUsers")
        .then((response) => {
          commit("setUsers", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  removeUser({ commit }, request) {
    return new Promise((resolve, reject) => {
      $axios
        .get("/api/user/removeUser", { params: { userId: request.id } })
        .then((response) => {
          commit("removeUser", response.data?.payload);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
};

export const getters = {
  getToken(state) {
    return state.token;
  },
  getCurrentUser(state) {
    return state.currentUser;
  },
  isSudo(state) {
    return state.currentUser.role === "sudo";
  },
  isOrganizer(state) {
    return state.currentUser.role === "organizer";
  },
  isTeamManager(state) {
    return state.currentUser.role === "team_manager";
  },
  signedin(state) {
    return !!state.token;
  },
  calcHome(state) {
    // add all the app roles here, and their default home page
    return state.currentUser.role === "sudo"
      ? { name: "dashboard-sudo" }
      : state.currentUser.role === "organizer"
      ? { name: "dashboard-organizer" }
      : state.currentUser.role === "team_manager"
      ? { name: "dashboard-team_manager" }
      : { name: "signout" };
  },
};
