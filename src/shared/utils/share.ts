interface ShareDataParams {
    title: string;
    text?: string;
    url: string;
}

export const shareContent = async ({
    title,
    text,
    url,
}: ShareDataParams): Promise<"shared" | "copied" | "error"> => {
    if (navigator.share && navigator.canShare && navigator.canShare({ url })) {
        try {
            await navigator.share({ title, text, url });
            return "shared";
        } catch (error) {
            if ((error as Error).name !== "AbortError") {
                console.error(error);
            }
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
