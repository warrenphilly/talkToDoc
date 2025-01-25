import { storage } from "@/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function fileUpload(event: React.ChangeEvent<HTMLInputElement>, setFiles: (files: File[]) => void) {
  const files = event.target.files;
  if (files) {
    setFiles(Array.from(files));
  }
}

export async function uploadFile(file: File): Promise<string> {
  const storageRef = ref(storage, `uploads/${file.name}`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
} 