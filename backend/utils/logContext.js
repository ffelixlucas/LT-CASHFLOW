const { AsyncLocalStorage } = require("async_hooks");
const storage = new AsyncLocalStorage();

function setContext(data) {
  storage.run(data, () => {});
}

function getContext() {
  return storage.getStore();
}

module.exports = { storage, setContext, getContext };
