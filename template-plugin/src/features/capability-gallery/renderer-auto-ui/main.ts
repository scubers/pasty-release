import { patchConsole, patchTextInputState } from "@pasty/plugin-sdk/dom";
patchConsole();
patchTextInputState();

import { createApp } from "vue";
import GalleryRendererAutoApp from "./app.vue";
import "../../../shared/base.css";

createApp(GalleryRendererAutoApp).mount("#app");
