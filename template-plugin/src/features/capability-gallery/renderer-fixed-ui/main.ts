import { patchConsole, patchTextInputState } from "@pasty/plugin-sdk/dom";
patchConsole();
patchTextInputState();

import { createApp } from "vue";
import GalleryRendererFixedApp from "./app.vue";
import "../../../shared/base.css";

createApp(GalleryRendererFixedApp).mount("#app");
