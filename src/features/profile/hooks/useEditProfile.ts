import { useState, useEffect } from "react";
import { profileApi } from "../api/profile.api";
import type { Profile, UpdateProfileBody } from "../api/profile.types";
import { getErrorMessage } from "../../../shared/utils/error-handler";

type SocialEntry = { key: string; value: string };

interface UseEditProfileOptions {
    profile: Profile;
    username: string;
    onSuccess: (updated: Profile) => void;
}

export function useEditProfile({
    profile,
    username,
    onSuccess,
}: UseEditProfileOptions) {
    const [fullName, setFullName] = useState(profile.fullName ?? "");
    const [bio, setBio] = useState(profile.bio ?? "");
    const [location, setLocation] = useState(profile.location ?? "");
    const [socials, setSocials] = useState<SocialEntry[]>(() =>
        Object.entries(profile.socials ?? {}).map(([key, value]) => ({
            key,
            value,
        })),
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Re-initialize when profile changes (e.g. after page loads)
    useEffect(() => {
        setFullName(profile.fullName ?? "");
        setBio(profile.bio ?? "");
        setLocation(profile.location ?? "");
        setSocials(
            Object.entries(profile.socials ?? {}).map(([key, value]) => ({
                key,
                value,
            })),
        );
    }, [profile]);

    function addSocial() {
        setSocials((prev) => [...prev, { key: "", value: "" }]);
    }

    function updateSocial(index: number, field: "key" | "value", val: string) {
        setSocials((prev) =>
            prev.map((entry, i) =>
                i === index ? { ...entry, [field]: val } : entry,
            ),
        );
    }

    function removeSocial(index: number) {
        setSocials((prev) => prev.filter((_, i) => i !== index));
    }

    async function handleSubmit() {
        setIsLoading(true);
        setError(null);

        const socialsRecord: Record<string, string> = {};
        for (const { key, value } of socials) {
            const trimmedKey = key.trim();
            if (trimmedKey) {
                socialsRecord[trimmedKey] = value.trim();
            }
        }

        const body: UpdateProfileBody = {
            fullName: fullName.trim() || undefined,
            bio: bio.trim() || undefined,
            location: location.trim() || undefined,
            socials: socialsRecord,
        };

        try {
            await profileApi.updateProfile(body);
            const refreshed = await profileApi.getProfile(username);
            onSuccess(refreshed);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }

    return {
        fullName,
        setFullName,
        bio,
        setBio,
        location,
        setLocation,
        socials,
        addSocial,
        updateSocial,
        removeSocial,
        isLoading,
        error,
        handleSubmit,
    };
}
