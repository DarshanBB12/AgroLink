import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Bot,
  Brain,
  Sparkles,
  Send,
  Loader2,
  TrendingUp,
  TrendingDown,
  Sprout,
  HelpCircle,
  AlertTriangle,
  MapPin,
  Search,
  CheckCircle2,
  Languages,
  DollarSign,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { PageHeader } from "@/components/common/StateViews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import api, { getErrorMessage } from "@/lib/api";
import { toast } from "sonner";

interface AssistantResponse {
  query: string;
  language: "en" | "kn";
  topic: string;
  answer: string;
  relatedTopics: string[];
  disclaimer: string;
}

interface CropRecommendation {
  name: string;
  knName: string;
  category: string;
  matchScore: number;
  durationDays: string;
  expectedYield: string;
  fertilizerPlan: string;
  waterRequirement: string;
  commonRisks: string;
  economicOutlook: string;
}

interface MarketPrice {
  id: string;
  commodity: string;
  variety: string;
  market: string;
  state: string;
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
  unit: string;
  weeklyTrendPercent: number;
  trendDirection: "up" | "down";
  arrivalsTons: number;
  date: string;
}

const QUICK_PROMPTS_EN = [
  "How to manage blast disease in ragi?",
  "Paddy stem borer biological control",
  "Balanced NPK dosage for maize",
  "Tomato leaf curl virus prevention",
  "Water management in dry season",
];

const QUICK_PROMPTS_KN = [
  "ರಾಗಿ ಬೆಳೆಗೆ ಯಾವ ಗೊಬ್ಬರ ಉತ್ತಮ?",
  "ಭತ್ತದಲ್ಲಿ ಬೆಂಕಿ ರೋಗ ತಡೆಗಟ್ಟುವುದು ಹೇಗೆ?",
  "ಮುಸುಕಿನ ಜೋಳದ ಲದ್ದಿ ಹುಳು ಹತೋಟಿ",
  "ಟೊಮೆಟೊ ಎಲೆ ಮುದುರು ರೋಗ ನಿಯಂತ್ರಣ",
  "ಹನಿ ನೀರಾವರಿ ಪದ್ಧತಿ ಪ್ರಯೋಜನಗಳು",
];

