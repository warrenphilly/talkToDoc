"use client";

import { Button } from "@/components/ui/button";
import { db, storage } from "@/firebase";
import { StudyGuide } from "@/types/studyGuide";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { StudyGuidePage as StudyGuidePageComponent } from "@/components/shared/study/StudyGuidePage";
import { Message } from "@/lib/types";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function StudyGuidePage() {
  const params = useParams();
  const router = useRouter();
  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

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
      router.push("/");
    } catch (error) {
      console.error("Error deleting study guide:", error);
      alert("Failed to delete study guide");
    }
  };

  const handleGenerateGuide = async (
    guideName: string,
    filesToUpload: File[],
    selectedPages: { [key: string]: string[] }
  ) => {
    try {
      if (!guideName.trim()) {
        toast.error("Please enter a name for the study guide");
        return false;
      }

      // Check if we have either uploaded files or selected pages
      const hasSelectedPages = Object.values(selectedPages).some(
        (pages) => pages.length > 0
      );
      if (filesToUpload.length === 0 && !hasSelectedPages) {
        toast.error("Please either upload files or select notebook pages");
        return false;
      }

      // Get the first selected notebook and page for storage path
      const firstNotebookId = Object.keys(selectedPages).find(
        (notebookId) => selectedPages[notebookId]?.length > 0
      );
      const firstPageId = firstNotebookId
        ? selectedPages[firstNotebookId][0]
        : null;

      // Generate random IDs if using only uploaded files
      const pageIdToUse = firstPageId || `page_${uuidv4()}`;
      const notebookIdToUse = firstNotebookId || `notebook_${uuidv4()}`;

      // Handle file uploads
      let uploadedDocsMetadata = [];
      if (filesToUpload.length > 0) {
        for (const file of filesToUpload) {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/convert", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Failed to convert file: ${file.name}`);
          }

          const data = await response.json();
          if (data.text) {
            const timestamp = new Date().getTime();
            const path = `studydocs/${notebookIdToUse}/${pageIdToUse}_${timestamp}.md`;
            const storageRef = ref(storage, path);
            await uploadString(storageRef, data.text, "raw", {
              contentType: "text/markdown",
            });

            const url = await getDownloadURL(storageRef);
            uploadedDocsMetadata.push({
              path,
              url,
              name: file.name,
              timestamp: timestamp.toString(),
            });
          }
        }
      }

      // Prepare the form data for study guide generation
      const formData = new FormData();
      const messageData = {
        selectedPages: hasSelectedPages ? selectedPages : undefined,
        guideName,
        uploadedDocs:
          uploadedDocsMetadata.length > 0 ? uploadedDocsMetadata : undefined,
      };

      formData.append("message", JSON.stringify(messageData));

      // Call the study guide API endpoint
      const response = await fetch("/api/studyguide", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to generate study guide");
      }

      const data = await response.json();

      // Create a new study guide object with a new ID
      const newStudyGuideId = `guide_${uuidv4()}`;
      const newStudyGuide: StudyGuide = {
        id: newStudyGuideId,
        title: guideName,
        content: data.content,
        createdAt: new Date(),
        userId: user?.id || "",
      };

      // Save to Firestore
      const studyGuideRef = doc(db, "studyGuides", newStudyGuide.id);
      await setDoc(studyGuideRef, {
        ...newStudyGuide,
        createdAt: serverTimestamp(),
      });

      toast.success("Study guide generated successfully!");

      // Make sure we're not in the middle of a state update
      setTimeout(() => {
        router.push("/");
      }, 300);

      return true;
    } catch (error: any) {
      console.error("Error generating study guide:", error);
      toast.error(error.message || "Failed to generate study guide");
      return false;
    }
  };

  const navigateHome = () => {
    
    router.push("/");
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!studyGuide) {
    return <div>Study guide not found</div>;
  }

  return (
    <div className="w-full mx-auto  h-full bg-white  overflow-hidden ">
      <StudyGuidePageComponent
        guide={studyGuide}
        onDelete={handleDelete}
        onUpdateTitle={handleUpdateTitle}
        onGenerateGuide={handleGenerateGuide}
        navigateHome={navigateHome}
      />
    </div>
  );
}
