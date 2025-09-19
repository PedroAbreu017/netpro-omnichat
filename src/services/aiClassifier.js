class AIClassifier {
  constructor() {
    // Base de conhecimento específica para ISP
    this.ispKnowledgeBase = {
      technical_patterns: {
        connectivity: {
          keywords: ['lenta', 'devagar', 'travando', 'instável', 'caindo', 'oscilando', 'instabilidade', 'péssima', 'péssimo', 'internet', 'ruim'],
          responses: [
            'Vou verificar a estabilidade da sua conexão na região.',
            'Detectei possíveis oscilações na rede. Executando diagnóstico...',
            'Analisando sua linha agora. Pode ser instabilidade no equipamento.'
          ],
          actions: ['network_status_check', 'speed_test', 'equipment_diagnostic'],
          confidence_boost: 0.3
        },
        equipment: {
          keywords: ['modem', 'roteador', 'wifi', 'aparelho', 'equipamento', 'pisca', 'luz'],
          responses: [
            'Vou executar um teste remoto no seu modem.',
            'Posso verificar o status dos equipamentos na sua instalação.',
            'Vamos analisar se há problema no roteador ou modem.'
          ],
          actions: ['equipment_restart', 'remote_diagnostic', 'equipment_status'],
          confidence_boost: 0.25
        },
        speed: {
          keywords: ['velocidade', 'mb', 'mega', 'download', 'upload', 'teste'],
          responses: [
            'Vou executar um teste de velocidade na sua linha agora.',
            'Verificando se você está recebendo a velocidade contratada.',
            'Executando análise de performance da sua conexão.'
          ],
          actions: ['speed_test', 'bandwidth_analysis', 'performance_check'],
          confidence_boost: 0.35
        }
      },
      financial_patterns: {
        payment: {
          keywords: ['boleto', 'pagar', 'pagamento', 'fatura', 'conta', 'débito'],
          responses: [
            'Vou gerar a segunda via do seu boleto agora.',
            'Consultando sua situação financeira... Tudo em dia!',
            'Enviando segunda via por email e WhatsApp.'
          ],
          actions: ['generate_invoice', 'check_payment_status', 'send_payment_link'],
          confidence_boost: 0.4
        },
        negotiation: {
          keywords: ['parcelar', 'desconto', 'negociar', 'acordo', 'débito'],
          responses: [
            'Posso oferecer condições especiais para quitação.',
            'Temos opções de parcelamento disponíveis para você.',
            'Vou conectar você com nossa equipe de negociação.'
          ],
          actions: ['calculate_discount', 'generate_payment_plan', 'escalate_to_negotiation'],
          confidence_boost: 0.3
        }
      },
      commercial_patterns: {
        plans: {
          keywords: ['plano', 'velocidade', 'upgrade', 'mudar', 'migrar', 'aumentar'],
          responses: [
            'Analisando seu uso... Posso sugerir o plano ideal para você.',
            'Temos promoções especiais para upgrade neste mês.',
            'Baseado no seu perfil, recomendo nosso plano Premium.'
          ],
          actions: ['analyze_usage', 'suggest_plan', 'calculate_upgrade'],
          confidence_boost: 0.3
        },
        cancellation: {
          keywords: ['cancelar', 'desistir', 'sair', 'concorrente', 'trocar'],
          responses: [
            'Posso oferecer condições especiais para você continuar conosco.',
            'Vou conectar você com nossa equipe de retenção.',
            'Que tal conhecer nossas novas ofertas exclusivas?'
          ],
          actions: ['retention_offer', 'escalate_to_retention', 'special_discount'],
          confidence_boost: 0.35
        }
      }
    };

    // Análise de sentimento baseada em palavras-chave
    this.sentimentAnalysis = {
      frustrated: {
       keywords: ['raiva', 'irritado', 'absurdo', 'péssimo', 'péssima', 'horrível', 'odeio', 'inaceitável'],
       intensity: 0.8
     },
      negative: {
        keywords: ['problema', 'ruim', 'insatisfeito', 'chato', 'complicado', 'difícil', 'travando'],
        intensity: 0.6
      },
      neutral: {
        keywords: ['preciso', 'gostaria', 'quero', 'pode', 'consegue', 'ajudar'],
        intensity: 0.3
      },
      positive: {
        keywords: ['obrigado', 'ótimo', 'bom', 'excelente', 'parabéns', 'feliz'],
        intensity: 0.1
      }
    };

    // Contexto influencia classificação
    this.contextualRules = {
      premium_customer: { confidence_boost: 0.1, priority_escalation: true },
      multiple_issues: { confidence_boost: 0.15, escalation_threshold: 0.6 },
      recent_payment: { financial_confidence_boost: 0.2 },
      high_usage: { commercial_confidence_boost: 0.25 }
    };
  }

  async classifyMessage(message, customerContext = null) {
    const startTime = Date.now();
    
    // Simular processamento (100-300ms como IA real)
    await this.simulateProcessingTime();

    const text = message.toLowerCase().trim();
    
    // Análise principal
    const classification = this.performDeepAnalysis(text, customerContext);
    
    // Geração de resposta contextualizada
    const response = this.generateContextualResponse(classification, customerContext);
    
    // Determinação de ações
    const actions = this.determineActions(classification, customerContext);

    // Cálculo de complexidade
    const complexity = this.calculateComplexity(classification, customerContext);

    return {
      processing_time_ms: Date.now() - startTime,
      classification: {
        intent: classification.intent,
        confidence: classification.confidence,
        sentiment: classification.sentiment,
        keywords: classification.keywords,
        complexity: complexity,
        context_factors: classification.contextFactors
      },
      response: {
        text: response,
        actions: actions,
        follow_up_time_seconds: this.calculateFollowUpTime(classification)
      },
      auto_resolvable: classification.confidence > 0.7 && complexity !== 'complex',
      recommended_department: this.getRecommendedDepartment(classification.intent),
      business_insights: this.generateBusinessInsights(classification, customerContext)
    };
  }

  async simulateProcessingTime() {
    // Simular tempo realista de processamento de IA (100-300ms)
    const delay = 100 + Math.random() * 200;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

 performDeepAnalysis(text, customerContext) {
  console.log('DEBUG - Analyzing text:', text);
  let bestMatch = {
    intent: 'general',
    confidence: 0.3,
    sentiment: 'neutral',
    keywords: [],
    contextFactors: []
  };

  // Análise por categoria
  const categories = ['technical_patterns', 'financial_patterns', 'commercial_patterns'];
  
  for (const category of categories) {
    const patterns = this.ispKnowledgeBase[category];
    
    for (const [subCategory, pattern] of Object.entries(patterns)) {
      const matches = this.findKeywordMatches(text, pattern.keywords);
      
      if (matches.length > 0) {
        let confidence = this.calculateEnhancedConfidence(matches, pattern.keywords, text, subCategory);
        
        // Aplicar boost de confiança do padrão
        confidence += pattern.confidence_boost || 0;
        
        // Aplicar contexto do cliente
        confidence = this.applyContextualBoost(confidence, customerContext, category);
        
        // NOVO: Threshold dinâmico baseado na categoria
        const dynamicThreshold = this.getDynamicThreshold(category, customerContext);
        
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            intent: category.replace('_patterns', ''),
            confidence: Math.min(confidence, 0.95),
            sentiment: this.analyzeSentiment(text),
            keywords: matches,
            subCategory: subCategory,
            contextFactors: this.extractContextFactors(customerContext),
            threshold: dynamicThreshold, // Para debugging
            qualityScore: this.calculateQualityScore(matches, text) // Novo
          };
        }
      }
    }
  }

  return bestMatch;
}

  findKeywordMatches(text, keywords) {
    return keywords.filter(keyword => 
      text.includes(keyword) || 
      this.fuzzyMatch(text, keyword)
    );
  }

  fuzzyMatch(text, keyword) {
    // Implementação simples de fuzzy matching
    const variations = {
      'lenta': ['devagar', 'demorada', 'lentidão'],
      'internet': ['net', 'conexão', 'linha'],
      'boleto': ['fatura', 'conta', 'cobrança'],
      'plano': ['pacote', 'serviço']
    };
    
    const keywordVariations = variations[keyword] || [];
    return keywordVariations.some(variation => text.includes(variation));
  }

  calculateBaseConfidence(matches, totalKeywords) {
    const matchRatio = matches.length / totalKeywords.length;
    const matchStrength = matches.length * 0.2; // Cada match vale 20%
    return Math.min(matchRatio + matchStrength, 0.8);
  }

  applyContextualBoost(baseConfidence, customerContext, category) {
  let boostedConfidence = baseConfidence;
  
  if (!customerContext) return boostedConfidence;

  const customer = customerContext.customer;
  
  // Cliente premium - maior tolerância
  if (customer?.tier === 'premium') {
    boostedConfidence += 0.12; // Aumentado de 0.1
  }
  
  // Múltiplas interações - cliente conhecido
  if (customerContext.recent_interactions?.length > 2) {
    boostedConfidence += 0.18; // Aumentado de 0.15
  }
  
  // NOVO: Boost baseado no sentiment
  const sentiment = this.analyzeSentiment(customerContext.last_message || '');
  if (sentiment === 'frustrated') {
    boostedConfidence += 0.10; // Clientes frustrados precisam de resolução rápida
  }
  
  // NOVO: Boost baseado no horário (problemas técnicos à noite são mais urgentes)
  const hour = new Date().getHours();
  if (category === 'technical_patterns' && (hour > 20 || hour < 8)) {
    boostedConfidence += 0.08;
  }

  return Math.min(boostedConfidence, 0.95);
}

  analyzeSentiment(text) {
    let sentimentScore = 0;
    let detectedSentiment = 'neutral';

    for (const [sentiment, data] of Object.entries(this.sentimentAnalysis)) {
      const matches = data.keywords.filter(keyword => text.includes(keyword));
      if (matches.length > 0) {
        const score = matches.length * data.intensity;
        if (score > sentimentScore) {
          sentimentScore = score;
          detectedSentiment = sentiment;
        }
      }
    }

    return detectedSentiment;
  }

  generateContextualResponse(classification, customerContext) {
    const customer = customerContext?.customer;
    const customerName = customer?.name?.split(' ')[0] || 'cliente';
    const plan = customer?.plan || 'seu plano';

    // Buscar resposta padrão baseada na classificação
    const categoryPatterns = this.ispKnowledgeBase[`${classification.intent}_patterns`];
    
    if (categoryPatterns && classification.subCategory) {
      const pattern = categoryPatterns[classification.subCategory];
      const baseResponse = this.selectRandomResponse(pattern.responses);
      
      // Personalizar resposta com contexto
      return this.personalizeResponse(baseResponse, customerName, plan, customer?.tier);
    }

    // Resposta genérica contextualizada
    return `Olá ${customerName}! Vou analisar sua solicitação sobre ${classification.intent}. Um momento...`;
  }

  personalizeResponse(baseResponse, customerName, plan, tier) {
    let personalizedResponse = baseResponse;

    // Adicionar nome se não estiver presente
    if (!personalizedResponse.includes(customerName) && customerName !== 'cliente') {
      personalizedResponse = `Olá ${customerName}! ${personalizedResponse}`;
    }

    // Mencionar plano se relevante
    if (plan !== 'seu plano' && Math.random() > 0.5) {
      personalizedResponse += ` Como cliente ${plan}, você tem prioridade no atendimento.`;
    }

    // Tratamento especial para premium
    if (tier === 'premium') {
      personalizedResponse += ' Vou priorizar sua solicitação.';
    }

    return personalizedResponse;
  }

  selectRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  determineActions(classification, customerContext) {
    const categoryPatterns = this.ispKnowledgeBase[`${classification.intent}_patterns`];
    
    if (categoryPatterns && classification.subCategory) {
      const pattern = categoryPatterns[classification.subCategory];
      return pattern.actions || [];
    }

    // Ações padrão por categoria
    const defaultActions = {
      technical: ['network_check', 'diagnostic'],
      financial: ['account_status', 'payment_options'],
      commercial: ['plan_analysis', 'usage_review'],
      general: ['context_analysis', 'route_to_specialist']
    };

    return defaultActions[classification.intent] || ['general_assistance'];
  }

  calculateComplexity(classification, customerContext) {
    let complexityScore = 0;

    // Fatores que aumentam complexidade
    if (classification.confidence < 0.6) complexityScore += 2;
    if (classification.sentiment === 'frustrated') complexityScore += 3;
    if (customerContext?.recent_interactions?.length > 3) complexityScore += 2;
    if (customerContext?.customer?.tier === 'enterprise') complexityScore += 1;

    // Múltiplas palavras-chave = mais complexo
    if (classification.keywords.length > 3) complexityScore += 1;

    if (complexityScore >= 4) return 'complex';
    if (complexityScore >= 2) return 'medium';
    return 'simple';
  }

  calculateFollowUpTime(classification) {
    const timings = {
      'technical': { simple: 30, medium: 120, complex: 300 },
      'financial': { simple: 15, medium: 60, complex: 180 },
      'commercial': { simple: 45, medium: 180, complex: 600 },
      'general': { simple: 30, medium: 90, complex: 240 }
    };

    const categoryTiming = timings[classification.intent] || timings.general;
    return categoryTiming[classification.complexity] || 60;
  }

  getRecommendedDepartment(intent) {
    const departments = {
      technical: 'technical_support',
      financial: 'billing_department', 
      commercial: 'sales_team',
      general: 'general_support'
    };
    return departments[intent] || 'general_support';
  }

  extractContextFactors(customerContext) {
    const factors = [];
    
    if (!customerContext) return factors;

    const customer = customerContext.customer;
    
    if (customer?.tier === 'premium') factors.push('premium_customer');
    if (customer?.financial_status?.status === 'inadimplente') factors.push('payment_issues');
    if (customerContext.recent_interactions?.length > 2) factors.push('frequent_contact');
    
    return factors;
  }

  generateBusinessInsights(classification, customerContext) {
    const insights = {
      customer_risk_level: 'low',
      upsell_opportunity: false,
      retention_risk: false,
      priority_level: 'normal'
    };

    // Avaliar risco de churn
    if (classification.sentiment === 'frustrated' && 
        customerContext?.recent_interactions?.length > 3) {
      insights.retention_risk = true;
      insights.customer_risk_level = 'high';
    }

    // Oportunidade de upsell
    if (classification.intent === 'technical' && 
        classification.keywords.includes('lenta') &&
        customerContext?.customer?.plan?.includes('100MB')) {
      insights.upsell_opportunity = true;
    }

    // Prioridade baseada no tier
    if (customerContext?.customer?.tier === 'premium') {
      insights.priority_level = 'high';
    }

    return insights;
  }

   // NOVA FUNÇÃO 1: Confidence aprimorado
