package handlers

import (
	"bytes"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ledongthuc/pdf" // Execute: go get github.com/ledongthuc/pdf
)

// AnalyzePDF recebe o ficheiro e devolve o texto bruto para o Frontend
func AnalyzePDF(c *gin.Context) {
	// 1. Recebe o ficheiro pelo nome "file" definido no React
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Arquivo não recebido"})
		return
	}

	// 2. Abre o PDF
	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao abrir ficheiro"})
		return
	}
	defer f.Close()

	// 3. Extrai o texto
	buf := new(bytes.Buffer)
	buf.ReadFrom(f)

	r, err := pdf.NewReader(bytes.NewReader(buf.Bytes()), file.Size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao processar PDF"})
		return
	}

	var textBuilder bytes.Buffer
	b, err := r.GetPlainText()
	if err == nil {
		textBuilder.ReadFrom(b)
	}

	rawText := textBuilder.String()

	// Verifica se a extração funcionou
	if len(strings.TrimSpace(rawText)) == 0 {
		c.String(http.StatusOK, "ERRO: Texto não extraído (PDF protegido ou imagem)")
		return
	}

	// Envia o texto bruto para o React
	c.String(http.StatusOK, rawText)
}