export const AiAssistantPage = ({ role: initialRole }: { role?: "farmer" | "worker" | "admin" | "owner" } = {}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const role = initialRole || ((user?.role === "equipment_owner" ? "owner" : user?.role || "farmer") as "farmer" | "worker" | "admin" | "owner");

  // Tab State
  const [activeTab, setActiveTab] = useState<"chat" | "crop" | "market">("chat");

  // Chat State
  const [chatLanguage, setChatLanguage] = useState<"en" | "kn">("en");
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<AssistantResponse[]>([]);

  // Crop Recommendation Form State
  const [soilType, setSoilType] = useState("red_loam");
  const [season, setSeason] = useState("kharif");
  const [water, setWater] = useState("moderate");
  const [farmSize, setFarmSize] = useState("3 acres");

  // Market Search
  const [mandiSearch, setMandiSearch] = useState("");

  // Chat Mutation
  const chatMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await api.post("/ai/assistant", { query: q, language: chatLanguage });
      return res.data.data as AssistantResponse;
    },
    onSuccess: (data) => {
      setChatHistory((prev) => [data, ...prev]);
      setQuery("");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  // Crop Recommendation Mutation
  const cropMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/ai/crop-recommend", {
        soilType,
        season,
        waterAvailability: water,
        farmSize,
      });
      return res.data.data as { recommendations: CropRecommendation[]; dataLimitations: string };
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  // Market Prices Query
  const marketQuery = useQuery({
    queryKey: ["mandi-prices", mandiSearch],
    queryFn: async () => {
      const res = await api.get("/ai/market-prices", { params: { q: mandiSearch } });
      return res.data.data as { commodities: MarketPrice[]; source: string; lastUpdated: string };
    },
  });

  const handleSend = (textToSend?: string) => {
    const q = (textToSend || query).trim();
    if (!q || chatMutation.isPending) return;
    chatMutation.mutate(q);
  };

  const handleRecommend = (e: React.FormEvent) => {
    e.preventDefault();
    cropMutation.mutate();
  };

  return (
    <DashboardLayout role={role}>
      <PageHeader
        title="AI Agricultural Intelligence"
        subtitle="Expert agronomic guidance, crop recommendations, and live APMC mandi commodity intelligence"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "crop" | "market")} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm">
            <Bot className="h-4 w-4" />
            <span>Farming Assistant</span>
          </TabsTrigger>
          <TabsTrigger value="crop" className="gap-1.5 text-xs sm:text-sm">
            <Sprout className="h-4 w-4" />
            <span>Crop Suggest</span>
          </TabsTrigger>
          <TabsTrigger value="market" className="gap-1.5 text-xs sm:text-sm">
            <DollarSign className="h-4 w-4" />
            <span>APMC Prices</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: AI FARMING ASSISTANT */}
        <TabsContent value="chat" className="space-y-6">
          <div className="agro-card p-6 border-primary/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    {chatLanguage === "kn" ? "ಕೃಷಿ ಜ್ಞಾನ ಸಹಾಯಕ (Bilingual AI)" : "Agronomic AI Advisory (Bilingual)"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {chatLanguage === "kn"
                      ? "ರಸಗೊಬ್ಬರ, ಬೆಳೆ ರೋಗಗಳು, ಕೀಟ ಹತೋಟಿ ಮತ್ತು ಸುಸ್ಥಿರ ಕೃಷಿ ಸಲಹೆಗಳನ್ನು ಪಡೆಯಿರಿ"
                      : "Pest diagnosis, NPK fertilizer dosing, crop health & soil management rules"}
                  </p>
                </div>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Language:</span>
                <div className="flex rounded-lg border border-border p-0.5 bg-muted">
                  <button
                    type="button"
                    onClick={() => setChatLanguage("en")}
                    className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
                      chatLanguage === "en" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatLanguage("kn")}
                    className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
                      chatLanguage === "kn" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    ಕನ್ನಡ (Kannada)
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Prompt Chips */}
            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>{chatLanguage === "kn" ? "ಸೂಚಿಸಲಾದ ಪ್ರಶ್ನೆಗಳು:" : "Suggested topics:"}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {(chatLanguage === "kn" ? QUICK_PROMPTS_KN : QUICK_PROMPTS_EN).map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(chip)}
                    className="rounded-full bg-muted/80 hover:bg-muted border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  chatLanguage === "kn"
                    ? "ನಿಮ್ಮ ಕೃಷಿ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ (ಉದಾ: ರಾಗಿ ಬೆಳೆಗೆ ಬೆಂಕಿ ರೋಗ)..."
                    : "Ask any agricultural question (e.g., NPK dosage for paddy, tomato leaf curl)..."
                }
                className="flex-1"
                disabled={chatMutation.isPending}
              />
              <Button type="submit" disabled={!query.trim() || chatMutation.isPending} className="gap-2">
                {chatMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>{chatLanguage === "kn" ? "ಕೇಳಿ" : "Ask"}</span>
              </Button>
            </form>
          </div>

          {/* Results List */}
          <div className="space-y-4">
            {chatHistory.map((item, idx) => (
              <div key={idx} className="agro-card p-6 border-l-4 border-l-emerald-500 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2">
                  <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{item.topic}</span>
                  </h4>
                  <Badge variant="outline" className="capitalize text-xs">
                    {item.language === "kn" ? "ಕನ್ನಡ" : "English"}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground italic">
                  Q: "{item.query}"
                </div>

                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {item.answer}
                </p>

                {item.relatedTopics?.length > 0 && (
                  <div className="pt-2 border-t border-border/40">
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                      {item.language === "kn" ? "ಸಂಬಂಧಿತ ವಿಷಯಗಳು:" : "Related advisories:"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.relatedTopics.map((rel, rIdx) => (
                        <button
                          key={rIdx}
                          type="button"
                          onClick={() => handleSend(rel)}
                          className="rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs px-2.5 py-1 font-medium transition-colors"
                        >
                          {rel} →
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground/75 italic pt-1">
                  {item.disclaimer}
                </p>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* TAB 2: SMART CROP RECOMMENDATION */}
        <TabsContent value="crop" className="space-y-6">
          <form onSubmit={handleRecommend} className="agro-card p-6 space-y-4">
            <div>
              <h3 className="font-bold text-base text-foreground">Agro-Climatic Crop Recommendation</h3>
              <p className="text-xs text-muted-foreground">
                Matches your soil type, season, and water capacity with regional agricultural university matrices.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Soil Type</label>
                <Select value={soilType} onValueChange={setSoilType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="red_loam">Red Sandy Loam (ಕೆಂಪು ಗೋಡು)</SelectItem>
                    <SelectItem value="black_clay">Black Cotton Soil (ಕಪ್ಪು ಮಣ್ಣು)</SelectItem>
                    <SelectItem value="clay">Clayey Puddled (ಜೇಡಿ ಮಣ್ಣು)</SelectItem>
                    <SelectItem value="red_sandy">Sandy Soil (ಮರಳು ಮಣ್ಣು)</SelectItem>
                    <SelectItem value="alluvial">Alluvial Loam (ಮೆಕ್ಕಲು ಮಣ್ಣು)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Season</label>
                <Select value={season} onValueChange={setSeason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kharif">Kharif (Monsoon / ಮುಂಗಾರು)</SelectItem>
                    <SelectItem value="rabi">Rabi (Winter / ಹಿಂಗಾರು)</SelectItem>
                    <SelectItem value="summer">Summer / Zaid (ಬೇಸಿಗೆ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Water Availability</label>
                <Select value={water} onValueChange={setWater}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Rainfed / Low (ಮಳೆ ಆಶ್ರಯ)</SelectItem>
                    <SelectItem value="moderate">Canal / Borewell (ಮಧ್ಯಮ ನೀರು)</SelectItem>
                    <SelectItem value="high">Abundant Water (ಸಮೃದ್ಧ ನೀರು)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Land Size</label>
                <Input value={farmSize} onChange={(e) => setFarmSize(e.target.value)} placeholder="e.g. 5 acres" />
              </div>
            </div>

            <Button type="submit" disabled={cropMutation.isPending} className="gap-2">
              {cropMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>Generate Suitability Recommendations</span>
            </Button>
          </form>

          {/* Recommendations Output */}
          {cropMutation.data && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-300 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
                <strong>Data Limitations:</strong> {cropMutation.data.dataLimitations}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cropMutation.data.recommendations.map((c, i) => (
                  <div key={i} className="agro-card p-5 space-y-3 border-t-4 border-t-primary">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-lg text-foreground">
                          {c.name} <span className="text-sm font-normal text-muted-foreground">({c.knName})</span>
                        </h4>
                        <Badge variant="outline" className="mt-1">{c.category}</Badge>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                          {c.matchScore}%
                        </span>
                        <p className="text-[10px] text-muted-foreground">Suitability Match</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-y border-border/60 py-2.5">
                      <div>
                        <span className="text-muted-foreground block">Crop Duration:</span>
                        <strong className="text-foreground">{c.durationDays}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Expected Yield:</span>
                        <strong className="text-foreground">{c.expectedYield}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Water Need:</span>
                        <strong className="text-foreground">{c.waterRequirement}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Economic Value:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400">{c.economicOutlook}</strong>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <p><strong className="text-foreground">Fertilizer Guide:</strong> {c.fertilizerPlan}</p>
                      <p><strong className="text-foreground">Watch For:</strong> {c.commonRisks}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: APMC MANDI COMMODITY MARKET PRICES */}
        <TabsContent value="market" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 agro-card p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={mandiSearch}
                onChange={(e) => setMandiSearch(e.target.value)}
                placeholder="Search commodity or mandi (e.g., Ragi, Raichur, Tomato)..."
                className="pl-9"
              />
            </div>
            <div className="text-xs text-muted-foreground shrink-0">
              Source: Agmarknet APMC Daily Bulletin
            </div>
          </div>

          {marketQuery.isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(marketQuery.data?.commodities || []).map((m) => (
                <div key={m.id} className="agro-card p-4 space-y-3 transition-all hover:border-primary/50">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <h4 className="font-bold text-base text-foreground">{m.commodity}</h4>
                      <p className="text-xs text-muted-foreground">{m.variety}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        m.trendDirection === "up"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-red-500/15 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {m.trendDirection === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {m.weeklyTrendPercent > 0 ? `+${m.weeklyTrendPercent}%` : `${m.weeklyTrendPercent}%`}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-foreground">₹{m.modalPrice.toLocaleString("en-IN")}</span>
                      <span className="text-xs text-muted-foreground">/ quintal</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Min: ₹{m.minPrice.toLocaleString("en-IN")} · Max: ₹{m.maxPrice.toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-2">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{m.market}</span>
                    </span>
                    <span className="shrink-0">{m.arrivalsTons}t arrival</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default AiAssistantPage;
