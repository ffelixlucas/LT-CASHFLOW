const express = require("express");
const router = express.Router();
const controller = require("./templateController");

// ✅ Exemplo de rota GET
router.get("/", controller.listar);

// ✅ Exemplo de rota POST
router.post("/", controller.criar);

module.exports = router;
