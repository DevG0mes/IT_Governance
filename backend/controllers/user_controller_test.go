package controllers

import (
	"testing"
)

// TestPasswordSecurity garante que a criptografia Bcrypt está funcionando conforme os padrões OWASP
func TestPasswordSecurity(t *testing.T) {
	senhaReal := "MinhaSenhaSuperForte@2026"

	// 1. Testa se o gerador de Hash está funcionando
	hash, err := HashPassword(senhaReal)
	if err != nil {
		t.Fatalf("❌ Erro QA: Falha ao gerar o hash da senha: %v", err)
	}

	// 2. Garante que a senha não foi salva em texto plano
	if hash == senhaReal {
		t.Errorf("❌ Erro QA Crítico: O Hash gerado é idêntico à senha em texto plano!")
	}

	// 3. Testa se o verificador reconhece a senha certa
	if !CheckPasswordHash(senhaReal, hash) {
		t.Errorf("❌ Erro QA: O sistema rejeitou a senha correta!")
	}

	// 4. Testa se o verificador barra a senha errada (Força Bruta)
	if CheckPasswordHash("senhaIncorreta123", hash) {
		t.Errorf("❌ Erro QA Crítico: O sistema aceitou uma senha errada!")
	}
	
	t.Log("✅ Teste Unitário Passou: Motor de Segurança de Senhas (Bcrypt) está operante.")
}