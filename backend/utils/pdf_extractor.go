package utils

import (
	"regexp"
	"strings"
)

type ExtractedData struct {
	Fornecedor string
	Descricao  string
	Valor      float64
}

func ExtractDataFromText(text string) ExtractedData {
	data := ExtractedData{}

	// 1. Identificar Fornecedor (Exemplos das suas notas)
	if strings.Contains(strings.ToUpper(text), "R. GREEN INFORMATICA") {
		data.Fornecedor = "R. GREEN INFORMATICA"
	} else if strings.Contains(strings.ToUpper(text), "SND DISTRIBUICAO") {
		data.Fornecedor = "SND DISTRIBUICAO"
	} else if strings.Contains(strings.ToUpper(text), "REIS OFFICE") {
		data.Fornecedor = "REIS OFFICE PRODUCTS"
	}

	// 2. Regex para Valor (Padrão R$ 1.234,56)
	reValor := regexp.MustCompile(`R\$\s?(\d{1,3}(\.\d{3})*,\d{2})`)
	match := reValor.FindStringSubmatch(text)
	if len(match) > 1 {
		// Converte string "1.283,69" para float 1283.69
		valStr := strings.ReplaceAll(match[1], ".", "")
		valStr = strings.ReplaceAll(valStr, ",", ".")
		// Aqui você usaria strconv.ParseFloat
	}

	// 3. Descrição (Pega as primeiras linhas do serviço)
	// Lógica customizada baseada no prestador...
	
	return data
}