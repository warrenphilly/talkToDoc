"use client";

import { Button } from "@/components/ui/button";
import { db } from "@/firebase";
import { StudyGuide } from "@/types/studyGuide";
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { StudyGuidePage as StudyGuidePageComponent } from "@/components/shared/study/StudyGuidePage";
import { useEffect, useState } from "react";

export default function StudyGuidePage() {
  const params = useParams();
  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(null);
  const [loading, setLoading] = useState(true);

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
              notebookId: data.notebookId,
              pageId: data.pageId,
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
      // Redirect to home page or study guides list
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting study guide:", error);
      alert("Failed to delete study guide");
    }
  };

  return (
    <div className="w-full mx-auto p-4 h-full max-h-[calc(100vh-100px)] overflow-y-none">
      
      <StudyGuidePageComponent
        guide={studyGuide}
        onDelete={handleDelete}
        onUpdateTitle={handleUpdateTitle}
      />
    </div>
  );
}
