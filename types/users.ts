export interface User {
  id: string;
  clerkId: string;
  notebooks: string[];
  language?: string;
  creditBalance?: number;
  accountStatus?: "Free" | "Pro";
  lastUpdated?: string;
}
