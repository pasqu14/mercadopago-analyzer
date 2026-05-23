import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface AIContext {
  totalSpend: number;
  previousMonthSpend?: number;
  topCategories: Array<{ name: string; amount: number; percentage: number }>;
  transactionCount: number;
  period: string;
  currency: string;
  recentTransactions?: Array<{ merchant: string; amount: number; date: string }>;
  anomalies?: Array<{ merchant: string; amount: number; reason: string }>;
}

export class AIService {
  private anthropic: Anthropic | null = null;

  constructor() {
    if (env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
  }

  async analyze(question: string, context: AIContext): Promise<string> {
    const systemPrompt = `Sos un asistente financiero personal especializado en análisis de gastos para usuarios argentinos.
Analizás los gastos del usuario en Mercado Pago y dás insights claros, concretos y accionables.
Usás lenguaje coloquial argentino (vos/tu), pero profesional. Siempre incluís números concretos.
Sés conciso: máximo 3-4 párrafos. Usás bullet points para listas.
La moneda es ${context.currency} (Pesos Argentinos).`;

    const contextMessage = `
CONTEXTO DEL PERÍODO: ${context.period}
- Gasto total: $${context.totalSpend.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
${context.previousMonthSpend ? `- Gasto mes anterior: $${context.previousMonthSpend.toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : ''}
${context.previousMonthSpend ? `- Variación: ${((context.totalSpend - context.previousMonthSpend) / context.previousMonthSpend * 100).toFixed(1)}%` : ''}
- Transacciones: ${context.transactionCount}

TOP CATEGORÍAS:
${context.topCategories.map((c) => `- ${c.name}: $${c.amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })} (${c.percentage.toFixed(1)}%)`).join('\n')}

${
  context.recentTransactions?.length
    ? `ÚLTIMAS TRANSACCIONES:\n${context.recentTransactions.map((t) => `- ${t.date}: ${t.merchant} - $${t.amount.toLocaleString('es-AR')}`).join('\n')}`
    : ''
}

${
  context.anomalies?.length
    ? `ANOMALÍAS DETECTADAS:\n${context.anomalies.map((a) => `- ${a.merchant}: $${a.amount.toLocaleString('es-AR')} (${a.reason})`).join('\n')}`
    : ''
}

PREGUNTA DEL USUARIO: ${question}`;

    if (this.anthropic) {
      try {
        return await this.callClaude(systemPrompt, contextMessage);
      } catch (err) {
        logger.warn({ err }, 'Claude falló, intentando fallback a Gemini');
      }
    }

    if (env.GEMINI_API_KEY) {
      try {
        return await this.callGemini(systemPrompt, contextMessage);
      } catch (err) {
        logger.warn({ err }, 'Gemini falló también');
      }
    }

    return this.fallbackAnalysis(context, question);
  }

  private async callClaude(system: string, message: string): Promise<string> {
    if (!this.anthropic) throw new Error('Anthropic no inicializado');

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: message }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');
    return content.text;
  }

  private async callGemini(system: string, message: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;

    const response = await axios.post(url, {
      contents: [
        {
          parts: [{ text: `${system}\n\n${message}` }],
        },
      ],
      generationConfig: { maxOutputTokens: 1024 },
    });

    return response.data.candidates[0].content.parts[0].text as string;
  }

  private fallbackAnalysis(context: AIContext, _question: string): string {
    const top = context.topCategories[0];
    const trend =
      context.previousMonthSpend
        ? context.totalSpend > context.previousMonthSpend
          ? `📈 aumentó un ${((context.totalSpend - context.previousMonthSpend) / context.previousMonthSpend * 100).toFixed(1)}% vs el mes anterior`
          : `📉 bajó un ${((context.previousMonthSpend - context.totalSpend) / context.previousMonthSpend * 100).toFixed(1)}% vs el mes anterior`
        : 'sin comparación previa disponible';

    return `**Resumen de ${context.period}**

Tu gasto total fue de **$${context.totalSpend.toLocaleString('es-AR', { maximumFractionDigits: 0 })}** en ${context.transactionCount} transacciones, ${trend}.

**Top categorías:**
${context.topCategories.slice(0, 3).map((c) => `- ${c.name}: $${c.amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })} (${c.percentage.toFixed(1)}%)`).join('\n')}

${top ? `Tu mayor gasto fue en **${top.name}** (${top.percentage.toFixed(1)}% del total).` : ''}

> ⚠️ Análisis generado sin IA (configurá ANTHROPIC_API_KEY para insights avanzados).`;
  }
}
