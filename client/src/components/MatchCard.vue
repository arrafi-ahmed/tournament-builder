<script setup>
import { calcMatchType, getTimeOnly } from "@/others/util";

const { match, showTime, showLgTitle, showField, variant, containerClass } =
  defineProps({
    match: { type: Object, default: null },
    showTime: { type: Boolean, default: true },
    showLgTitle: { type: Boolean, default: false },
    showField: { type: Boolean, default: false },
    variant: { type: String, default: "elevated" },
    containerClass: { type: String, default: null },
  });
</script>

<template>
  <v-card :class="containerClass" :variant="variant">
    <v-card-title v-if="showLgTitle">
      {{ match.name }}
    </v-card-title>
    <div v-else class="d-flex justify-space-between pa-2">
      <span>
        <v-chip
          v-if="showTime"
          color="primary"
          label
          size="small"
          variant="tonal"
          >{{ getTimeOnly(match.startTime) }}
        </v-chip>

        <span class="ml-2">
          {{ match.name }}
        </span>
      </span>
      <v-chip
        v-if="match.hostName"
        :color="calcMatchType(match.type).color"
        size="small"
        variant="tonal"
        >{{ match.hostName }}
      </v-chip>
    </div>
    <v-card-subtitle v-if="showField">
      {{ match.fieldName }}
    </v-card-subtitle>
    <v-card-text>
      <v-table density="compact">
        <tbody>
          <tr>
            <td>
              {{ match.homeTeamName || match.homeTeamId }}
            </td>
            <td class="w-25">
              <v-chip
                v-if="match.homeTeamScore"
                :color="
                  match.winnerId === match.homeTeamId ? 'success' : 'error'
                "
                class="ml-4"
                inline
                label
                rounded="circle"
                >{{ match.homeTeamScore }}
              </v-chip>
            </td>
          </tr>
          <tr>
            <td>
              {{ match.awayTeamName || match.awayTeamId }}
            </td>
            <td class="ms-auto">
              <v-chip
                v-if="match.awayTeamScore"
                :color="
                  match.winnerId === match.awayTeamId ? 'success' : 'error'
                "
                class="ml-4"
                inline
                label
                rounded="circle"
                >{{ match.awayTeamScore }}
              </v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>
</template>

<style scoped></style>
