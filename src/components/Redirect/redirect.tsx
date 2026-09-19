import { Loader2Icon } from "lucide-react";

const RedirectLoading = () => {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <Loader2Icon className="size-8 animate-spin text-primary" />
      <div className="flex flex-col gap-1.5">
        <p className="font-serif text-lg font-semibold">
          Redirecting to investigation details…
        </p>
        <p className="text-sm text-muted-foreground">
          Don&apos;t close or reload the page.
        </p>
      </div>
    </main>
  );
};

export default RedirectLoading;
