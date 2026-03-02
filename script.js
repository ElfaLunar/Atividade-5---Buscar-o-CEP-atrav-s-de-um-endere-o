// Função global para preencher os exemplos
window.preencherExemplo = function(logradouro, bairro, cidade, estado, numero) {
    document.getElementById('logradouro').value = logradouro;
    document.getElementById('bairro').value = bairro;
    document.getElementById('cidade').value = cidade;
    document.getElementById('estado').value = estado;
    document.getElementById('numero').value = numero;
};

// Aguarda o DOM carregar completamente
document.addEventListener('DOMContentLoaded', function() {
    const cepForm = document.getElementById('cepForm');
    const carregando = document.getElementById('carregando');
    const erro = document.getElementById('erro');
    const resultado = document.getElementById('resultado');
    
    // Elementos do resultado
    const cepValor = document.getElementById('cepValor');
    const resLogradouro = document.getElementById('resLogradouro');
    const resBairro = document.getElementById('resBairro');
    const resCidade = document.getElementById('resCidade');
    const resNumero = document.getElementById('resNumero');

    // Função para validar CEP
    function validarCEP(cep) {
        return cep && cep.length >= 8;
    }

    // Função para formatar CEP
    function formatarCEP(cep) {
        // Remove tudo que não é número
        cep = cep.replace(/\D/g, '');
        
        // Formata como 00000-000
        if (cep.length === 8) {
            return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
        }
        
        return cep;
    }

    // Função para buscar no ViaCEP
    async function buscarViaCEP(estado, cidade, logradouro) {
        try {
            const response = await fetch(`https://viacep.com.br/ws/${estado}/${cidade}/${logradouro}/json/`);
            
            if (!response.ok) {
                throw new Error('Erro na resposta do ViaCEP');
            }
            
            const data = await response.json();
            
            if (data.erro) {
                return null;
            }
            
            return data;
        } catch (error) {
            console.error('Erro no ViaCEP:', error);
            return null;
        }
    }

    // Função para buscar no OpenStreetMap
    async function buscarOpenStreetMap(enderecoCompleto) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoCompleto)}&countrycodes=br&limit=5&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'BuscadorCEP/1.0'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Erro na resposta do OpenStreetMap');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erro no OpenStreetMap:', error);
            return [];
        }
    }

    // Event listener do formulário
    cepForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Pegando valores dos campos
        const logradouro = document.getElementById('logradouro').value.trim();
        const bairro = document.getElementById('bairro').value.trim();
        const cidade = document.getElementById('cidade').value.trim();
        const estado = document.getElementById('estado').value;
        const numero = document.getElementById('numero').value.trim();

        // Escondendo resultados anteriores
        resultado.classList.remove('mostrar');
        erro.classList.remove('mostrar');
        
        // Validando campos obrigatórios
        if (!logradouro || !cidade || !estado || !numero) {
            erro.textContent = 'Por favor, preencha todos os campos obrigatórios.';
            erro.classList.add('mostrar');
            return;
        }

        // Validando estado
        if (estado.length !== 2) {
            erro.textContent = 'Por favor, selecione um estado válido.';
            erro.classList.add('mostrar');
            return;
        }

        // Mostrar carregando
        carregando.classList.add('mostrar');

        try {
            // Construindo o endereço completo para busca
            const enderecoCompleto = `${logradouro}, ${numero}${bairro ? ' - ' + bairro : ''}, ${cidade} - ${estado}, Brasil`;
            
            // Primeiro tenta no OpenStreetMap
            const osmData = await buscarOpenStreetMap(enderecoCompleto);

            if (osmData && osmData.length > 0) {
                // Procura por CEP nos resultados
                let cepEncontrado = null;
                let melhorResultado = osmData[0]; // Pega o primeiro resultado como padrão
                
                // Tenta encontrar um resultado que tenha CEP
                for (const local of osmData) {
                    if (local.address && local.address.postcode) {
                        cepEncontrado = local.address.postcode;
                        melhorResultado = local;
                        break;
                    }
                }

                // Se não encontrou CEP na resposta, tenta extrair do display_name
                if (!cepEncontrado && melhorResultado.display_name) {
                    const displayName = melhorResultado.display_name;
                    const cepMatch = displayName.match(/\b\d{5}-?\d{3}\b/);
                    if (cepMatch) {
                        cepEncontrado = cepMatch[0];
                    }
                }

                if (cepEncontrado && validarCEP(cepEncontrado.replace(/\D/g, ''))) {
                    // CEP encontrado no OpenStreetMap
                    cepValor.textContent = formatarCEP(cepEncontrado);
                    resLogradouro.textContent = logradouro;
                    resBairro.textContent = bairro || 'Não informado';
                    resCidade.textContent = `${cidade}/${estado}`;
                    resNumero.textContent = numero;
                    
                    resultado.classList.add('mostrar');
                    carregando.classList.remove('mostrar');
                    return;
                }
            }

            // Se não encontrou no OpenStreetMap, tenta no ViaCEP
            const viaCepData = await buscarViaCEP(estado, cidade, logradouro);
            
            if (viaCepData && viaCepData.length > 0) {
                // Encontrou no ViaCEP
                const primeiroResultado = viaCepData[0];
                
                cepValor.textContent = formatarCEP(primeiroResultado.cep);
                resLogradouro.textContent = primeiroResultado.logradouro || logradouro;
                resBairro.textContent = primeiroResultado.bairro || bairro || 'Não informado';
                resCidade.textContent = `${primeiroResultado.localidade}/${primeiroResultado.uf}`;
                resNumero.textContent = numero;
                
                resultado.classList.add('mostrar');
                carregando.classList.remove('mostrar');
                return;
            }

            // Se chegou aqui, não encontrou em nenhuma API
            carregando.classList.remove('mostrar');
            erro.textContent = 'Endereço não encontrado. Verifique os dados e tente novamente.';
            erro.classList.add('mostrar');

        } catch (error) {
            console.error('Erro detalhado:', error);
            carregando.classList.remove('mostrar');
            erro.textContent = 'Erro ao buscar o CEP. Tente novamente mais tarde.';
            erro.classList.add('mostrar');
        }
    });

    // Adicionar máscara automática para CEP quando exibido (não necessário, mas útil para formatação)
    // Validação em tempo real do número (apenas números)
    const numeroInput = document.getElementById('numero');
    numeroInput.addEventListener('input', function(e) {
        this.value = this.value.replace(/\D/g, '');
    });

    // Auto-completar para cidade (pode ser expandido)
    const cidadeInput = document.getElementById('cidade');
    cidadeInput.addEventListener('input', function(e) {
        // Capitaliza primeira letra de cada palavra
        this.value = this.value.replace(/\b\w/g, l => l.toUpperCase());
    });
});
