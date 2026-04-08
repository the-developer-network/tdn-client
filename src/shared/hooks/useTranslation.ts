import { useState, useMemo } from "react";
import { franc } from "franc-min";
import { api } from "../../core/api/client";
import { getErrorMessage } from "../utils/error-handler";
import { useAuthStore } from "../../core/auth/auth.store";
import { useAuthModalStore } from "../../features/auth/store/auth-modal.store";

// ISO 639-3 → ISO 639-1 (BCP47 short)
const ISO3_TO_ISO1: Record<string, string> = {
    afr: "af",
    sqi: "sq",
    amh: "am",
    ara: "ar",
    hye: "hy",
    aze: "az",
    eus: "eu",
    bel: "be",
    ben: "bn",
    bos: "bs",
    bul: "bg",
    cat: "ca",
    ceb: "ceb",
    zho: "zh",
    hrv: "hr",
    ces: "cs",
    dan: "da",
    nld: "nl",
    eng: "en",
    epo: "eo",
    est: "et",
    fin: "fi",
    fra: "fr",
    glg: "gl",
    kat: "ka",
    deu: "de",
    ell: "el",
    guj: "gu",
    hat: "ht",
    hau: "ha",
    heb: "he",
    hin: "hi",
    hmn: "hmn",
    hun: "hu",
    isl: "is",
    ibo: "ig",
    ind: "id",
    gle: "ga",
    ita: "it",
    jpn: "ja",
    jav: "jv",
    kan: "kn",
    kaz: "kk",
    khm: "km",
    kin: "rw",
    kor: "ko",
    kur: "ku",
    kir: "ky",
    lao: "lo",
    lat: "la",
    lav: "lv",
    lit: "lt",
    ltz: "lb",
    mkd: "mk",
    mlg: "mg",
    msa: "ms",
    mal: "ml",
    mlt: "mt",
    mri: "mi",
    mar: "mr",
    mon: "mn",
    mya: "my",
    nep: "ne",
    nor: "no",
    nya: "ny",
    ori: "or",
    pus: "ps",
    fas: "fa",
    pol: "pl",
    por: "pt",
    pan: "pa",
    ron: "ro",
    rus: "ru",
    srp: "sr",
    sna: "sn",
    snd: "sd",
    sin: "si",
    slk: "sk",
    slv: "sl",
    som: "so",
    sot: "st",
    spa: "es",
    sun: "su",
    swa: "sw",
    swe: "sv",
    tgl: "tl",
    tgk: "tg",
    tam: "ta",
    tat: "tt",
    tel: "te",
    tha: "th",
    tur: "tr",
    tuk: "tk",
    uig: "ug",
    ukr: "uk",
    urd: "ur",
    uzb: "uz",
    vie: "vi",
    cym: "cy",
    fry: "fy",
    xho: "xh",
    yid: "yi",
    yor: "yo",
    zul: "zu",
};

interface UseTranslationReturn {
    displayContent: string;
    isTranslated: boolean;
    isTranslating: boolean;
    translateError: string | null;
    showTranslate: boolean;
    handleTranslate: () => Promise<void>;
    handleRevert: () => void;
}

export function useTranslation(content: string): UseTranslationReturn {
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [translateError, setTranslateError] = useState<string | null>(null);

    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const openModal = useAuthModalStore((s) => s.openModal);

    const userLang = navigator.language.split("-")[0].toLowerCase();

    const showTranslate = useMemo(() => {
        if (content.trim().length < 10) return false;
        const detectedIso3 = franc(content);
        if (detectedIso3 === "und") return false;
        const detectedLang = ISO3_TO_ISO1[detectedIso3];
        if (!detectedLang) return false;
        return detectedLang !== userLang;
    }, [content, userLang]);

    const handleTranslate = async () => {
        if (!isAuthenticated) {
            openModal();
            return;
        }
        setIsTranslating(true);
        setTranslateError(null);
        try {
            const result = await api.post<{ translatedText: string }>(
                "/translate",
                {
                    text: content,
                    targetLang: userLang,
                },
            );
            setTranslatedText(result.translatedText);
        } catch (err) {
            setTranslateError(getErrorMessage(err));
        } finally {
            setIsTranslating(false);
        }
    };

    const handleRevert = () => {
        setTranslatedText(null);
        setTranslateError(null);
    };

    return {
        displayContent: translatedText ?? content,
        isTranslated: translatedText !== null,
        isTranslating,
        translateError,
        showTranslate,
        handleTranslate,
        handleRevert,
    };
}
