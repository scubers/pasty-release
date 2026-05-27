import { patchConsole, patchTextInputState } from "@pasty/plugin-sdk/dom";
patchConsole();
patchTextInputState();

import { createApp } from "vue";
import ExpandedAttachmentTemplateApp from "./app.vue";
import "../../shared/base.css";

createApp(ExpandedAttachmentTemplateApp).mount("#app");
