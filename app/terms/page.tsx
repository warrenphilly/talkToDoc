"use client";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

export default function TermsOfService() {
  const router = useRouter();
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-16">
                 <Link
                    href="/sign-up"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 sm:h-5 w-4 sm:w-5" />
              <span className="text-sm sm:text-base lg:text-lg font-medium">
                Back
              </span>
            </Link>
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
              Terms of Service
            </h1>
          </div>
        </div>
      </header>

      <main className="h-[99%] pt-16 sm:pt-20  px-4 sm:px-6 bg-slate-50 overflow-y-auto pb-56 md:pb-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <div className="p-2 rounded-full bg-[#94b347]/10">
              <FileText className="h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 text-[#94b347]" />
            </div>
            <h2 className="text-lg sm:text-2xl md:text-3xl font-semibold text-slate-700">
              Terms of Service
            </h2>
          </div>

          <div className="space-y-4 sm:space-y-6 md:space-y-8 text-slate-600">
            <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg md:text-xl font-semibold mb-4 text-[#94b347]">
                1. Acceptance of Terms
              </h2>
              <p className="leading-relaxed">
                By accessing and using this website, you accept and agree to be
                bound by the terms and provisions of this agreement.
              </p>
            </section>

            <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg md:text-xl font-semibold mb-4 text-[#94b347]">
                2. Use License
              </h2>
              <p className="leading-relaxed">
                Permission is granted to temporarily access the materials
                (information or software) on our website for personal,
                non-commercial transitory viewing only.
              </p>
            </section>

            <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg md:text-xl font-semibold mb-4 text-[#94b347]">
                3. Disclaimer
              </h2>
              <p className="leading-relaxed">
                The materials on our website are provided on an 'as is' basis.
                We make no warranties, expressed or implied, and hereby disclaim
                and negate all other warranties including, without limitation,
                implied warranties or conditions of merchantability, fitness for
                a particular purpose, or non-infringement of intellectual
                property or other violation of rights.
              </p>
            </section>

            <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg md:text-xl font-semibold mb-4 text-[#94b347]">
                4. Limitations
              </h2>
              <p className="leading-relaxed">
                In no event shall we or our suppliers be liable for any damages
                (including, without limitation, damages for loss of data or
                profit, or due to business interruption) arising out of the use
                or inability to use the materials on our website.
              </p>
            </section>

            <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg md:text-xl font-semibold mb-4 text-[#94b347]">
                5. Revisions and Errata
              </h2>
              <p className="leading-relaxed">
                The materials appearing on our website could include technical,
                typographical, or photographic errors. We do not warrant that
                any of the materials on our website are accurate, complete, or
                current.
              </p>
            </section>

            <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg md:text-xl font-semibold mb-4 text-[#94b347]">
                6. Links
              </h2>
              <p className="leading-relaxed">
                We have not reviewed all of the sites linked to our website and
                are not responsible for the contents of any such linked site.
                The inclusion of any link does not imply endorsement by us of
                the site.
              </p>
            </section>

            <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg md:text-xl font-semibold mb-4 text-[#94b347]">
                7. Modifications
              </h2>
              <p className="leading-relaxed">
                We may revise these terms of service at any time without notice.
                By using this website, you are agreeing to be bound by the then
                current version of these terms of service.
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
