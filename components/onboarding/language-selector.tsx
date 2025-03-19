import { Check, ChevronDown, Loader2, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateUserLanguage } from "@/lib/firebase/firestore";
import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Language {
  code: string;
  name: string;
  flag: string;
  nativeName?: string;
}

interface LanguageSelectorProps {
  userId: string;
  onComplete?: () => void;
}

export default function LanguageSelector({ userId, onComplete }: LanguageSelectorProps) {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedView, setSelectedView] = useState<"dropdown" | "grid">("grid");
  
  const languages: Language[] = [
    { code: "en", name: "English", flag: "🇺🇸", nativeName: "English" },
    { code: "es", name: "Spanish", flag: "🇪🇸", nativeName: "Español" },
    { code: "fr", name: "French", flag: "🇫🇷", nativeName: "Français" },
    { code: "de", name: "German", flag: "🇩🇪", nativeName: "Deutsch" },
    { code: "zh", name: "Chinese", flag: "🇨🇳", nativeName: "中文" },
    { code: "ja", name: "Japanese", flag: "🇯🇵", nativeName: "日本語" },
    { code: "ko", name: "Korean", flag: "🇰🇷", nativeName: "한국어" },
    { code: "ar", name: "Arabic", flag: "🇸🇦", nativeName: "العربية" },
    { code: "hi", name: "Hindi", flag: "🇮🇳", nativeName: "हिन्दी" },
    { code: "pt", name: "Portuguese", flag: "🇧🇷", nativeName: "Português" },
  ];

  const handleSave = async () => {
    if (!userId) return;
    
    try {
      setIsSaving(true);
      await updateUserLanguage(userId, selectedLanguage);
      
      if (onComplete) {
        onComplete();
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error("Failed to save language preference:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getSelectedLanguageInfo = () => {
    return languages.find(lang => lang.code === selectedLanguage);
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-4 w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-center mb-4">
        <Globe className="text-[#94b347] h-10 w-10 mr-3" />
        <h2 className="text-xl font-semibold text-slate-800">Choose your preferred language</h2>
      </div>

      <div className="w-full">
        <div className="flex justify-end mb-4">
          <div className="flex p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setSelectedView("dropdown")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedView === "dropdown" 
                  ? "bg-white shadow-sm text-slate-800" 
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Dropdown
            </button>
            <button
              onClick={() => setSelectedView("grid")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedView === "grid" 
                  ? "bg-white shadow-sm text-slate-800" 
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Grid
            </button>
          </div>
        </div>

        {selectedView === "dropdown" && (
          <div className="mb-8">
            <p className="text-sm text-slate-600 mb-4">
              Select the language you'd like to use with GammaNotes.
            </p>
            
            <Select
              value={selectedLanguage}
              onValueChange={(value) => setSelectedLanguage(value)}
            >
              <SelectTrigger className="w-full border-gray-200 focus:ring-[#94b347] focus:border-[#94b347] h-12">
                {selectedLanguage ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getSelectedLanguageInfo()?.flag}</span>
                    <span>{getSelectedLanguageInfo()?.name}</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Select a language" />
                )}
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {languages.map((language) => (
                  <SelectItem 
                    key={language.code} 
                    value={language.code}
                  >
                    <div className="flex items-center gap-2 py-1">
                      <span className="text-lg">{language.flag}</span>
                      <div>
                        <div>{language.name}</div>
                        <div className="text-xs text-slate-500">{language.nativeName}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedView === "grid" && (
          <div className="mb-8">
            <RadioGroup 
              value={selectedLanguage} 
              onValueChange={setSelectedLanguage}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3"
            >
              {languages.map((language) => (
                <div key={language.code} className="relative">
                  <RadioGroupItem
                    value={language.code}
                    id={`language-${language.code}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`language-${language.code}`}
                    className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg cursor-pointer transition-all hover:border-[#94b347]/50 hover:bg-[#94b347]/5 peer-checked:border-[#94b347] peer-checked:bg-[#94b347]/10"
                  >
                    <span className="text-3xl">{language.flag}</span>
                    <div className="text-center">
                      <div className="font-medium text-sm">{language.name}</div>
                      <div className="text-xs text-slate-500">{language.nativeName}</div>
                    </div>
                    <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-[#94b347] opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}
      </div>
      
      <Button 
        onClick={handleSave}
        disabled={isSaving}
        className="bg-[#94b347] hover:bg-[#b0ba93] text-white font-medium px-8 py-2 h-12 rounded-lg transition-colors w-full sm:w-auto"
      >
        {isSaving ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Continue to GammaNotes
            <Check className="h-4 w-4" />
          </span>
        )}
      </Button>
    </div>
  );
} 