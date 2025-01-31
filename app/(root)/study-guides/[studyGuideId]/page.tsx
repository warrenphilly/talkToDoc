"use client";

import { StudyGuideCard } from "@/components/shared/study/StudyGuideCard";
import { Button } from "@/components/ui/button";

import { StudyGuide } from "@/types/studyGuide";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function StudyGuidePage() {
  const params = useParams();
  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(null);
  const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchStudyGuide = async () => {
//       if (params.studyGuideId) {
//         try {
//           const guide = await getStudyGuide(params.studyGuideId as string);
//           setStudyGuide(guide);
//         } catch (error) {
//           console.error("Error fetching study guide:", error);
//         } finally {
//           setLoading(false);
//         }
//       }
//     };

//     fetchStudyGuide();
//   }, [params.studyGuideId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!studyGuide) {
    return <div>Study guide not found</div>;
  }

  return (
     <div className="max-w-4xl mx-auto p-4">
        this is wehre we bguild
      {/* <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      <StudyGuideCard
        guide={studyGuide}
        onDelete={() => {}}
        onUpdateTitle={() => {}}
      /> */}
    </div>
  );
} 