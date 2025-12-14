// Enhanced Groq AI Client with Vision, Streaming, and Rate Limiting

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: any }>;
}

interface AIResponse {
  message: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Ghost personality prompts optimized for LLaMA 3.3
export const GROQ_GHOST_PERSONALITIES = {
  chill: `You are Ghost 👻, a chill Gen-Z AI companion. Keep responses under 3 sentences unless asked for more. Use natural slang. Be encouraging but real. No corporate speak. If something's off, say it straight up.`,
  
  productive: `You are Ghost 👻, a no-BS productivity coach. Give direct, actionable advice in 2-3 sentences max. Use bullet points when needed. Cut the fluff. Help users ship, not procrastinate.`,
  
  funny: `You are Ghost 👻, a funny Gen-Z AI with meme energy. Use internet humor naturally. Keep it light but helpful. Roast when appropriate. 2-3 sentences, make it fun.`,
  
  silent: `You are Ghost 👻, a minimal AI. Maximum wisdom, minimum words. 1-2 sentences. Pure value, zero filler. Think Hemingway but Gen-Z.`,
  
  coach: `You are Ghost 👻, a strict accountability coach. Call out BS. Push hard but fair. No sugarcoating. If they're slacking, tell them. 2-3 firm sentences.`,
};

class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequest = 0;
  private minDelay = 2000; // 2 seconds between requests (30/min = safe)

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    
    // Wait for rate limit
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.minDelay) {
      await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastRequest));
    }

    const task = this.queue.shift();
    if (task) {
      this.lastRequest = Date.now();
      await task();
    }

    this.processQueue();
  }
}

export class GroqAI {
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1';
  private chatModel = 'llama-3.3-70b-versatile';
  private visionModel = 'llama-3.2-90b-vision-preview';
  private toolModel = 'llama-3-groq-70b-8192-tool-use-preview';
  private rateLimiter = new RateLimiter();

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY not found in environment');
    }
  }

  // ============================================
  // STANDARD CHAT (Fast)
  // ============================================
  async chat(
    messages: AIMessage[],
    personality: string = 'chill',
    temperature: number = 0.8
  ): Promise<AIResponse> {
    return this.rateLimiter.execute(async () => {
      const systemPrompt = GROQ_GHOST_PERSONALITIES[personality as keyof typeof GROQ_GHOST_PERSONALITIES] 
        || GROQ_GHOST_PERSONALITIES.chill;

      const fullMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages,
      ];

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.chatModel,
            messages: fullMessages,
            temperature,
            max_tokens: 1000,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Groq API error: ${response.status} - ${error}`);
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
      } catch (error) {
        console.error('Groq chat error:', error);
        throw new Error('Failed to get response from Ghost AI');
      }
    });
  }

  // ============================================
  // STREAMING CHAT (Real-time Ghost responses)
  // ============================================
  async chatStream(
    messages: AIMessage[],
    personality: string = 'chill',
    onChunk: (text: string) => void
  ): Promise<void> {
    return this.rateLimiter.execute(async () => {
      const systemPrompt = GROQ_GHOST_PERSONALITIES[personality as keyof typeof GROQ_GHOST_PERSONALITIES] 
        || GROQ_GHOST_PERSONALITIES.chill;

      const fullMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages,
      ];

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.chatModel,
            messages: fullMessages,
            temperature: 0.8,
            max_tokens: 1000,
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`Groq API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No response body');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content;
                if (content) {
                  onChunk(content);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (error) {
        console.error('Groq streaming error:', error);
        throw error;
      }
    });
  }

  // ============================================
  // VISION ANALYSIS (Screenshot/Image)
  // ============================================
  async analyzeImage(
    imageBase64: string,
    prompt: string,
    context?: string
  ): Promise<string> {
    return this.rateLimiter.execute(async () => {
      const systemPrompt = `You are Ghost 👻, analyzing images for red flags, patterns, and insights. Be direct and honest. Keep analysis under 5 sentences unless critical details need explaining.`;

      const userPrompt = context 
        ? `${prompt}\n\nContext: ${context}`
        : prompt;

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.visionModel,
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: [
                  { type: 'text', text: userPrompt },
                  { 
                    type: 'image_url', 
                    image_url: { 
                      url: `data:image/jpeg;base64,${imageBase64}` 
                    }
                  }
                ]
              }
            ],
            temperature: 0.7,
            max_tokens: 1500,
          }),
        });

        if (!response.ok) {
          throw new Error(`Groq Vision API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
      } catch (error) {
        console.error('Groq vision error:', error);
        throw new Error('Failed to analyze image');
      }
    });
  }

  // ============================================
  // STRUCTURED OUTPUT (Tasks, Quizzes)
  // ============================================
  async generateStructured<T>(
    prompt: string,
    schema: any
  ): Promise<T> {
    return this.rateLimiter.execute(async () => {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.toolModel, // Better for structured output
            messages: [
              {
                role: 'system',
                content: 'You are a helpful AI that generates valid JSON responses. Output ONLY valid JSON, no other text.'
              },
              {
                role: 'user',
                content: `${prompt}\n\nGenerate JSON matching this schema: ${JSON.stringify(schema)}`
              }
            ],
            temperature: 0.5,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          throw new Error(`Groq API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Clean response (remove markdown if present)
        const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleaned) as T;
      } catch (error) {
        console.error('Groq structured generation error:', error);
        throw error;
      }
    });
  }

  // ============================================
  // SPECIALIZED FUNCTIONS
  // ============================================

  async generateTasks(userContext: any): Promise<any[]> {
    const prompt = `Given this user context: ${JSON.stringify(userContext)}
    
Generate 3-5 personalized daily tasks. Focus on:
- Their primary goal (${userContext.primaryGoal})
- Main struggle (${userContext.mainStruggle})
- Recent activity patterns

Keep tasks specific, actionable, and realistic.`;

    const schema = {
      tasks: [{
        title: 'string',
        description: 'string',
        category: 'study|business|personal',
        priority: 'low|medium|high',
        reasoning: 'string'
      }]
    };

    return this.generateStructured<{ tasks: any[] }>(prompt, schema)
      .then(result => result.tasks);
  }

  async generateQuiz(subject: string, topic: string, difficulty: string): Promise<any[]> {
    const prompt = `Generate 5 ${difficulty} quiz questions about ${topic} in ${subject}.`;

    const schema = {
      questions: [{
        question: 'string',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'string',
        explanation: 'string',
        topic: 'string'
      }]
    };

    return this.generateStructured<{ questions: any[] }>(prompt, schema)
      .then(result => result.questions);
  }

  async analyzeStudySession(sessionData: any): Promise<string> {
    const messages: AIMessage[] = [{
      role: 'user',
      content: `Analyze this study session: ${JSON.stringify(sessionData)}
      
Give brief feedback on:
1. Focus quality
2. Time management
3. One improvement tip

Keep it under 4 sentences.`
    }];

    const response = await this.chat(messages, 'coach', 0.7);
    return response.message;
  }
}

export const groqAI = new GroqAI();