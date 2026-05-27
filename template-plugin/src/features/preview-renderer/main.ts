import { patchConsole, patchTextInputState } from "@pasty/plugin-sdk/dom";
patchConsole();
patchTextInputState();

import { createApp } from "vue";
import AttachmentTemplateApp from "./app.vue";
import "../../shared/base.css";

createApp(AttachmentTemplateApp).mount("#app");
