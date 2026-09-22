import { Loader2Icon } from "lucide-react";

interface RedirectLoadingProps {
  title?: string;
  description?: string;
}

const RedirectLoading = ({
  title = "Redirecting to investigation details…",
  description = "Don't close or reload the page.",
}: RedirectLoadingProps = {}) => {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <Loader2Icon className="size-8 animate-spin text-primary" />
      <div className="flex flex-col gap-1.5">
        <p className="font-serif text-lg font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </main>
  );
};

export default RedirectLoading;
