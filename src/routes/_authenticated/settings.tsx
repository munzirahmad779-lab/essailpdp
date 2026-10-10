import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, CheckCircle2, XCircle, HelpCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { GROQ_DEFAULT_MODEL, GROQ_MODELS, normalizeGroqModel } from "@/lib/ai-models";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Pengaturan AI — Wawancara LPDP" },
      { name: "description", content: "Kelola penyedia AI dan model untuk latihan wawancara LPDP." },
      { property: "og:title", content: "Pengaturan AI — Wawancara LPDP" },
      { property: "og:description", content: "Kelola penyedia AI dan model untuk latihan wawancara LPDP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const PROVIDERS = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    badge: "Rekomendasi Utama",
    models: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
    defaultModel: "gemini-2.0-flash",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    authHeader: "Authorization",
  },
  groq: {
    id: "groq",
    name: "Groq",
    badge: "Tercepat",
    models: GROQ_MODELS,
    defaultModel: GROQ_DEFAULT_MODEL,
    baseUrl: "https://api.groq.com/openai/v1",
    authHeader: "Authorization",
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    badge: "Cadangan Gratis",
    models: ["deepseek/deepseek-r1:free", "google/gemini-2.0-pro-exp-02-05:free"],
    defaultModel: "deepseek/deepseek-r1:free",
    baseUrl: "https://openrouter.ai/api/v1",
    authHeader: "Authorization",
  },
};

function SettingsPage() {
  const [selectedProvider, setSelectedProvider] = useState("gemini");
  const [keys, setKeys] = useState({
    gemini: "",
    groq: "",
    openrouter: "",
  });
  const [models, setModels] = useState({
    gemini: PROVIDERS.gemini.defaultModel,
    groq: PROVIDERS.groq.defaultModel,
    openrouter: PROVIDERS.openrouter.defaultModel,
  });
  const [showKey, setShowKey] = useState({
    gemini: false,
    groq: false,
    openrouter: false,
  });
  const [testStatus, setTestStatus] = useState<Record<string, "untested" | "valid" | "invalid" | "testing">>({
    gemini: "untested",
    groq: "untested",
    openrouter: "untested",
  });

  useEffect(() => {
    const savedProvider = localStorage.getItem("selected_provider");
    if (savedProvider && PROVIDERS[savedProvider as keyof typeof PROVIDERS]) {
      setSelectedProvider(savedProvider);
    }
    
    setKeys({
      gemini: localStorage.getItem("gemini_api_key") || "",
      groq: localStorage.getItem("groq_api_key") || "",
      openrouter: localStorage.getItem("openrouter_api_key") || "",
    });

    const groqModel = normalizeGroqModel(localStorage.getItem("groq_model"));
    localStorage.setItem("groq_model", groqModel);
    setModels({
      gemini: localStorage.getItem("gemini_model") || PROVIDERS.gemini.defaultModel,
      groq: groqModel,
      openrouter: localStorage.getItem("openrouter_model") || PROVIDERS.openrouter.defaultModel,
    });
  }, []);

  const handleSave = () => {
    localStorage.setItem("selected_provider", selectedProvider);
    localStorage.setItem("gemini_api_key", keys.gemini);
    localStorage.setItem("groq_api_key", keys.groq);
    localStorage.setItem("openrouter_api_key", keys.openrouter);
    localStorage.setItem("gemini_model", models.gemini);
    localStorage.setItem("groq_model", models.groq);
    localStorage.setItem("openrouter_model", models.openrouter);
    toast.success("Pengaturan berhasil disimpan", {
      description: "API Key dan preferensi model telah disimpan di browser Anda.",
    });
  };

  const testConnection = async (providerId: keyof typeof PROVIDERS) => {
    const key = keys[providerId];
    if (!key) {
      toast.error("API Key kosong", { description: "Silakan isi API Key terlebih dahulu." });
      return;
    }

    setTestStatus((prev) => ({ ...prev, [providerId]: "testing" }));
    const providerConfig = PROVIDERS[providerId];
    
    try {
      const provider = createOpenAICompatible({
        name: providerId,
        baseURL: providerConfig.baseUrl,
        headers: { Authorization: `Bearer ${key}` },
      });
      
      await generateText({
        model: provider(models[providerId]),
        prompt: "Hello, just testing the connection. Reply with exactly 'OK'.",
        maxOutputTokens: 5,
      });

      setTestStatus((prev) => ({ ...prev, [providerId]: "valid" }));
      toast.success("Koneksi berhasil", { description: `API Key ${providerConfig.name} valid.` });
    } catch (error) {
      console.error(error);
      setTestStatus((prev) => ({ ...prev, [providerId]: "invalid" }));
      toast.error("Koneksi gagal", { description: "API Key tidak valid atau model tidak tersedia." });
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-primary">Pengaturan API</h1>
        <p className="text-muted-foreground mt-2">
          Konfigurasi penyedia AI (Provider) untuk simulasi wawancara Anda. Data disimpan secara lokal di browser.
        </p>
      </div>

      <Card className="shadow-sm">
        <Tabs value={selectedProvider} onValueChange={setSelectedProvider}>
          <CardHeader className="border-b bg-muted/20 pb-0">
            <TabsList className="w-full justify-start rounded-none border-b-0 bg-transparent p-0">
              {Object.values(PROVIDERS).map((p) => (
                <TabsTrigger
                  key={p.id}
                  value={p.id}
                  className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-3 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span>{p.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {p.badge}
                    </span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
          </CardHeader>
          <CardContent className="pt-6">
            {Object.values(PROVIDERS).map((p) => (
              <TabsContent key={p.id} value={p.id} className="mt-0 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${p.id}-key`}>API Key</Label>
                    <div className="relative">
                      <Input
                        id={`${p.id}-key`}
                        type={showKey[p.id as keyof typeof showKey] ? "text" : "password"}
                        value={keys[p.id as keyof typeof keys]}
                        onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder={`Masukkan API Key ${p.name}`}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((prev) => ({ ...prev, [p.id]: !prev[p.id as keyof typeof prev] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showKey[p.id as keyof typeof showKey] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${p.id}-model`}>Model</Label>
                    <Select
                      value={models[p.id as keyof typeof models]}
                      onValueChange={(val) => setModels((prev) => ({ ...prev, [p.id]: val }))}
                    >
                      <SelectTrigger id={`${p.id}-model`}>
                        <SelectValue placeholder="Pilih model" />
                      </SelectTrigger>
                      <SelectContent>
                        {p.models.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      {testStatus[p.id] === "untested" && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <HelpCircle className="h-4 w-4" /> Belum di-test
                        </span>
                      )}
                      {testStatus[p.id] === "testing" && (
                        <span className="flex items-center gap-1 text-blue-500">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />{" "}
                          Menguji...
                        </span>
                      )}
                      {testStatus[p.id] === "valid" && (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" /> Valid
                        </span>
                      )}
                      {testStatus[p.id] === "invalid" && (
                        <span className="flex items-center gap-1 text-destructive">
                          <XCircle className="h-4 w-4" /> Invalid
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => testConnection(p.id as keyof typeof PROVIDERS)}
                      disabled={testStatus[p.id] === "testing" || !keys[p.id as keyof typeof keys]}
                    >
                      Test Koneksi
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ))}
          </CardContent>
          <CardFooter className="flex justify-end border-t bg-muted/20 px-6 py-4">
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Simpan Pengaturan
            </Button>
          </CardFooter>
        </Tabs>
      </Card>
    </div>
  );
}
