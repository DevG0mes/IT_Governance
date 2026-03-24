// Arquivo: utils/pdf_extractor.js
const pdfParse = require('pdf-parse');

// Função 1: Abre o arquivo PDF e transforma em texto puro
const extractTextFromPDF = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error("Erro ao extrair texto do PDF:", error);
    throw new Error("Falha ao processar o arquivo PDF");
  }
};

// Função 2: Analisa o texto puro e extrai os dados (A sua lógica do Go traduzida)
const extractDataFromText = (text) => {
  const data = {
    fornecedor: "",
    descricao: "",
    valor: 0.0
  };

  if (!text) return data;

  // 1. Identificar Fornecedor (Case insensitive)
  const textUpper = text.toUpperCase();
  
  if (textUpper.includes("R. GREEN INFORMATICA")) {
    data.fornecedor = "R. GREEN INFORMATICA";
  } else if (textUpper.includes("SND DISTRIBUICAO")) {
    data.fornecedor = "SND DISTRIBUICAO";
  } else if (textUpper.includes("REIS OFFICE")) {
    data.fornecedor = "REIS OFFICE PRODUCTS";
  }

  // 2. Regex para Valor (Padrão R$ 1.234,56)
  const reValor = /R\$\s?(\d{1,3}(?:\.\d{3})*,\d{2})/;
  const match = text.match(reValor);

  if (match && match[1]) {
    // Converte string "1.283,69" para float 1283.69
    let valStr = match[1].replace(/\./g, ""); // Remove todos os pontos
    valStr = valStr.replace(",", ".");        // Troca a vírgula por ponto
    
    // Converte para Float (Equivalente ao strconv.ParseFloat)
    data.valor = parseFloat(valStr);
  }

  // 3. Descrição 
  // Lógica customizada baseada no prestador...
  data.descricao = "Ajustar lógica de captura de descrição";

  return data;
};

module.exports = { extractTextFromPDF, extractDataFromText };