"use client";

import { Button } from "@/components/ui/button";
import { db } from "@/firebase";
import { StudyGuide } from "@/types/studyGuide";
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { StudyGuidePage as StudyGuidePageComponent } from "@/components/shared/study/StudyGuidePage";
import { useEffect, useState } from "react";

export default function StudyGuidePage() {
  const params = useParams();
  const router = useRouter();
  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchStudyGuide = async () => {
      if (params.studyGuideId) {
        try {
          // Get reference to the specific study guide document
          const studyGuideRef = doc(
            db,
            "studyGuides",
            params.studyGuideId as string
          );
          const studyGuideSnap = await getDoc(studyGuideRef);

          if (studyGuideSnap.exists()) {
            const data = studyGuideSnap.data();
            // Convert Firestore Timestamp to Date object
            const createdAtDate = data.createdAt?.toDate?.() || new Date();

            setStudyGuide({
              id: studyGuideSnap.id,
              title: data.title,
              content: data.content,

              createdAt: createdAtDate, // Now properly typed as Date
              userId: data.userId || "",
            });
          }
        } catch (error) {
          console.error("Error fetching study guide:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchStudyGuide();
  }, [params.studyGuideId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!studyGuide) {
    return <div>Study guide not found</div>;
  }

  const handleUpdateTitle = async (guideId: string, newTitle: string) => {
    try {
      // Update in database
      const studyGuideRef = doc(db, "studyGuides", guideId);
      await updateDoc(studyGuideRef, {
        title: newTitle,
      });

      // Update local state
      setStudyGuide((prev) => (prev ? { ...prev, title: newTitle } : null));
    } catch (error) {
      console.error("Failed to update study guide title:", error);
    }
  };

  const handleDelete = async (guideId: string) => {
    try {
      if (
        !window.confirm("Are you sure you want to delete this study guide?")
      ) {
        return;
      }

      await deleteDoc(doc(db, "studyGuides", guideId));
      // Replace window.location.href with router.push
      router.push("/");
    } catch (error) {
      console.error("Error deleting study guide:", error);
      alert("Failed to delete study guide");
    }
  };

  const handleGenerateGuide = async () => {
    try {
      setIsGenerating(true);
      // ... your existing guide creation logic ...

      // After successful creation
      toast.success("Study guide generated successfully!");
      router.push("/"); // Redirect to home page
    } catch (error) {
      console.error("Error generating guide:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate guide"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full  mx-auto p-4 h-full max-h-[calc(100vh-100px)] overflow-y-none">
      <StudyGuidePageComponent
        guide={studyGuide}
        onDelete={handleDelete}
        onUpdateTitle={handleUpdateTitle}
      />
    </div>
  );
}
