/**
 * plugins/vuetify.js
 *
 * Framework documentation: https://vuetifyjs.com`
 */
// lab
import {VTimePicker} from "vuetify/labs/VTimePicker";
import {VNumberInput} from "vuetify/labs/VNumberInput";
import {VDateInput} from "vuetify/labs/VDateInput";

// Styles
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";

// Composables
import {createVuetify} from "vuetify";

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  components: {
    VTimePicker,
    VNumberInput,
    VDateInput,
  },
  theme: {
    themes: {
      light: {
        colors: {
          primary: "#1867C0",
          secondary: "#5CBBF6",
          tertiary: "#f78166",
        },
      },
    },
  },
});
