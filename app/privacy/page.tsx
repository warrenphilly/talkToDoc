"use client";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

export default function PrivacyPolicy() {
  const router = useRouter();
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-16">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 sm:h-5 w-4 sm:w-5" />
              <span className="text-sm sm:text-base lg:text-lg font-medium">
                Back
              </span>
            </button>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Image
              src="/trueLogo.svg"
              alt="Logo"
              width={120}
              height={40}
              className="w-20 sm:w-24 md:w-28 lg:w-32 h-auto"
              priority
            />
            <Separator
              orientation="vertical"
              className="h-4 sm:h-6 bg-slate-200"
            />
            <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-700">
              Privacy Policy
            </h1>
          </div>
        </div>
      </header>

      <main className="h-[99%] pt-16 sm:pt-20 pb-8 px-4 sm:px-6 bg-slate-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <div className="p-2 rounded-full bg-[#94b347]/10">
              <Shield className="h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 text-[#94b347]" />
            </div>
            <h2 className="text-lg sm:text-2xl md:text-3xl font-semibold text-slate-700">
              Privacy Policy
            </h2>
          </div>

          <div className="space-y-4 sm:space-y-6 md:space-y-8 text-slate-600">
            <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg md:text-xl font-semibold mb-4 text-[#94b347]">
                1. Information We Collect
              </h2>
              <p className="leading-relaxed mb-4">
                We collect information that you provide directly to us,
                including but not limited to:
              </p>
              <ul className="list-none space-y-2">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#94b347]"></div>
                  <span>Account information (name, email address)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#94b347]"></div>
                  <span>Usage data and preferences</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#94b347]"></div>
                  <span>Communication data when you contact us</span>
                </li>
              </ul>
            </section>

            <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg md:text-xl font-semibold mb-4 text-[#94b347]">
                2. How We Use Your Information
              </h2>
              <p className="leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-none space-y-2">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#94b347]"></div>
                  <span>Provide and maintain our services</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#94b347]"></div>
                  <span>Improve and personalize your experience</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#94b347]"></div>
                  <span>Communicate with you about updates and changes</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#94b347]"></div>
                  <span>Ensure security and prevent fraud</span>
                </li>
              </ul>
            </section>

            <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg md:text-xl font-semibold mb-4 text-[#94b347]">
                3. Data Security
              </h2>
              <p className="leading-relaxed">
                We implement appropriate technical and organizational measures
                to protect your personal information against unauthorized
                access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg md:text-xl font-semibold mb-4 text-[#94b347]">
                4. Cookies and Tracking
              </h2>
              <p className="leading-relaxed">
                We use cookies and similar tracking technologies to track
                activity on our website and hold certain information. You can
                instruct your browser to refuse all cookies or to indicate when
                a cookie is being sent.
              </p>
            </section>

            <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg md:text-xl font-semibold mb-4 text-[#94b347]">
                5. Third-Party Services
              </h2>
              <p className="leading-relaxed">
                We may employ third-party companies and individuals to
                facilitate our service, provide service on our behalf, perform
                service-related services, or assist us in analyzing how our
                service is used.
              </p>
            </section>

            <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg md:text-xl font-semibold mb-4 text-[#94b347]">
                6. Your Rights
              </h2>
              <p className="leading-relaxed mb-4">You have the right to:</p>
              <ul className="list-none space-y-2">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#94b347]"></div>
                  <span>Access your personal data</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#94b347]"></div>
                  <span>Correct inaccurate data</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#94b347]"></div>
                  <span>Request deletion of your data</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#94b347]"></div>
                  <span>Object to our processing of your data</span>
                </li>
              </ul>
            </section>

            <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg md:text-xl font-semibold mb-4 text-[#94b347]">
                7. Changes to This Policy
              </h2>
              <p className="leading-relaxed">
                We may update our Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page and updating the "last updated" date.
              </p>
            </section>

            <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg md:text-xl font-semibold mb-4 text-[#94b347]">
                8. Contact Us
              </h2>
              <p className="leading-relaxed">
                If you have any questions about this Privacy Policy, please
                contact us.
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
