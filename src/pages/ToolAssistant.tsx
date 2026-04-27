import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, Bot, Calculator, Scale, AlertTriangle, ShieldAlert, Activity, GitCompare, Layers, Info } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

const TOOLS_CONFIG: Record<string, { title: string; prompt: string; placeholder: string; icon: any; color: string; bg: string; disclaimer?: string }> = {
  'half-life-calculator': {
    title: 'Half-Life Calculator',
    prompt: 'You are an expert pharmacologist. Calculate the half-life and remaining concentration of the following substance over time based on the user input. Provide a clear, structured breakdown.',
    placeholder: 'e.g., I took 200mg of Caffeine 4 hours ago. How much is left?',
    icon: Calculator,
    color: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10'
  },
  'dosage-calculator': {
    title: 'Dosage Calculator',
    prompt: 'You are an expert medical assistant. Help calculate the appropriate dosage based on the user\'s weight, age, and the substance they are asking about. Always include a disclaimer that this is not medical advice.',
    placeholder: 'e.g., What is the recommended dosage of Creatine for a 180lb male?',
    icon: Scale,
    color: 'text-emerald-500 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10'
  },
  'interaction-checker': {
    title: 'Interaction Checker',
    prompt: 'You are an expert toxicologist and pharmacist. Check for potential interactions between the following substances. Highlight severe interactions in bold and explain the mechanism if possible.',
    placeholder: 'e.g., Can I take Ashwagandha with SSRIs?',
    icon: AlertTriangle,
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10'
  },
  'legality-checker': {
    title: 'Legality Checker',
    prompt: 'You are an expert in international drug laws and sports anti-doping regulations (WADA). Provide the legal status and sports ban status of the following substance in major regions (US, UK, EU, Australia).',
    placeholder: 'e.g., Is BPC-157 legal in the US and allowed by WADA?',
    icon: ShieldAlert,
    color: 'text-red-500 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-500/10',
    disclaimer: 'Legal Disclaimer: The information provided by this tool is for educational purposes only and does not constitute legal advice. Laws and regulations change frequently. Always consult with a qualified legal professional or official regulatory bodies regarding the legality of any substance in your jurisdiction.'
  },
  'risk-score-generator': {
    title: 'Risk Score Generator',
    prompt: 'You are a harm reduction expert. Generate a risk score (1-10) for the following substance or stack. Break down the risks into categories: Cardiovascular, Neurological, Hepatic, and Psychological. Provide mitigation strategies.',
    placeholder: 'e.g., What is the risk score for a cycle of RAD-140?',
    icon: Activity,
    color: 'text-orange-500 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    disclaimer: 'Medical Disclaimer: The risk scores and information provided are for educational and harm-reduction purposes only. This is not medical advice. Always consult with a healthcare professional before starting any new supplement, compound, or protocol.'
  },
  'substance-comparison-tool': {
    title: 'Substance Comparison Tool',
    prompt: 'You are an expert pharmacologist and supplement analyst. Compare the following substances. Analyze their mechanisms of action, primary benefits, side effects, half-lives, and typical use cases. Highlight key differences and similarities.',
    placeholder: 'e.g., Compare Ashwagandha vs Rhodiola Rosea for stress relief.',
    icon: GitCompare,
    color: 'text-pink-500 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-500/10'
  },
  'brand-comparison-tool': {
    title: 'Brand Comparison Tool',
    prompt: 'You are an expert in supplement quality and third-party testing. Compare the following brands for the specified supplement. Consider factors like price per serving, third-party testing, bioavailability, and inactive ingredients.',
    placeholder: 'e.g., Compare Nootropics Depot vs Thorne for Magnesium Glycinate.',
    icon: GitCompare,
    color: 'text-indigo-500 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10'
  },
  'stack-comparison-tool': {
    title: 'Stack Comparison Tool',
    prompt: 'You are an expert in nootropics and performance enhancement. Compare the following two stacks. Analyze their synergistic effects, potential redundancies, and overall effectiveness for the user\'s goal.',
    placeholder: 'e.g., Compare Stack A (Caffeine + L-Theanine) vs Stack B (Modafinil) for studying.',
    icon: Layers,
    color: 'text-violet-500 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-500/10'
  }
};

export default function ToolAssistant() {
  const { toolId } = useParams<{ toolId: string }>();
  const navigate = useNavigate();
  const config = toolId ? TOOLS_CONFIG[toolId] : null;

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!config) {
    return <div className="p-8 text-center">Tool not found</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key is missing. Please set it in your environment variables.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMessage,
        config: {
          systemInstruction: config.prompt,
        }
      });

      if (response.text) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.text }]);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error processing your request. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
          <ArrowLeft size={20} className="text-slate-700 dark:text-zinc-300" />
        </button>
        <div className="flex items-center gap-2">
          <config.icon size={20} className={config.color} />
          <h1 className="text-lg font-bold">{config.title}</h1>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full space-y-6">
        {config.disclaimer && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-800 dark:text-amber-200 text-sm mb-4">
            <Info size={18} className="shrink-0 mt-0.5" />
            <p>{config.disclaimer}</p>
          </div>
        )}
        
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-slate-500 dark:text-zinc-400 mt-10">
            <div className={cn("h-16 w-16 rounded-full flex items-center justify-center", config.bg, config.color)}>
              <config.icon size={32} />
            </div>
            <p className="max-w-md">
              I am the {config.title} assistant. Describe what you need help with below.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
              <div className={cn(
                "h-8 w-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm",
                msg.role === 'user' ? "bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300" : cn(config.bg, config.color)
              )}>
                {msg.role === 'user' ? 'U' : <config.icon size={16} />}
              </div>
              <div className={cn(
                "px-4 py-3 rounded-2xl max-w-[85%]",
                msg.role === 'user' 
                  ? "bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 rounded-tr-sm" 
                  : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-300 rounded-tl-sm shadow-sm"
              )}>
                {msg.role === 'user' ? (
                  <p className="text-sm">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-100 dark:prose-pre:bg-zinc-950">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3">
            <div className={cn("h-8 w-8 shrink-0 rounded-full flex items-center justify-center", config.bg, config.color)}>
              <config.icon size={16} />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-tl-sm shadow-sm flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-emerald-500" />
              <span className="text-sm text-slate-500 dark:text-zinc-400">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 md:bottom-0 z-30 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={config.placeholder}
            className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all shadow-sm text-slate-900 dark:text-zinc-100"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-[46px] w-[46px] shrink-0 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
          >
            <Send size={18} className={cn(input.trim() && !isLoading ? "translate-x-0.5 -translate-y-0.5 transition-transform" : "")} />
          </button>
        </form>
      </div>
    </div>
  );
}
