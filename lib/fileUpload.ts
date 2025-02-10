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
  const finalRef = ref(storage, `uploads/${uniqueFileName}`);
  const chunks: Uint8Array[] = [];

  try {
    // Read and store all chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const arrayBuffer = await chunk.arrayBuffer();
      chunks.push(new Uint8Array(arrayBuffer));
    }

    // Combine all chunks into a single Uint8Array
    const totalSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedArray = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      combinedArray.set(chunk, offset);
      offset += chunk.length;
    }

    // Upload the complete file
    const uploadResult = await uploadBytes(finalRef, combinedArray, {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Get and return the download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);
    console.log("File uploaded successfully:", downloadURL);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading large file:", error);
    throw error;
  }
}
