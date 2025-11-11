const service = require("./templateService");
const { logger } = require("../../utils/logger");

exports.listar = async (req, res) => {
  try {
    logger.info("GET /template → listar()");
    const dados = await service.listarTodos();
    res.status(200).json(dados);
  } catch (error) {
    logger.error("Erro em templateController.listar:", error);
    res.status(500).json({ error: "Erro ao listar registros" });
  }
};

exports.criar = async (req, res) => {
  try {
    logger.info("POST /template → criar()");
    const novo = await service.criar(req.body);
    res.status(201).json(novo);
  } catch (error) {
    logger.error("Erro em templateController.criar:", error);
    res.status(500).json({ error: "Erro ao criar registro" });
  }
};
