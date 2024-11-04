<script setup>
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";
import { computed, onMounted, ref } from "vue";
import PageTitle from "@/components/PageTitle.vue";
import { getQueryParam } from "@/others/util";
import { useDisplay } from "vuetify";
import { toast } from "vue-sonner";

const router = useRouter();
const route = useRoute();
const store = useStore();
const { mobile } = useDisplay();

const subscription = computed(() => store.state.subscription.subscription);
const subscriptionPlans = computed(
  () => store.state.subscription.subscriptionPlans,
);
const isSubscriptionActive = computed(
  () => store.getters["subscription/isSubscriptionActive"](route.params.tournamentId),
);
const pendingCancel = computed(
  () => store.getters["subscription/pendingCancel"](route.params.tournamentId),
);
const isPlanSelected = (planId) => {
  return isSubscriptionActive.value && subscription.value.planId === planId;
};

const benefits = ref([
  {
    premium: "Unlimited Participants",
    basic: "Limited to 6 Participants",
  },
]);
const signedin = computed(() => store.getters["user/signedin"]);

const handleClickSubscription = (plan) => {
  if (!signedin.value) {
    router.push({ name: "register" });
  }
  store.commit("setProgress", true);
  const subscription = {
    planId: plan.id,
    planTitle: plan.title,
    tournamentId: route.params.tournamentId,
  };
  store
    .dispatch("subscription/saveSubscription", {
      subscription,
    })
    .then((result) => {
      window.location.href = result.url;
      if (plan.title.toLowerCase() === "basic") {
        processSuccessQueryParam(); // show action success notif for basic
      }
    })
    .finally(() => store.commit("setProgress", false));
};
const handleClickSubscriptionCancel = (subscription) => {
  store.dispatch("subscription/cancelSubscription", {
    subscription: { ...subscription, instantCancel: true },
  });
};
const routeInfo = computed(() => store.state.routeInfo);
const showContinue = ref(false);
const showBack = computed(
  () =>
    routeInfo.value?.from?.name !== undefined &&
    routeInfo.value?.from?.name !== "friends-invite",
);

const processSuccessQueryParam = () => {
  const isSubscriptionSucceeded = getQueryParam("subscription_success");
  if (isSubscriptionSucceeded === "1") {
    showContinue.value = true;
    toast.success("Subscription activated!");
  }
};
const currentUser = store.getters["user/getCurrentUser"];
onMounted(async () => {
  processSuccessQueryParam();
  Promise.all([
    store.dispatch("subscription/setSubscription", {
      userId: currentUser.id,
      tournamentId: route.params.tournamentId,
    }),
    store.dispatch("subscription/setSubscriptionPlans"),
  ]);
});
</script>
<template>
  <v-container>
    <page-title justify="space-between" show-back title="Pricing"></page-title>

    <!-- Pricing Content -->
    <v-row class="mt-5" justify="center">
      <v-col cols="12" md="7">
        <v-table v-if="subscriptionPlans.length > 0">
          <thead>
            <tr>
              <!--              <th class="text-left"><h2>Benefits</h2></th>-->
              <template v-for="(item, index) in subscriptionPlans" :key="index">
                <th class="text-center vertical-baseline">
                  <div>
                    <div
                      :class="
                        item.title.toLowerCase() === 'basic'
                          ? 'bg-secondary'
                          : 'bg-primary'
                      "
                      class="pa-2"
                    >
                      <h2>{{ item.title }}</h2>
                    </div>
                    <div class="my-3 mt-2">
                      <h3>
                        ${{ item.price }}
                        <!--                        {{-->
                        <!--                          (item.title.toLowerCase() == "premium" && "") ||-->
                        <!--                          (item.title.toLowerCase() == "basic" && "")-->
                        <!--                        }}-->
                      </h3>
                      <small>{{ item.tagline }}</small>
                    </div>
                  </div>
                </th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in benefits" :key="item.title">
              <td class="text-center">
                {{ item.premium }}
              </td>
              <td class="text-center">
                {{ item.basic }}
              </td>
            </tr>
            <tr>
              <template v-for="(item, index) in subscriptionPlans" :key="index">
                <td class="text-center">
                  <template v-if="isPlanSelected(item.id)">
                    <div class="bg-primary mx-1 my-2 pa-2 rounded">
                      <div class="text-button text-white">Active</div>
                      <v-btn
                        :disabled="pendingCancel"
                        class="bg-white"
                        color="primary"
                        rounded-sm
                        variant="outlined"
                        @click="
                          handleClickSubscriptionCancel({
                            subscriptionId: subscription.id,
                            stripeSubscriptionId:
                              subscription.stripeSubscriptionId,
                          })
                        "
                        >{{ (pendingCancel && "Cancelled") || "Cancel" }}
                      </v-btn>
                      <div v-if="pendingCancel && item.title !== 'basic'">
                        Expiring @
                        {{ subscription.expireDate.slice(0, 10) }}
                      </div>
                    </div>
                  </template>
                  <v-btn
                    v-else
                    color="primary"
                    rounded-sm
                    variant="outlined"
                    @click="handleClickSubscription(item)"
                    >Select
                  </v-btn>
                </td>
              </template>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
    <v-row justify="center">
      <v-col cols="auto">
        <v-btn
          v-if="showContinue"
          :density="mobile ? 'comfortable' : 'default'"
          :to="{
            name: 'tournament-participants',
            params: { tournamentId: currentUser.id },
          }"
          class="text-center"
          color="primary"
          >Continue
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<style></style>
