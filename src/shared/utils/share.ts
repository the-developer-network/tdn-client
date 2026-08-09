interface ShareDataParams {
    title: string;
    text?: string;
    url: string;
}

export const shareContent = async ({
    title,
    text,
    url,
}: ShareDataParams): Promise<"shared" | "copied" | "cancelled" | "error"> => {
    if (navigator.share && navigator.canShare && navigator.canShare({ url })) {
        try {
            await navigator.share({ title, text, url });
            return "shared";
        } catch (error) {
            // Dismissing the share sheet rejects with AbortError. That is the
            // reader closing a dialog they opened, not a failure — reporting
            // it back as one would put an error toast on every cancel.
            if ((error as Error).name === "AbortError") return "cancelled";
            console.error(error);
            return "error";
        }
    }

    try {
        await navigator.clipboard.writeText(url);
        return "copied";
    } catch (error) {
        console.error(error);
        return "error";
    }
};
