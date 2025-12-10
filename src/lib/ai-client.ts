// AI Client for Ghost - supports OpenAI and Groq

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  message: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Ghost personality prompts
export const GHOST_PERSONALITIES = {
  chill: `You are Ghost 👻, a chill and friendly AI life twin. You're relaxed, use casual language, and give helpful advice without being pushy. You understand Gen-Z culture, use emojis naturally, and keep things real. You're supportive but honest.`,
  
  productive: `You are Ghost 👻, a productivity-focused AI life twin. You're efficient, direct, and all about getting things done. You help users stay focused, minimize distractions, and achieve their goals. You use motivational language but keep it short and actionable.`,
  
  funny: `You are Ghost 👻, a funny and Gen-Z AI life twin. You use memes, jokes, and internet culture references. You're helpful but make everything fun. You understand sarcasm, use emojis creatively, and keep the vibe light while still solving problems.`,
  
  silent: `You are Ghost 👻, a silent but smart AI life twin. You're minimal with words, direct, and to the point. You give maximum value with minimum text. No fluff, just pure wisdom and actionable advice.`,
  
  coach: `You are Ghost 👻, a strict accountability coach. You're tough but caring. You call out procrastination, push users to their limits, and don't accept excuses. You're motivational but firm. You celebrate wins but expect consistent effort.`,
};

export class GhostAI {
  private apiKey: string;
  private provider: 'openai' | 'groq';
  private model: string;

  constructor() {
    // Use Groq by default (faster and cheaper), fallback to OpenAI
    this.provider = process.env.GROQ_API_KEY ? 'groq' : 'openai';
    this.apiKey = (this.provider === 'groq' 
      ? process.env.GROQ_API_KEY 
      : process.env.OPENAI_API_KEY) || '';
    this.model = this.provider === 'groq' 
      ? 'llama-3.3-70b-versatile'  // Fast and smart
      : 'gpt-4o-mini';  // Cost-effective
  }

  async chat(
    messages: AIMessage[],
    personality: string = 'chill',
    temperature: number = 0.8
  ): Promise<AIResponse> {
    const systemPrompt = GHOST_PERSONALITIES[personality as keyof typeof GHOST_PERSONALITIES] || GHOST_PERSONALITIES.chill;

    const fullMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages,
    ];

    try {
      if (this.provider === 'groq') {
        return await this.groqChat(fullMessages, temperature);
      } else {
        return await this.openaiChat(fullMessages, temperature);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      throw new Error('Failed to get response from Ghost AI');
    }
  }

  private async groqChat(messages: AIMessage[], temperature: number): Promise<AIResponse> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      message: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  private async openaiChat(messages: AIMessage[], temperature: number): Promise<AIResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      message: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  // Specialized Ghost functions

  async analyzeScreenshot(imageDescription: string, context: string = ''): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'user',
        content: `Analyze this screenshot/image: ${imageDescription}\n\nContext: ${context}\n\nProvide insights on: red flags, hidden meanings, tone, and recommendations.`
      }
    ];

    const response = await this.chat(messages, 'chill', 0.7);
    return response.message;
  }

  async solveHomework(problem: string, subject: string): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'user',
        content: `Subject: ${subject}\n\nProblem: ${problem}\n\nProvide a step-by-step solution with explanations. Make it easy to understand for a student.`
      }
    ];

    const response = await this.chat(messages, 'productive', 0.5);
    return response.message;
  }

  async analyzeBusinessIdea(idea: string): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'user',
        content: `Business idea: ${idea}\n\nProvide:\n1. SWOT analysis\n2. Target market\n3. Potential challenges\n4. Revenue ideas\n5. First steps to launch`
      }
    ];

    const response = await this.chat(messages, 'productive', 0.7);
    return response.message;
  }

  async detectCryptoScam(contractAddress: string, description: string): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'user',
        content: `Crypto analysis:\nContract: ${contractAddress}\nDescription: ${description}\n\nAnalyze for: scam indicators, red flags, rug pull risks, and safety score (1-10).`
      }
    ];

    const response = await this.chat(messages, 'silent', 0.3);
    return response.message;
  }

  async generateFlashcards(notes: string): Promise<{ question: string; answer: string }[]> {
    const messages: AIMessage[] = [
      {
        role: 'user',
        content: `Generate 5 flashcards from these notes:\n\n${notes}\n\nFormat as JSON array: [{"question": "...", "answer": "..."}]`
      }
    ];

    const response = await this.chat(messages, 'productive', 0.5);
    try {
      return JSON.parse(response.message);
    } catch {
      return [];
    }
  }
}

export const ghostAI = new GhostAI();