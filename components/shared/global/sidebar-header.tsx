"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export function SidebarHeader() {
  const { open } = useSidebar();

  return (
    <div className="fixed z-50 top-4 left-4  flex flex-row items-center justify-between bg-white  w-full">
      <div
        className={`${
          open ? "md:min-w-[250px]" : "w-12"
        }  flex items-center justify-start transition-all bg-white duration-300`}
      >
           <SidebarTrigger />
           <p className="text-slate-600 text-xl bg-white   font-regular hidden md:block">Gammanotes</p>
      </div>

      <div className="flex-1 flex items-center justify-center  mr-12">
        <p className="text-slate-400 text-xl bg-white  md:text-3xl font-regular md:hidden">Gammanotes</p>
      </div>
    </div>
  );
}
