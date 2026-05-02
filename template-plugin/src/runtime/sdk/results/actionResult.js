function text(value, options = {}) {
  return {
    result: {
      resultKind: "text",
      text: String(value ?? "")
    },
    userMessage: options.userMessage || null
  };
}

function none(options = {}) {
  return {
    result: {
      resultKind: "none",
      text: null
    },
    userMessage: options.userMessage || null
  };
}

module.exports = {
  actionResult: {
    text,
    none
  }
};
