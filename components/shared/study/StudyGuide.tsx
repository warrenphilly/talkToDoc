import { Card } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/card";
import { CardDescription } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, PlusCircle } from "lucide-react";
import { saveStudyGuide } from "@/lib/firebase/firestore";
import { useState } from "react";


interface StudyMaterialTabsProps {
   notebookId: string;
   pageId: string;
 }



 export default function StudyGuide({ notebookId, pageId }: StudyMaterialTabsProps) {
   const [content, setContent] = useState("");
   const [isEditing, setIsEditing] = useState(false);
 
   const handleSaveGuide = async () => {
     try {
       await saveStudyGuide(notebookId, pageId, content);
       setIsEditing(false);
     } catch (error) {
       console.error("Error saving study guide:", error);
     }
   };
 
   return (
     <Card>
       <CardHeader>
         <CardTitle>Study Guide</CardTitle>
         <CardDescription>Your personalized study guide</CardDescription>
       </CardHeader>
       <CardContent>
         {isEditing ? (
           <div className="space-y-4">
             <Textarea
               value={content}
               onChange={(e) => setContent(e.target.value)}
               className="min-h-[200px]"
             />
             <div className="flex gap-2">
               <Button onClick={handleSaveGuide}>Save Guide</Button>
               <Button variant="outline" onClick={() => setIsEditing(false)}>
                 Cancel
               </Button>
             </div>
           </div>
         ) : (
           <div className="bg-secondary p-4 rounded">
             {content ? (
               <p>{content}</p>
             ) : (
               <p className="text-muted-foreground">No study guide available.</p>
             )}
           </div>
         )}
       </CardContent>
       <CardFooter>
         <Button onClick={() => setIsEditing(true)} className="w-full">
           {content ? (
             <>
               <RefreshCw className="mr-2 h-4 w-4" /> Edit Study Guide
             </>
           ) : (
             <>
               <PlusCircle className="mr-2 h-4 w-4" /> Create Study Guide
             </>
           )}
         </Button>
       </CardFooter>
     </Card>
   );
 };
 