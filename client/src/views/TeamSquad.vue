<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import RemoveEntity from "@/components/RemoveEntity.vue";
import NoItems from "@/components/NoItems.vue";
import { getClientPublicImgUrl, getTeamLogoUrl } from "@/others/util";

const route = useRoute();
const store = useStore();

const members = computed(() => store.state.team.members);

const dialog = ref(false);
const form = ref(null);
const isFormValid = ref(false);

const newMemberInit = {
  id: null,
  name: null,
  status: null,
  category: null,
  teamId: null,
};

const newMember = reactive({ ...newMemberInit });
const statusItems = ref([
  { title: "Starting", value: "starting" },
  { title: "Substitute", value: "substitute" },
]);
const categoryItems = ref([
  { title: "Goalkeeper", value: "goalkeeper" },
  { title: "Defender", value: "defender" },
  { title: "Midfielder", value: "midfielder" },
  { title: "Forward", value: "forward" },
  { title: "Coaching Stuff", value: "coaching_stuff" },
]);

const openEditMemberDialog = (selectedMember) => {
  Object.assign(newMember, { ...newMemberInit, ...selectedMember });
  dialog.value = !dialog.value;
};

const openAddMemberDialog = () => {
  Object.assign(newMember, { ...newMemberInit });
  dialog.value = !dialog.value;
};

const handleSaveMember = async () => {
  await form.value.validate();
  if (!isFormValid.value) return;

  newMember.teamId = route.params.teamId;

  await store.dispatch("team/saveMember", newMember).then(() => {
    if (newMember.id) {
      dialog.value = !dialog.value;
    } else if (!newMember.id) {
      dialog.value = !dialog.value;
    }
    Object.assign(newMember, { ...newMemberInit });
  });
};
const removeMember = async (id) => {
  await store.dispatch("team/removeMember", {
    id,
    teamId: route.params.teamId,
  });
};

const fetchData = () => {
  store.dispatch("team/setTeamWSquad", { teamId: route.params.teamId });
};
onMounted(() => {
  fetchData();
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <page-title
          justify="space-between"
          sub-title="Team"
          title="Squad"
          show-back
        >
          <v-row align="center">
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon="mdi-dots-vertical" v-bind="props" variant="text">
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-item
                  density="compact"
                  prepend-icon="mdi-plus"
                  title="Add Member"
                  @click="openAddMemberDialog"
                ></v-list-item>
              </v-list>
            </v-menu>
          </v-row>
        </page-title>
      </v-col>
    </v-row>

    <v-row justify="center">
      <v-col col="12" md="6">
        <v-list
          v-if="members.length > 0"
          density="default"
          lines="three"
          rounded
          elevation="1"
        >
          <template v-for="(item, index) in members">
            <v-list-item v-if="item" :key="index" :title="item?.name" link>
              <!--                    @click="-->
              <!--                      router.push({-->
              <!--                        name: 'team-single',-->
              <!--                        params: {-->
              <!--                          teamId: item.id,-->
              <!--                        },-->
              <!--                      })-->
              <!--                    "-->
              <template v-slot:prepend>
                <v-avatar
                  :image="getClientPublicImgUrl('default-user.jpg')"
                  :size="40"
                  rounded="circle"
                ></v-avatar>
              </template>
              <template v-slot:append>
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn
                      class="ml-5"
                      icon="mdi-dots-vertical"
                      v-bind="props"
                      variant="text"
                    >
                    </v-btn>
                  </template>
                  <v-list density="compact">
                    <v-list-item
                      prepend-icon="mdi-pencil"
                      title="Edit"
                      @click="openEditMemberDialog(item)"
                    ></v-list-item>

                    <v-divider></v-divider>

                    <remove-entity
                      custom-class="text-error"
                      label="Delete"
                      prepend-icon="mdi-delete"
                      variant="list"
                      @remove-entity="removeMember(item.id)"
                    ></remove-entity>
                  </v-list>
                </v-menu>
              </template>

              <template v-slot:subtitle>
                <div class="text-truncate">
                  <span class="text-capitalize">{{ item?.category }}</span> /
                  <span class="text-capitalize">{{ item?.status }}</span>
                </div>
              </template>
            </v-list-item>
            <v-divider v-if="index !== members.length - 1"></v-divider>
          </template>
        </v-list>
        <no-items v-else :cols="12"></no-items>
      </v-col>
    </v-row>
  </v-container>

  <v-dialog v-model="dialog" width="500">
    <v-card>
      <v-card-title>Member Details</v-card-title>
      <v-card-text>
        <v-form ref="form" v-model="isFormValid" fast-fail>
          <v-text-field
            v-model="newMember.name"
            :rules="[(v) => !!v || 'Name is required!']"
            class="mt-2"
            clearable
            hide-details="auto"
            label="Name"
          ></v-text-field>
          <v-select
            v-model="newMember.category"
            :rules="[(v) => !!v || 'Category is required!']"
            :items="categoryItems"
            class="mt-2 mt-md-4"
            hide-details="auto"
            item-title="title"
            item-value="value"
            label="Category"
          ></v-select>
          <v-select
            v-model="newMember.status"
            :rules="[(v) => !!v || 'Status is required!']"
            :items="statusItems"
            class="mt-2 mt-md-4"
            hide-details="auto"
            item-title="title"
            item-value="value"
            label="Status"
          ></v-select>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="handleSaveMember">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped></style>
