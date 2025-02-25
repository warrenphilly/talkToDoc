import FormUpload from "@/components/shared/study/formUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadLargeFile } from "@/lib/fileUpload";
import { Message } from "@/lib/types";
import { Notebook } from "@/types/notebooks";
import { StudyCardSet } from "@/types/studyCards";
import { Loader2, RefreshCw } from "lucide-react";
import { RefObject } from "react";
import { toast } from "react-hot-toast";

interface CreateCardModalProps {
  showNotebookModal: boolean;
  setShowNotebookModal: (show: boolean) => void;
  setName: string;
  setSetName: (name: string) => void;
  numCards: number;
  setNumCards: (num: number) => void;
  messages: Message[];
  files: File[];
  showUpload: boolean;
  fileInputRef: RefObject<HTMLInputElement>;
  handleFileUpload: (
    event: React.ChangeEvent<HTMLInputElement>,
    setFiles: (files: File[]) => void
  ) => void;
  handleSendMessage: () => void;
  handleClear: () => void;
  setShowUpload: (show: boolean) => void;
  setFiles: (files: File[]) => void;
  renderNotebookList: () => React.ReactNode;
  handleGenerateCards: () => Promise<void>;
  isGenerating: boolean;
  selectedPages: { [notebookId: string]: string[] };
  setSelectedPages: React.Dispatch<
    React.SetStateAction<{ [notebookId: string]: string[] }>
  >;
  filesToUpload: File[];
  setIsGenerating: (isGenerating: boolean) => void;
  onSetCreated?: (studySet: StudyCardSet) => void;
}

export default function CreateCardModal({
  showNotebookModal,
  setShowNotebookModal,
  setName,
  setSetName,
  numCards,
  setNumCards,
  messages,
  files,
  showUpload,
  fileInputRef,
  handleFileUpload,
  handleSendMessage,
  handleClear,
  setShowUpload,
  setFiles,
  renderNotebookList,
  handleGenerateCards,
  isGenerating,
  selectedPages,
  setSelectedPages,
  filesToUpload,
  setIsGenerating,
  onSetCreated,
}: CreateCardModalProps) {
  const handleGenerateStudyCards = async () => {
    if (!setName.trim()) {
      toast.error("Please enter a set name");
      return;
    }

    if (filesToUpload.length === 0 && Object.keys(selectedPages).length === 0) {
      toast.error("Please either upload files or select notebook pages");
      return;
    }

    try {
      setIsGenerating(true);

      // Process uploaded files
      const processedFiles = [];
      for (const file of filesToUpload) {
        try {
          const downloadURL = await uploadLargeFile(file);

          const response = await fetch("/api/convert-from-storage", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileUrl: downloadURL,
              fileName: file.name,
              fileType: file.type,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to convert file: ${file.name}`);
          }

          const data = await response.json();
          processedFiles.push({
            name: file.name,
            path: downloadURL,
            content: data.text,
          });
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          throw error;
        }
      }

      // Create the request body
      const requestBody = {
        selectedPages,
        setName,
        numCards,
        uploadedDocs: processedFiles,
      };

      console.log("Sending request with:", requestBody);

      const response = await fetch("/api/studycards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("API Response:", result);

      if (!response.ok) {
        console.error("Study Cards API Error Response:", result);
        throw new Error(result.error || "Failed to generate study cards");
      }

      if (result.success && result.studySet) {
        console.log("Successfully created study set:", result.studySet);
        // Clear the form
        setSetName("");
        setFiles([]);
        if (setSelectedPages) {
          setSelectedPages({});
        }
        setShowNotebookModal(false);

        // Set the newly created set as selected
        if (onSetCreated) {
          onSetCreated(result.studySet);
        }

        toast.success("Study cards generated and saved successfully!");
      } else {
        console.error("Invalid response format:", result);
        throw new Error("Failed to save study cards");
      }
    } catch (error: any) {
      console.error("Error generating study cards:", error);
      toast.error(error.message || "Failed to generate study cards");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {showNotebookModal && (
        <div className="fixed inset-0 bg-slate-600/30 opacity-100 backdrop-blur-sm flex items-center justify-center z-10 w-full">
        <div className="bg-white p-6 rounded-lg h-full md:max-h-[75vh] py-12  w-full  max-w-3xl ">
          <div className="flex flex-col gap-2 items-center justify-center">
            <h2 className="text-xl font-bold mb-4 text-[#94b347]">
              Create Study Cards
            </h2>
          </div>
<div className="overflow-y-auto h-full pb-8 pt-4">
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Card Set Name
              </label>
              <Input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="Enter a name for this study set"
                className="w-full border rounded-md p-2 border-slate-600 text-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Cards
              </label>
              <select
                value={numCards}
                onChange={(e) => setNumCards(Number(e.target.value))}
                className="w-full border rounded-md p-2 border-slate-600 text-slate-600"
              >
                {[3, 5, 10, 15, 20, 25, 30].map((num) => (
                  <option key={num} value={num}>
                    {num} cards
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-6">
              <div className="font-semibold text-gray-500 w-full flex items-center justify-center text-lg">
                <h3>Select notes or upload files to study</h3>
              </div>
              <FormUpload
                messages={messages}
                files={files}
                showUpload={showUpload}
                fileInputRef={fileInputRef}
                handleFileUpload={(event) =>
                  handleFileUpload(event, setFiles)
                }
                handleSendMessage={handleSendMessage}
                handleClear={handleClear}
                setShowUpload={setShowUpload}
              />
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Notes
              </label>
              <div className="flex flex-col gap-2 items-center justify-center h-72 overflow-y-auto ">
                {renderNotebookList()}
                </div>
            </div>
          </div>

          <div className="flex justify-between gap-2 mt-4 w-full">
            <Button
              variant="outline"
              className="rounded-full bg-white border border-red-400 text-red-400 hover:bg-red-100 hover:border-red-400 hover:text-red-500"
              onClick={() => {
                setShowNotebookModal(false);
                setSetName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateCards}
              className="rounded-full bg-white border border-slate-400 text-slate-600 hover:bg-white hover:border-[#94b347] hover:text-[#94b347]"
              disabled={
                isGenerating ||
                !setName.trim() ||
                (filesToUpload.length === 0 &&
                  Object.keys(selectedPages).length === 0)
              }
            >
              {isGenerating ? "Generating..." : "Generate Cards"}
            </Button>
          </div>
          </div>
        </div>
      </div>
      )}
    </>
  );
}
