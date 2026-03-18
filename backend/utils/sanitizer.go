package utils

import (
	"strings"
)

// StandardizeText remove espaços duplos e padroniza o texto
func StandardizeText(input string) string {
	s := strings.TrimSpace(input)
	// Remove espaços duplos internos transformando em slice e juntando novamente
	s = strings.Join(strings.Fields(s), " ")
	return s
}

// StandardizeEmail garante que e-mails sejam sempre minúsculos e sem espaços
func StandardizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// StandardizeAssetIdentifier remove espaços e força caixa alta para IDs (Patrimônio/Serial)
func StandardizeAssetIdentifier(id string) string {
	return strings.ToUpper(strings.TrimSpace(id))
}