<script setup>
import PageTitle from "@/components/PageTitle.vue";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
import { toast } from "vue-sonner";
import ConfirmationDialog from "@/components/ConfirmationDialog.vue";

const store = useStore();
const route = useRoute();

const organizers = computed(() => store.state.user.organizers);
const managers = computed(() => store.state.user.managers);

const accordion = ref(["organizers"]);
const addUserDialog = ref(false);
const editUserDialog = ref(false);
const userRole = ref(null);

const form = ref(null);
const isFormValid = ref(true);

const userInit = {
  id: null,
  email: null,
  password: null,
  role: null,
};
const user = reactive({ ...userInit });

const openEditDialog = (selectedUser, role) => {
  userRole.value = role;

  // const { name, ...rest } = selectedUser;
  // Object.assign(user, { ...rest }); // avoid 'name', 'aId' from submitting backend
  Object.assign(user, { ...selectedUser });
  editUserDialog.value = !editUserDialog.value;
};

const openAddUserDialog = (role) => {
  userRole.value = role;
  Object.assign(user, { ...userInit });
  addUserDialog.value = !addUserDialog.value;
};

const handleSubmitCredential = async () => {
  await form.value.validate();
  if (!isFormValid.value) return;

  user.role = userRole.value.toLowerCase();
  await store.dispatch("user/save", user).then(() => {
    if (user.id) {
      editUserDialog.value = !editUserDialog.value;
    } else if (!user.id) {
      addUserDialog.value = !addUserDialog.value;
    }
    Object.assign(user, { ...userInit });
  });
};
const removeUser = async (id) => {
  await store.dispatch("user/removeUser", { id });
  store.commit("user/setManagers");
  store.commit("user/setOrganizers");
};
const copyToClipboard = async (item) => {
  await navigator.clipboard.writeText(
    `Username: ${item.username}, Password: ${item.password}`,
  );
  toast.info("Copied to clipboard!");
};

onMounted(async () => {
  await store.dispatch("user/setUsers");
  store.commit("user/setManagers");
  store.commit("user/setOrganizers");
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <page-title
          justify="space-between"
          :back-route="{ name: 'dashboard' }"
          sub-title="Super Admin"
          title="Credentials"
        >
        </page-title>
      </v-col>

      <v-expansion-panels v-model="accordion">
        <v-expansion-panel value="organizers">
          <v-expansion-panel-title>
            <span>Organizers</span>
            <v-spacer></v-spacer>
            <v-btn
              class="me-5"
              color="primary"
              @click.stop="openAddUserDialog('organizer')"
            >
              Generate
            </v-btn>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-table v-if="organizers?.length > 0" density="comfortable" hover>
              <thead>
                <tr>
                  <th class="text-start">Email</th>
                  <th class="text-center">Password</th>
                  <th class="text-end"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in organizers" :key="'o-' + index">
                  <!--                  {{item}}-->
                  <td>{{ item.email }}</td>
                  <td class="text-center">{{ item.password }}</td>
                  <td class="text-end">
                    <v-menu>
                      <template v-slot:activator="{ props }">
                        <v-btn
                          icon="mdi-dots-vertical"
                          size="small"
                          v-bind="props"
                          variant="text"
                        >
                        </v-btn>
                      </template>
                      <v-list density="compact">
                        <v-list-item
                          density="compact"
                          link
                          prepend-icon="mdi-content-copy"
                          title="Copy"
                          @click="copyToClipboard(item)"
                        ></v-list-item>
                        <v-list-item
                          density="compact"
                          link
                          prepend-icon="mdi-pencil"
                          title="Edit"
                          @click="openEditDialog(item, 'organizer')"
                        ></v-list-item>
                        <v-divider></v-divider>
                        <confirmation-dialog @confirm="removeUser(item.id)">
                          <template #activator="{ onClick }">
                            <v-list-item
                              class="text-error"
                              prepend-icon="mdi-delete"
                              title="Delete"
                              @click.stop="onClick"
                            ></v-list-item>
                          </template>
                        </confirmation-dialog>
                      </v-list>
                    </v-menu>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <v-alert v-else border="start" closable density="compact"
              >No Data available!
            </v-alert>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel value="managers">
          <v-expansion-panel-title>
            <span>Managers</span>
            <v-spacer></v-spacer>
            <v-btn
              class="me-5"
              color="primary"
              @click.stop="openAddUserDialog('team_manager')"
            >
              Generate
            </v-btn>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-table v-if="managers?.length > 0" density="comfortable" hover>
              <thead>
                <tr>
                  <th class="text-start">Email</th>
                  <th class="text-center">Password</th>
                  <th class="text-end"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in managers" :key="'t-' + index">
                  <td>{{ item.email }}</td>
                  <td class="text-center">{{ item.password }}</td>
                  <td class="text-end">
                    <v-menu>
                      <template v-slot:activator="{ props }">
                        <v-btn
                          icon="mdi-dots-vertical"
                          size="small"
                          v-bind="props"
                          variant="text"
                        >
                        </v-btn>
                      </template>
                      <v-list density="compact">
                        <v-list-item
                          density="compact"
                          link
                          prepend-icon="mdi-content-copy"
                          title="Copy"
                          @click="copyToClipboard(item)"
                        ></v-list-item>
                        <v-list-item
                          density="compact"
                          link
                          prepend-icon="mdi-pencil"
                          title="Edit"
                          @click="openEditDialog(item, 'team_manager')"
                        ></v-list-item>
                        <v-divider></v-divider>
                        <confirmation-dialog @confirm="removeUser(item.id)">
                          <template #activator="{ onClick }">
                            <v-list-item
                              class="text-error"
                              prepend-icon="mdi-delete"
                              title="Delete"
                              @click.stop="onClick"
                            ></v-list-item>
                          </template>
                        </confirmation-dialog>
                      </v-list>
                    </v-menu>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <v-alert v-else border="start" closable density="compact"
              >No Data available!
            </v-alert>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-row>
  </v-container>

  <v-dialog v-model="addUserDialog" width="500">
    <v-card>
      <v-card-title>Generate</v-card-title>
      <v-card-text>
        <v-form
          ref="form"
          v-model="isFormValid"
          fast-fail
          @submit.prevent="handleSubmitCredential"
        >
          <v-text-field
            v-model="user.email"
            :rules="[(v) => !!v || 'Email is required!']"
            class="mt-2"
            clearable
            hide-details="auto"
            label="Email"
            @keyup.enter="handleSubmitCredential"
          ></v-text-field>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="handleSubmitCredential">Generate</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="editUserDialog" width="500">
    <v-card>
      <v-card-title> Edit Credential</v-card-title>
      <v-card-text>
        <v-form
          ref="form"
          v-model="isFormValid"
          fast-fail
          @submit.prevent="handleSubmitCredential"
        >
          <v-text-field
            v-model="user.email"
            :rules="[(v) => !!v || 'Email is required!']"
            class="mt-2"
            clearable
            hide-details="auto"
            label="Email"
          ></v-text-field>
          <v-text-field
            v-model="user.password"
            :rules="[(v) => !!v || 'Password is required!']"
            class="mt-2"
            clearable
            hide-details="auto"
            label="Password"
            @keyup.enter="handleSubmitCredential"
          ></v-text-field>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="handleSubmitCredential">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped></style>
