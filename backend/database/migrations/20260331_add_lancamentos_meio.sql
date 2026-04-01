ALTER TABLE lancamentos
  ADD COLUMN meio ENUM('pix', 'debito', 'credito', 'dinheiro', 'boleto', 'ted_doc', 'transferencia', 'outro') NULL
  AFTER status;
