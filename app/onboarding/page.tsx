"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Cpu, CheckCircle, ChevronRight, Loader2, Brain, Target, PenTool, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUserByClerkId } from "@/lib/firebase/firestore";
import LanguageSelector from "@/components/onboarding/language-selector";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";

export default function OnboardingPage() {
  const router = useRouter();
  const { userId: clerkId, isLoaded } = useAuth();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initUser = async () => {
      try {
        if (!isLoaded) return;
        
        if (!clerkId) {
          router.push("/sign-in");
          return;
        }
        
        // Get Firestore user ID from Clerk ID
        const firestoreUser = await getUserByClerkId(clerkId);
        
        if (firestoreUser) {
          setUserId(firestoreUser.id);
        } else {
          console.error("User not found in Firestore");
          router.push("/sign-in");
          return;
        }
      } catch (error) {
        console.error("Error initializing user:", error);
      } finally {
        setLoading(false);
      }
    };
    
    initUser();
  }, [router, clerkId, isLoaded]);

  const handleCompleteStep = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      router.push("/dashboard");
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-[#e9ecef] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Cpu className="h-12 w-12 text-[#94b347] mb-4 animate-pulse" />
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-[#94b347] animate-spin" />
            <h2 className="text-lg text-slate-600">Setting up your account...</h2>
          </div>
        </div>
      </div>
    );
  }

  const features = [
    {
      title: "AI-Powered Notes",
      icon: Brain,
      description: "Create intelligent notes that adapt to your learning style"
    },
    {
      title: "Interactive Learning",
      icon: Target,
      description: "Test your knowledge with AI-generated quizzes"
    },
    {
      title: "PDF Intelligence",
      icon: FileText,
      description: "Extract and interact with content from any document"
    },
    {
      title: "Smart OCR",
      icon: PenTool,
      description: "Convert handwritten notes into digital documents"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-[#e9ecef] flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-64 bg-[#94b347]/10 rounded-b-full blur-3xl -z-10 transform-gpu"></div>
      
      <div className="max-w-3xl w-full">
        <div className="flex items-center justify-center mb-8">
          <Cpu className="h-10 w-10 text-[#94b347] mr-2" />
          <span className="font-semibold text-slate-800 text-2xl">GammaNotes</span>
        </div>
        
        <div className="mb-8">
          <div className="flex items-center justify-center mb-8">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-[#94b347] text-white' : 'bg-gray-200 text-gray-500'}`}
            >
              {step > 1 ? <CheckCircle className="h-5 w-5" /> : 1}
            </motion.div>
            <motion.div 
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className={`h-1 w-24 origin-left ${step >= 2 ? 'bg-[#94b347]' : 'bg-gray-200'}`}
            ></motion.div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-[#94b347] text-white' : 'bg-gray-200 text-gray-500'}`}
            >
              {step > 2 ? <CheckCircle className="h-5 w-5" /> : 2}
            </motion.div>
          </div>
          
          <motion.h1 
            key={`title-${step}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-2xl md:text-3xl font-bold text-center text-slate-800 mb-2"
          >
            {step === 1 ? 'Welcome to GammaNotes' : 'Choose Your Language'}
          </motion.h1>
          <motion.p 
            key={`subtitle-${step}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-center text-slate-600 max-w-md mx-auto"
          >
            {step === 1 
              ? 'Let\'s set up your account to get the best experience possible.'
              : 'Select your preferred language for a personalized experience.'}
          </motion.p>
        </div>
        
        <Card className="bg-white shadow-lg border-gray-100 rounded-xl overflow-hidden">
          <CardContent className="p-8">
            {step === 1 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-4">Your AI-powered learning companion</h2>
                  <p className="text-slate-600">
                    Transform how you learn and retain information with GammaNotes.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-[#94b347]/30 hover:bg-[#94b347]/5 transition-colors"
                    >
                      <div className="flex items-start">
                        <div className="bg-[#94b347]/10 rounded-lg p-2 mr-3">
                          <feature.icon className="h-5 w-5 text-[#94b347]" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-800 mb-1">{feature.title}</h3>
                          <p className="text-sm text-slate-600">{feature.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="flex justify-center pt-4"
                >
                  <Button 
                    onClick={handleCompleteStep}
                    className="bg-[#94b347] hover:bg-[#b0ba93] text-white px-8 py-6 h-12 rounded-lg flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              </motion.div>
            )}
            
            {step === 2 && userId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <LanguageSelector userId={userId} onComplete={handleCompleteStep} />
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 