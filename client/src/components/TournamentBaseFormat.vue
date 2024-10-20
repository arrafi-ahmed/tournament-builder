<script setup>
import { reactive, ref } from "vue";

const model = defineModel();
const { title } = defineProps(["title"]);

const tab = ref("group");
const tabs = ref([
  { text: "Group only", value: "group" },
  { text: "Group + Knockout", value: "group_knockout" },
  {
    text: "Knockout only",
    value: "knockout",
  },
]);
const bracketTeamOptions = [64, 32, 16, 8, 4, 2];

const shortcodeInit = reactive({
  groupCount: null,
  groupMemberCount: null,
  knockoutMemberCount: null,
});
const form = ref(null);
const isFormValid = ref(true);

const submitBaseFormat = async () => {
  await form.value.validate();
  if (!isFormValid.value) return;

  if (tab.value === "group") shortcodeInit.knockoutMemberCount = null;
  if (tab.value === "knockout")
    shortcodeInit.groupCount = shortcodeInit.groupMemberCount = null;

  model.value = shortcodeInit;
  Object.assign(model.value, { ...shortcodeInit });
};
</script>

<template>
  <v-form
    ref="form"
    v-model="isFormValid"
    fast-fail
    @submit.prevent="submitBaseFormat"
  >
    <v-card
      :title="title || `Base Structure`"
      class="mt-2 mx-auto"
      max-width="550"
    >
      <template #text>
        <v-tabs
          v-model="tab"
          :items="tabs"
          align-tabs="start"
          color="primary"
          height="60"
          slider-color="tertiary"
        >
          <template v-slot:tab="{ item }">
            <v-tab
              :text="item.text"
              :value="item.value"
              class="text-none"
            ></v-tab>
          </template>

          <template v-slot:item="{ item }">
            <template v-if="item.value === 'group'">
              <v-tabs-window-item :value="item.value" class="pa-4">
                <v-text-field
                  v-model="shortcodeInit.groupCount"
                  :rules="[(v) => tab !== 'group' || !!v || 'required!']"
                  class="mt-2 mt-md-4"
                  clearable
                  hide-details="auto"
                  label="How many groups do you want to create?"
                  type="number"
                ></v-text-field>
                <v-text-field
                  v-model="shortcodeInit.groupMemberCount"
                  :rules="[(v) => tab !== 'group' || !!v || 'required!']"
                  class="mt-2 mt-md-4"
                  clearable
                  hide-details="auto"
                  label="How many teams are there in each group?"
                  type="number"
                ></v-text-field>
              </v-tabs-window-item>
            </template>
            <template v-else-if="item.value === 'group_knockout'">
              <v-tabs-window-item :value="item.value" class="pa-4">
                <v-text-field
                  v-model="shortcodeInit.groupCount"
                  :rules="[
                    (v) => tab !== 'group_knockout' || !!v || 'required!',
                  ]"
                  class="mt-2 mt-md-4"
                  clearable
                  hide-details="auto"
                  label="How many groups do you want to create?"
                  type="number"
                ></v-text-field>
                <v-text-field
                  v-model="shortcodeInit.groupMemberCount"
                  :rules="[
                    (v) => tab !== 'group_knockout' || !!v || 'required!',
                  ]"
                  class="mt-2 mt-md-4"
                  clearable
                  hide-details="auto"
                  label="How many teams are there in each group?"
                  type="number"
                ></v-text-field>
                <v-select
                  v-model="shortcodeInit.knockoutMemberCount"
                  :items="bracketTeamOptions"
                  :rules="[
                    (v) => tab !== 'group_knockout' || !!v || 'required!',
                  ]"
                  class="mt-2"
                  clearable
                  hide-details="auto"
                  label="How many teams proceed to the knockout phase?"
                ></v-select>
              </v-tabs-window-item>
            </template>
            <template v-else-if="item.value === 'knockout'">
              <v-tabs-window-item :value="item.value" class="pa-4">
                <v-select
                  v-model="shortcodeInit.knockoutMemberCount"
                  :items="bracketTeamOptions"
                  :rules="[
                    (v) => tab !== 'group_knockout' || !!v || 'required!',
                  ]"
                  class="mt-2"
                  clearable
                  hide-details="auto"
                  label="How many teams proceed to the knockout phase?"
                ></v-select>
              </v-tabs-window-item>
            </template>
          </template>
        </v-tabs>
      </template>
      <v-card-actions>
        <v-row justify="center">
          <v-col cols="auto">
            <v-btn color="primary" type="submit" variant="tonal">Proceed</v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </v-card>
  </v-form>
</template>

<style scoped></style>
