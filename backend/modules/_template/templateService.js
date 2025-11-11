const repository = require("./templateRepository");
const { logger } = require("../../utils/logger");

exports.listarTodos = async () => {
  logger.debug("templateService.listarTodos()");
  const registros = await repository.buscarTodos();
  return registros;
};

exports.criar = async (dados) => {
  logger.debug("templateService.criar()", { dados });
  const novo = await repository.inserir(dados);
  return novo;
};
