import { useEffect, useMemo, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { useI18n } from "../../../shared/hooks/useI18n";
import { useToastStore } from "../../../shared/store/toast.store";
import { getSafeImageSrc } from "../../../shared/utils/image-src";
import { ARTICLE_LIMITS } from "../api/article.types";

/** What the upload endpoint accepts. SVG is refused whatever it is named. */
const ACCEPTED = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
];

interface CoverPickerProps {
    /** A cover already on the article, if it has one. */
    existingUrl: string | null;
    /** Chosen but not yet uploaded — upload happens at save or publish. */
    file: File | null;
    alt: string;
    onFileChange: (file: File | null) => void;
    onAltChange: (alt: string) => void;
    /** Clears a cover the article already had, sending `null` on the next save. */
    onRemoveExisting: () => void;
}

export function CoverPicker({
    existingUrl,
    file,
    alt,
    onFileChange,
    onAltChange,
    onRemoveExisting,
}: CoverPickerProps) {
    const { t } = useI18n();
    const inputRef = useRef<HTMLInputElement>(null);
    const addToast = useToastStore((state) => state.addToast);
    // Derived rather than held in state, so picking a file does not cost a
    // second render pass. The URL still has to be revoked — without it the
    // image is pinned in memory for the life of the page, and a writer
    // swapping covers a few times leaks one each time.
    const localPreview = useMemo(
        () => (file ? URL.createObjectURL(file) : null),
        [file],
    );

    useEffect(() => {
        if (!localPreview) return;
        return () => URL.revokeObjectURL(localPreview);
    }, [localPreview]);

    function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
        const picked = e.target.files?.[0];
        // Reset immediately so picking the same file twice still fires change.
        e.target.value = "";
        if (!picked) return;

        // Checked here so the writer hears about it now rather than at
        // publish, when the upload is the last thing between them and posting.
        if (picked.size > ARTICLE_LIMITS.coverBytesMax) {
            addToast({ type: "error", message: t("editor.coverTooLarge") });
            return;
        }
        if (!ACCEPTED.includes(picked.type)) {
            addToast({ type: "error", message: t("editor.coverWrongType") });
            return;
        }
        onFileChange(picked);
    }

    const preview = localPreview ?? getSafeImageSrc(existingUrl);

    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED.join(",")}
                onChange={handlePick}
                className="hidden"
                data-testid="cover-input"
            />

            {preview ? (
                <div className="relative overflow-hidden rounded-xl border border-ink/10">
                    {/* Bounded the same way the reading page bounds it, so
                        the preview is a fair picture of what a reader gets
                        rather than a taller one the writer has to guess at. */}
                    <img
                        src={preview}
                        alt=""
                        className="max-h-[60vh] w-full object-cover"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            if (file) onFileChange(null);
                            else onRemoveExisting();
                        }}
                        aria-label={t("editor.removeCover")}
                        className="absolute right-2 top-2 rounded-full bg-scrim/70 p-1.5 text-on-fill transition-colors hover:bg-scrim"
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink/15 py-8 text-sm text-ink/40 transition-colors hover:border-ink/30 hover:text-ink/70"
                >
                    <ImagePlus size={18} />
                    {t("editor.addCover")}
                </button>
            )}

            {preview && (
                <input
                    value={alt}
                    onChange={(e) =>
                        onAltChange(
                            e.target.value.slice(0, ARTICLE_LIMITS.coverAltMax),
                        )
                    }
                    placeholder={t("editor.coverAltPlaceholder")}
                    aria-label={t("editor.coverAlt")}
                    className="mt-2 w-full bg-transparent text-sm text-ink/70 outline-none placeholder:text-ink/25"
                />
            )}

            {/* A cover is optional — most articles do without one — so this
                says so rather than leaving the empty slot looking unfinished. */}
            {!preview && (
                <p className="mt-1.5 text-xs text-ink/30">
                    {t("editor.coverOptional")}
                </p>
            )}
        </div>
    );
}
