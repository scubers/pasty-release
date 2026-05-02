function success(options = {}) {
  return {
    success: true,
    userMessage: options.userMessage || null
  };
}

function failure(userMessage) {
  return {
    success: false,
    userMessage: userMessage || null
  };
}

module.exports = {
  rendererResult: {
    success,
    failure
  }
};
