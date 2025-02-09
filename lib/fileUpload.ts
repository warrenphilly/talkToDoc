import { storage } from "@/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

export async function fileUpload(
  event: React.ChangeEvent<HTMLInputElement>,
  setFiles: (files: File[]) => void
) {
  const files = event.target.files;
  if (files) {
    setFiles(Array.from(files));
  }
}

export async function uploadFile(file: File): Promise<string> {
  try {
    // Generate a unique filename to prevent collisions
    const uniqueFileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `uploads/${uniqueFileName}`);

    // Upload with metadata
    const uploadTask = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Get and return the download URL
    const downloadURL = await getDownloadURL(uploadTask.ref);
    console.log("File uploaded successfully:", downloadURL);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

// Add new function to handle chunked uploads
export async function uploadLargeFile(file: File): Promise<string> {
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uniqueFileName = `${Date.now()}_${file.name}`;

  try {
    // Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const chunkRef = ref(storage, `temp/${uniqueFileName}_chunk${i}`);
      await uploadBytes(chunkRef, chunk);
    }

    // Combine chunks
    const finalRef = ref(storage, `uploads/${uniqueFileName}`);
    const downloadURL = await getDownloadURL(finalRef);

    return downloadURL;
  } catch (error) {
    console.error("Error uploading large file:", error);
    throw error;
  }
}
