"use client";

import { useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { UploadCloud, FileImage, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { toast } from "sonner";

import { compressImage } from "@/lib/pipeline/compressImage";
import { createCaseAction } from "@/actions/create-case-actions";

import RedirectLoading from "@/components/Redirect/redirect";

const ACCEPTED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 3;

const formSchema = z
  .object({
    context: z
      .string()
      .max(2000, "Keep context under 2000 characters")
      .optional(),
    textEvidence: z
      .string()
      .max(8000, "keep pasted text under 8000 characters")
      .optional(),
    files: z
      .array(z.instanceof(File))
      .max(MAX_FILES, "You can attach up to 3 files")
      .refine(
        (files) => files.every((f) => ACCEPTED_FILE_TYPES.includes(f.type)),
        "Only images, PDF, DOCX, or text files are allowed",
      )
      .refine(
        (files) => files.every((f) => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024),
        "Each file must be under 10MB",
      ),
  })
  .superRefine((data, ctx) => {
    const hasFiles = data.files.length > 0;
    const hasTextEvidence = (data.textEvidence?.trim().length ?? 0) >= 20;

    if (!hasFiles && !hasTextEvidence) {
      const message =
        "Attach at least one evidence file, or paste some text evidence (at least 20 characters)";
      ctx.addIssue({ code: "custom", message, path: ["files"] });
      ctx.addIssue({ code: "custom", message, path: ["textEvidence"] });
    }
  });

type FormValues = z.infer<typeof formSchema>;

export default function NewInvestigationPage() {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLButtonElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { context: "", textEvidence: "", files: [] },
  });

  const files = form.watch("files");

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList);

    const existingKeys = new Set(files.map((f) => `${f.name}-${f.size}`));

    const valid: File[] = [];
    const rejected: string[] = [];
    const duplicates: string[] = [];

    incoming.forEach((file) => {
      const key = `${file.name}-${file.size}`;

      if (existingKeys.has(key)) {
        duplicates.push(file.name);
        return;
      }
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        rejected.push(`${file.name} (unsupported type)`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        rejected.push(`${file.name} (too large)`);
        return;
      }

      valid.push(file);
      existingKeys.add(key);
    });

    const availableSlots = MAX_FILES - files.length;
    const overflow = valid.length > availableSlots;
    const accepted = valid.slice(0, Math.max(availableSlots, 0));

    if (duplicates.length > 0) {
      toast.error(`Already added, skipped: ${duplicates.join(", ")}`, {
        position: "top-center",
      });
    }
    if (rejected.length > 0) {
      toast.error(`Skipped: ${rejected.join(", ")}`, {
        position: "top-center",
      });
    }
    if (overflow) {
      toast.error(
        `Only ${MAX_FILES} files allowed — some files were not added`,
        { position: "top-center" },
      );
    }

    if (accepted.length > 0) {
      const compressed = await Promise.all(accepted.map(compressImage));
      form.setValue("files", [...files, ...compressed], {
        shouldValidate: true,
      });
    }
  };

  const removeFile = (index: number) => {
    form.setValue(
      "files",
      files.filter((_, i) => i !== index),
      { shouldValidate: true },
    );
  };
  const [isPending, startTransition] = useTransition();
  const onSubmit = async (values: FormValues) => {
    const fd = new FormData();
    values.files.forEach((file) => {
      fd.append("files", file);
    });
    if (values.context) fd.append("context", values.context);
    if (values.textEvidence) fd.append("textEvidence", values.textEvidence);

    startTransition(async () => {
      const result = await createCaseAction(fd);

      if (result && !result.success) {
        toast.error(result.error, {
          position: "top-center",
        });
      }
    });
  };

  if (isPending) {
    return <RedirectLoading />;
  }

  return (
    <main className="flex flex-1 justify-center px-6 py-10 md:px-12">
      <div className="w-full max-w-160">
        <div className="mb-6.5">
          <p className="font-mono text-sm  uppercase  text-primary">
            New investigation
          </p>
          <h1 className="mt-2 font-serif text-2xl font-semibold">
            Start a new investigation
          </h1>
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit, (errors) =>
            console.log("VALIDATION ERRORS", errors),
          )}
        >
          <FieldGroup>
            <Controller
              name="files"
              control={form.control}
              render={({ fieldState }) => (
                <Field>
                  <FieldLabel className="text-[12.5px] font-semibold text-muted-foreground">
                    Evidence
                  </FieldLabel>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex w-full flex-col items-center gap-2.5 rounded-lg border-[1.5px] border-dashed px-5 py-9 transition-colors cursor-pointer ${
                      isDragging
                        ? "border-primary bg-accent"
                        : "border-border bg-muted/50"
                    }`}
                  >
                    <span className="flex size-9.5 items-center justify-center rounded-lg bg-accent text-primary">
                      <UploadCloud className="size-5" strokeWidth={1.6} />
                    </span>
                    <p className="text-sm font-semibold">
                      Drag files here, or click to browse
                    </p>
                    <p className="text-[12.5px] text-muted-foreground">
                      Screenshots, PDF, or DOCX
                    </p>
                  </button>
                  {fieldState.error && (
                    <p className="text-sm text-red-500">
                      {fieldState.error.message}
                    </p>
                  )}
                </Field>
              )}
            />

            {files.length > 0 && (
              <div className="flex flex-col gap-2">
                {files.map((file, index) => {
                  const Icon = file.type.startsWith("image/")
                    ? FileImage
                    : FileText;
                  return (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5"
                    >
                      <span className="flex size-7.5 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
                        <Icon className="size-4" strokeWidth={1.6} />
                      </span>
                      <span className="flex-1 truncate text-[13.5px]">
                        {file.name}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 font-mono text-[10.5px] font-medium tracking-wide text-primary">
                        READY
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <Controller
              name="textEvidence"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel
                    htmlFor={field.name}
                    className="text-[12.5px] font-semibold text-muted-foreground"
                  >
                    Paste text evidence
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="Paste the exact scam message, email, or chat text here..."
                    className="min-h-[90px] w-full h-32 resize-none"
                  />
                  {fieldState.error && (
                    <p className="text-sm text-red-500">
                      {fieldState.error.message}
                    </p>
                  )}
                </Field>
              )}
            />

            <Controller
              name="context"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel
                    htmlFor={field.name}
                    className="text-[12.5px] font-semibold text-muted-foreground"
                  >
                    Extra context (optional)
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="Add background info — why you're suspicious, how you were contacted, etc."
                    className="min-h-[90px] w-full h-32 resize-none"
                  />
                  {fieldState.error && (
                    <p className="text-sm text-red-500">
                      {fieldState.error.message}
                    </p>
                  )}
                </Field>
              )}
            />

            <div className="flex justify-end gap-3 pt-1.5">
              <Button type="button" variant="outline" asChild>
                <Link href="/">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="cursor-pointer"
              >
                Start Investigation
              </Button>
            </div>
          </FieldGroup>
        </form>
      </div>
    </main>
  );
}
