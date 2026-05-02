function definePlugin(definition) {
  if (!definition || typeof definition.setup !== "function") {
    throw new Error("definePlugin(...) requires a setup(init) function.");
  }
  return definition;
}

module.exports = {
  definePlugin
};