calculateEnhancedConfidence(matches, totalKeywords, fullText, subCategory) {
  const matchRatio = matches.length / totalKeywords.length;
  const matchStrength = matches.length * 0.25; // Aumentado de 0.2 para 0.25
  
  // Boost para palavras-chave múltiplas na mesma mensagem
  const keywordDensity = matches.length / fullText.split(' ').length;
  const densityBoost = keywordDensity > 0.3 ? 0.15 : 0;
  
  // Boost para subcategorias específicas com alta precisão
  const subcategoryBoost = {
    'connectivity': 0.1, // Problemas de conexão são mais claros
    'payment': 0.15,     // Pagamentos são muito específicos
    'plans': 0.05        // Planos podem ser ambíguos
  }[subCategory] || 0;
  
  return Math.min(matchRatio + matchStrength + densityBoost + subcategoryBoost, 0.9);
}

// NOVA FUNÇÃO 2: Threshold dinâmico
getDynamicThreshold(category, customerContext) {
  const baseThresholds = {
    'technical_patterns': 0.65,
    'financial_patterns': 0.75,
    'commercial_patterns': 0.70
  };
  
  let threshold = baseThresholds[category] || 0.70;
  
  // Ajustar baseado no tier do cliente
  if (customerContext?.customer?.tier === 'premium') {
    threshold -= 0.10; // Premium customers get lower threshold
  }
  
  // Ajustar baseado no histórico de problemas
  if (customerContext?.recent_interactions?.length > 2) {
    threshold -= 0.05; // Clientes com histórico recebem mais tolerância
  }
  
  return Math.max(threshold, 0.5); // Nunca menos que 0.5
}

// NOVA FUNÇÃO 3: Score de qualidade
calculateQualityScore(matches, fullText) {
  const words = fullText.split(' ');
  const messageLength = words.length;
  
  // Mensagens muito curtas ou muito longas são menos confiáveis
  let lengthScore = 1.0;
  if (messageLength < 3) lengthScore = 0.6;
  else if (messageLength > 20) lengthScore = 0.8;
  
  // Proporção de palavras-chave encontradas
  const keywordRatio = matches.length / Math.max(messageLength, 1);
  const ratioScore = Math.min(keywordRatio * 2, 1.0);
  
  return (lengthScore + ratioScore) / 2;
  }

}

module.exports = new AIClassifier();