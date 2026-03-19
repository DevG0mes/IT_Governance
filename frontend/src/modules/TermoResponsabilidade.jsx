import React from 'react';

export default function TermoResponsabilidade({ empregadoNome = "______________________________________________________", cpf = "_________________________" }) {
  // Pegando a data atual formatada
  const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="bg-white p-10 text-black max-w-4xl mx-auto shadow-lg print:shadow-none print:p-0 text-justify font-sans text-sm leading-relaxed">
      
      {/* TÍTULO */}
      <h1 className="text-center font-bold text-lg mb-8 uppercase">
        Termo de Responsabilidade pela Guarda e Uso de Equipamento e Ferramentas de Trabalho
      </h1>

      {/* INTRODUÇÃO E PARTES */}
      <div className="space-y-4 mb-6">
        <p>
          <strong>PSI ENERGY SOLUCAO EM AUTOMACAO DE ENERGIA LTDA</strong>, pessoa jurídica de direito privado, devidamente inscrita no CNPJ/MF sob o número 14.475.723/0001-51, situada na cidade de Jundiaí, estado de São Paulo, na Avenida Luiz Pelizzarri, 420, Distrito Industrial – CEP 13.213-073, por seu representante legal abaixo assinado, doravante simplesmente designada <strong>“PSI”</strong> e, de outro lado:
        </p>
        <p>
          Empregado ou Prestador <strong>{empregadoNome}</strong>, brasileiro(a), portador(a) do CPF/MF sob n.º <strong>{cpf}</strong>, por seu representante legal abaixo assinado, doravante simplesmente designada <strong>“RESPONSÁVEL”</strong> e,
        </p>
        <p>
          <strong>Considerando</strong> que o(a) RESPONSÁVEL recebeu da PSI Energy Solução em Automação de Energia Ltda os equipamentos e/ou ferramentas de trabalho descritas abaixo e necessárias para o desempenho de suas funções ou serviços prestados, as partes acordam o seguinte:
        </p>
      </div>

      {/* CLÁUSULA 1: OBJETO */}
      <div className="mb-6">
        <h2 className="font-bold underline mb-2">Do Objeto de Responsabilidade:</h2>
        <p className="mb-4">1 - O(a) RESPONSÁVEL reconhece ter recebido os seguintes equipamentos e ferramentas de trabalho, de propriedade da PSI Energy:</p>
        
        <table className="w-full border-collapse border border-gray-800 text-center mb-4">
          <thead className="bg-gray-200 font-bold">
            <tr>
              <th className="border border-gray-800 p-2">EQUIPAMENTO</th>
              <th className="border border-gray-800 p-2">MODELO/MARCA</th>
              <th className="border border-gray-800 p-2">DEVOLVIDO SEM AVARIA ?</th>
            </tr>
          </thead>
          <tbody>
            {/* Aqui você pode iterar sobre os equipamentos do usuário dinamicamente. Coloquei as linhas do seu modelo como exemplo */}
            <tr>
              <td className="border border-gray-800 p-2">NOTEBOOK PSI</td>
              <td className="border border-gray-800 p-2"></td>
              <td className="border border-gray-800 p-2">☐ SIM &nbsp;&nbsp; ☐ NÃO</td>
            </tr>
            <tr>
              <td className="border border-gray-800 p-2">MOCHILA</td>
              <td className="border border-gray-800 p-2">DELL</td>
              <td className="border border-gray-800 p-2">☐ SIM &nbsp;&nbsp; ☐ NÃO</td>
            </tr>
            <tr>
              <td className="border border-gray-800 p-2"></td>
              <td className="border border-gray-800 p-2"></td>
              <td className="border border-gray-800 p-2">☐ SIM &nbsp;&nbsp; ☐ NÃO</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* CLÁUSULA 2: RESPONSABILIDADE */}
      <div className="mb-6">
        <h2 className="font-bold underline mb-2">Da Responsabilidade</h2>
        <p>2 - O(a) RESPONSÁVEL compromete-se a:</p>
        <ul className="list-none pl-6 space-y-2 mt-2">
          <li><strong>2.1.</strong> Utilizar os equipamentos e ferramentas exclusivamente para o desempenho de suas funções ou serviços contratados pela PSI Energy.</li>
          <li><strong>2.2.</strong> Zelar pela boa conservação e guarda dos equipamentos e ferramentas, evitando seu desgaste ou danos fora do uso normal.</li>
          <li><strong>2.3.</strong> Proibido realizar qualquer tipo de intervenção física no notebook e adornar o dispositivo.</li>
        </ul>
      </div>

      {/* CLÁUSULA 3: DEVOLUÇÃO */}
      <div className="mb-6">
        <h2 className="font-bold underline mb-2">Da Devolução</h2>
        <p>3 - O(a) RESPONSÁVEL se compromete a cuidar bem dos equipamentos e ferramentas, devolvendo-os em ótimo estado ao final do nosso contrato de trabalho ou de prestação de serviços, excetuado seu desgaste natural.</p>
      </div>

      {/* CLÁUSULA 4: DANOS OU PERDAS */}
      <div className="mb-6">
        <h2 className="font-bold underline mb-2">Dos Danos ou Perda</h2>
        <p>4 - Em caso de dano ou perda dos equipamentos ou ferramentas por negligência ou mau uso, o(a) RESPONSÁVEL poderá ser responsabilizado(a), conforme previsto no Artigo 462, § 1º da Consolidação das Leis do Trabalho (“§ 1º - Em caso de dano causado pelo empregado, o desconto será lícito, desde que esta possibilidade tenha sido acordada ou na ocorrência de dolo do empregado.”) e nos termos do contrato de prestação de serviços, se aplicável.</p>
      </div>

      {/* CLÁUSULA 5: DISPOSIÇÕES GERAIS */}
      <div className="mb-8">
        <h2 className="font-bold underline mb-2">Das Disposições Gerais</h2>
        <p>5 - Este termo é regido pelas leis trabalhistas vigentes e pelos termos do contrato de prestação de serviços, se aplicável. Qualquer disputa relacionada a ele será submetida à jurisdição local.</p>
        <p className="mt-4">Por estarem assim justos e contratados, firmam o presente termo em duas vias de igual teor e forma, na presença de duas testemunhas.</p>
      </div>

      {/* DATA */}
      <div className="mb-16">
        <p>Jundiaí, {dataAtual}.</p>
      </div>

      {/* ASSINATURAS CORRIGIDAS (LADO A LADO) */}
      <div className="flex justify-between items-end gap-12 w-full mb-12">
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full border-t border-black mb-2"></div>
          <p className="font-bold text-center">PSI ENERGY SOLUÇÃO EM AUTOMAÇÃO DE ENERGIA LTDA</p>
        </div>
        
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full border-t border-black mb-2"></div>
          <p className="font-bold text-center">Nome e Assinatura do(a) Empregado ou Representante Legal da Empresa Terceirizada</p>
        </div>
      </div>

      {/* TESTEMUNHAS */}
      <div className="mt-8">
        <p className="font-bold mb-8">Testemunhas:</p>
        <div className="flex justify-between gap-12">
          <div className="flex-1">
            <p className="border-b border-black mb-2">Nome:</p>
            <p className="border-b border-black mb-2">RG:</p>
            <p className="border-b border-black">CPF:</p>
          </div>
          <div className="flex-1">
            <p className="border-b border-black mb-2">Nome:</p>
            <p className="border-b border-black mb-2">RG:</p>
            <p className="border-b border-black">CPF:</p>
          </div>
        </div>
      </div>

    </div>
  );
}