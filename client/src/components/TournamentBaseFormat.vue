<script setup>
import { reactive, ref, watch } from "vue";

const shortcode = defineModel();
const { title } = defineProps(["title"]);

const activeTab = ref("group");
const tab = ref(activeTab.value);
const tabs = ref([
  { text: "Group only", value: "group" },
  { text: "Group + Knockout", value: "group_knockout" },
  {
    text: "Knockout only",
    value: "knockout",
  },
  {
    text: "Custom",
    value: "custom",
  },
]);
const shortcodeInit = reactive({
  groupCount: null,
  groupMemberCount: null,
  knockoutMemberCount: null,
});

watch(
  () => shortcode.value,
  (newVal) => {
    //set activeTab
    const flattenArr = newVal.flat();
    activeTab.value =
      flattenArr[0]?.type === "group" && flattenArr[1]?.type === "knockout"
        ? "group_knockout"
        : flattenArr.some((item) => item.type === "group")
        ? "group"
        : flattenArr.some((item) => item.type === "knockout")
        ? "knockout"
        : flattenArr[0]?.type === "custom"
        ? "custom"
        : "group"; //default

    //set shortcodeInit
    if (newVal.length === 0) {
      return;
    }
    newVal.flat().forEach((item) => {
      Object.assign(shortcodeInit, { ...item.payload });
    });
  },
  { deep: true }
);
watch(
  () => activeTab.value,
  (newVal) => {
    tab.value = newVal;
  }
);

const handleChangeTab = (tab) => {
  shortcode.value = prepareShortcodeForDB(tab, shortcodeInit);
};
const handleInputShortcode = (input, variable) => {
  variable === "groupCount"
    ? (shortcodeInit.groupCount = input)
    : variable === "groupMemberCount"
    ? (shortcodeInit.groupMemberCount = input)
    : variable === "knockoutMemberCount"
    ? (shortcodeInit.knockoutMemberCount = input)
    : null;

  shortcode.value = prepareShortcodeForDB(tab.value, shortcodeInit);
};

const prepareShortcodeForDB = (tab, resource) => {
  if (tab === "group") {
    return [
      [
        {
          type: "group",
          payload: {
            groupCount: resource.groupCount,
            groupMemberCount: resource.groupMemberCount,
          },
        },
      ],
    ];
  } else if (tab === "group_knockout") {
    return [
      [
        {
          type: "group",
          payload: {
            groupCount: resource.groupCount,
            groupMemberCount: resource.groupMemberCount,
          },
        },
      ],
      [
        {
          type: "knockout",
          payload: {
            knockoutMemberCount: resource.knockoutMemberCount,
          },
        },
      ],
    ];
  } else if (tab === "knockout") {
    return [
      [
        {
          type: "knockout",
          payload: {
            knockoutMemberCount: resource.knockoutMemberCount,
          },
        },
      ],
    ];
  } else {
    return [
      [
        {
          type: "custom",
          payload: {},
        },
      ],
    ];
  }
};
</script>

<template>
  <!--  {{ shortcode }}-->
  <v-card :title="title || `Tournament Format`" class="mt-2 mt-md-6">
    <template #text>
      <!--      {{ shortcode }}-->
      <v-tabs
        v-model="tab"
        :items="tabs"
        align-tabs="start"
        color="primary"
        height="60"
        slider-color="tertiary"
        @update:model-value="handleChangeTab"
      >
        <template v-slot:tab="{ item }">
          <v-tab
            :text="item.text"
            :value="item.value"
            class="text-none"
          ></v-tab>
        </template>

        <template v-slot:item="{ item }">
          <!--          i-{{ item.value }} s-{{ shortcode }}-->
          <template v-if="item.value == 'group'">
            <v-tabs-window-item :value="item.value" class="pa-4">
              <v-text-field
                v-model="shortcodeInit.groupCount"
                :rules="[(v) => tab !== 'group' || !!v || 'required!']"
                class="mt-2 mt-md-4"
                clearable
                hide-details="auto"
                label="How many groups do you want to create?"
                type="number"
                @update:model-value="handleInputShortcode($event, 'groupCount')"
              ></v-text-field>
              <v-text-field
                v-model="shortcodeInit.groupMemberCount"
                :rules="[(v) => tab !== 'group' || !!v || 'required!']"
                class="mt-2 mt-md-4"
                clearable
                hide-details="auto"
                label="How many teams are there in each group?"
                type="number"
                @update:model-value="
                  handleInputShortcode($event, 'groupMemberCount')
                "
              ></v-text-field>
            </v-tabs-window-item>
          </template>
          <template v-else-if="item.value == 'group_knockout'">
            <!--            i-{{item}}-->
            <!--            s-{{shortcode}}-->
            <v-tabs-window-item :value="item.value" class="pa-4">
              <v-text-field
                v-model="shortcodeInit.groupCount"
                :rules="[(v) => tab !== 'group_knockout' || !!v || 'required!']"
                class="mt-2 mt-md-4"
                clearable
                hide-details="auto"
                label="How many groups do you want to create?"
                type="number"
                @update:model-value="handleInputShortcode($event, 'groupCount')"
              ></v-text-field>
              <v-text-field
                v-model="shortcodeInit.groupMemberCount"
                :rules="[(v) => tab !== 'group_knockout' || !!v || 'required!']"
                class="mt-2 mt-md-4"
                clearable
                hide-details="auto"
                label="How many teams are there in each group?"
                type="number"
                @update:model-value="
                  handleInputShortcode($event, 'groupMemberCount')
                "
              ></v-text-field>
              <v-text-field
                v-model="shortcodeInit.knockoutMemberCount"
                :rules="[(v) => tab !== 'group_knockout' || !!v || 'required!']"
                class="mt-2 mt-md-4"
                clearable
                hide-details="auto"
                label="How many teams proceed to the knockout phase?"
                type="number"
                @update:model-value="
                  handleInputShortcode($event, 'knockoutMemberCount')
                "
              ></v-text-field>
            </v-tabs-window-item>
          </template>
          <template v-else-if="item.value == 'knockout'">
            <v-tabs-window-item :value="item.value" class="pa-4">
              <v-text-field
                v-model="shortcodeInit.knockoutMemberCount"
                :rules="[(v) => tab !== 'knockout' || !!v || 'required!']"
                class="mt-2 mt-md-4"
                clearable
                hide-details="auto"
                label="How many teams proceed to the knockout phase?"
                type="number"
                @update:model-value="
                  handleInputShortcode($event, 'knockoutMemberCount')
                "
              ></v-text-field>
            </v-tabs-window-item>
          </template>
          <template v-else>
            <v-tabs-window-item :value="item.value" class="pa-4">
              <div class="text-center">
                Proceed to Tournament format for customization.
              </div>
            </v-tabs-window-item>
          </template>
        </template>
      </v-tabs>
    </template>
  </v-card>
</template>

<style scoped></style>
