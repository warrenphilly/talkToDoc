import { SignedIn, SignedOut } from "@clerk/nextjs";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SignedOut>
      <div className="flex items-center justify-center min-h-screen w-full bg-white bg-dotted-pattern bg-cover bg-fixed bg-center">
        {children}
      </div>
    </SignedOut>
  );
};

export default Layout;
