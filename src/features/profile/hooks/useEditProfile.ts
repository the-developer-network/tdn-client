import { useState } from "react";
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
    const [prevProfile, setPrevProfile] = useState(profile);
    if (prevProfile !== profile) {
        setPrevProfile(profile);
        setFullName(profile.fullName ?? "");
        setBio(profile.bio ?? "");
        setLocation(profile.location ?? "");
        setSocials(
            Object.entries(profile.socials ?? {}).map(([key, value]) => ({
                key,
                value,
            })),
        );
    }

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

        // PATCH treats an omitted field as "leave unchanged", so sending
        // `undefined` for an emptied input made clearing a field impossible —
        // the value came straight back on the refetch. The API accepts null on
        // bio and location precisely to clear them.
        const trimmedBio = bio.trim();
        const trimmedLocation = location.trim();

        const body: UpdateProfileBody = {
            // No null variant and `minLength: 2` server-side, so an emptied
            // full name is omitted rather than sent as a value that would fail
            // validation.
            fullName: fullName.trim() || undefined,
            bio: trimmedBio || null,
            location: trimmedLocation || null,
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
