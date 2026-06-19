import { MonitorUp } from "lucide-react";

export function ResearchDesktopOnly({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f2ec] px-6 py-12 text-[#243047] dark:bg-[#16191f] dark:text-[#E4E4E4] lg:hidden">
        <section
          className="w-full max-w-md border border-[#d8d0c4] bg-[#fbfaf7] px-7 py-9 text-center shadow-[0_18px_55px_rgba(36,48,71,0.12)] dark:border-[#3D3D3D] dark:bg-[#242424] dark:shadow-[0_18px_55px_rgba(0,0,0,0.3)]"
          aria-labelledby="research-desktop-only-title"
        >
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center border border-[#9bbbc0] bg-[#e8f1f1] text-[#1F7180] dark:border-[#587174] dark:bg-[#283436] dark:text-[#A8DADC]">
            <MonitorUp className="h-7 w-7" strokeWidth={1.6} />
          </div>
          <h1
            id="research-desktop-only-title"
            className="text-xl font-normal text-[#243047] dark:text-[#E4E4E4]"
          >
            Computer screen required
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#647087] dark:text-[#B0B0B0]">
            This research page is not supported in mobile view. Please switch
            to a computer screen size to continue.
          </p>
        </section>
      </main>
      <div className="hidden lg:contents">{children}</div>
    </>
  );
}
