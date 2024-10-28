// Composables
import { createRouter, createWebHistory } from "vue-router";
import store from "@/store";

const routes = [
  {
    path: "/",
    component: import("@/layouts/default/Default.vue"),
    children: [
      {
        path: "signin",
        name: "signin",
        component: import("@/views/Signin.vue"),
        meta: {
          requiresNoAuth: true,
          title: "Signin",
        },
      },
      {
        path: "signout",
        name: "signout",
        component: import("@/views/Signout.vue"),
        meta: {
          requiresAuth: true,
        },
      },
      {
        path: "register/:role",
        name: "register",
        component: import("@/views/Register.vue"),
        meta: {
          requiresNoAuth: true,
          title: "Register",
        },
      },
      {
        path: "dashboard/sudo",
        name: "dashboard-sudo",
        component: () => import("@/views/DashboardSudo.vue"),
        meta: {
          requiresSudo: true,
          title: "Dashboard Sudo",
        },
      },
      {
        path: "dashboard/organizer",
        name: "dashboard-organizer",
        component: () => import("@/views/DashboardOrganizer.vue"),
        meta: {
          requiresOrganizer: true,
          title: "Dashboard Organizer",
        },
      },
      {
        path: "dashboard/manager",
        name: "dashboard-manager",
        component: () => import("@/views/DashboardManager.vue"),
        meta: {
          requiresManager: true,
          title: "Dashboard Manager",
        },
      },
      {
        path: "dashboard",
        name: "dashboard",
        redirect: () => store.getters["user/calcHome"],
        meta: {
          requiresAuth: true,
        },
      },
      {
        path: "team/add",
        name: "team-add",
        component: () => import("@/views/TeamAdd.vue"),
        meta: {
          requiresAuth: true,
          title: "Add Team",
        },
      },
      {
        path: "team/list",
        name: "team-list",
        component: () => import("@/views/TeamList.vue"),
        meta: {
          requiresAuth: true,
          title: "Team List",
        },
      },
      {
        path: "tournament/add",
        name: "tournament-add",
        component: () => import("@/views/TournamentAdd.vue"),
        meta: {
          requiresAuth: true,
          title: "Add Tournament",
        },
      },
      {
        path: "tournament/:tournamentId?/invite",
        name: "tournament-invite",
        component: () => import("@/views/TournamentInvite.vue"),
        meta: {
          requiresAuth: true,
          title: "Invite Team",
        },
      },
      {
        path: "tournament/:tournamentId/dashboard",
        name: "tournament-dashboard",
        component: () => import("@/views/TournamentDashboard.vue"),
        meta: {
          requiresAuth: true,
          title: "Tournament Dashboard",
        },
      },
      {
        path: "tournament/:tournamentId?/edit",
        name: "tournament-edit",
        component: () => import("@/views/TournamentEdit.vue"),
        meta: {
          requiresAuth: true,
          title: "Edit Tournament",
        },
      },
      {
        path: "tournament/list",
        name: "tournament-list",
        component: () => import("@/views/TournamentList.vue"),
        meta: {
          requiresAuth: true,
          title: "Tournament List",
        },
      },
      {
        path: "tournament/join",
        name: "tournament-join",
        component: () => import("@/views/TournamentJoin.vue"),
        meta: {
          requiresAuth: true,
          title: "Tournament Join",
        },
      },
      {
        path: "team/:teamId?/edit",
        name: "team-edit",
        component: () => import("@/views/TeamEdit.vue"),
        meta: {
          requiresAuth: true,
          title: "Edit Team",
        },
      },
      {
        path: "team/:teamId?/squad",
        name: "team-squad",
        component: () => import("@/views/TeamSquad.vue"),
        meta: {
          requiresAuth: true,
          title: "Team Squad",
        },
      },
      {
        path: "team/requests",
        name: "team-requests",
        component: () => import("@/views/TeamRequests.vue"),
        meta: {
          requiresAuth: true,
          title: "Team Squad",
        },
      },
      {
        path: "credential",
        name: "credential",
        component: () => import("@/views/Credential.vue"),
        meta: {
          requiresSudo: true,
          title: "Credentials",
        },
      },
    ],
  },
  {
    path: "/tournament/:tournamentId/dashboard/",
    name: "tournament-dashboard",
    component: import("@/layouts/tournament-dashboard/Dashboard.vue"),
    children: [
      {
        path: "participants",
        name: "tournament-participants",
        component: () => import("@/views/TournamentParticipants.vue"),
        meta: {
          requiresAuth: true,
          title: "Tournament Participants",
        },
      },
      {
        path: "format",
        name: "tournament-format",
        component: () => import("@/views/TournamentFormat.vue"),
        meta: {
          requiresAuth: true,
          title: "Tournament Format",
        },
      },
      {
        path: "schedule",
        name: "tournament-schedule",
        component: () => import("@/views/TournamentSchedule.vue"),
        meta: {
          requiresAuth: true,
          title: "Tournament Schedule",
        },
      },
      {
        path: "result",
        name: "tournament-result",
        component: () => import("@/views/TournamentResult.vue"),
        meta: {
          requiresAuth: true,
          title: "Tournament Result",
        },
      },
      {
        path: "settings",
        name: "tournament-settings",
        component: () => import("@/views/TournamentSettings.vue"),
        meta: {
          requiresAuth: true,
          title: "Tournament Settings",
        },
      },
      {
        path: "standing",
        name: "tournament-standing",
        component: () => import("@/views/TournamentStanding.vue"),
        meta: {
          requiresAuth: true,
          title: "Tournament Standing",
        },
      },
    ],
    beforeEnter(to, from, next) {
      if (to.matched.length > 1) return next(); //parent and child route matched
      next({
        name: "tournament-settings",
        params: { tournamentId: to.params.tournamentId },
      });
    },
  },
  {
    path: "/",
    component: import("@/layouts/headerless/Headerless.vue"),
    children: [
      {
        path: "public/tournament/:tournamentId",
        name: "public-view",
        component: import("@/views/PublicView.vue"),
      },
    ],
  },
  {
    path: "",
    redirect: { name: "signin" },
  },
  {
    path: "/not-found/:status?/:message?",
    name: "not-found",
    component: () => import("@/views/NotFound.vue"),
    props: (route) => ({
      status: route.params.status || 404,
      message: route.params.message || "Looks like you're lost!",
    }),
    meta: {},
  },
  {
    path: "/:catchAll(.*)",
    redirect: {
      name: "not-found",
      params: { status: 404, message: "Looks like you're lost!" },
    },
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
