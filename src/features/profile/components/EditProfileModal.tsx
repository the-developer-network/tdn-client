import { useRef } from "react";
import { Camera, Plus, Trash2 } from "lucide-react";
import { Modal } from "../../../shared/components/ui/Modal";
import { Button } from "../../../shared/components/ui/Button";
import { useEditProfile } from "../hooks/useEditProfile";
import { useUploadAvatar } from "../hooks/useUploadAvatar";
import { useUploadBanner } from "../hooks/useUploadBanner";
import { useI18n } from "../../../shared/hooks/useI18n";
import { getSafeImageSrc } from "../../../shared/utils/image-src";
import type { Profile } from "../api/profile.types";

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: Profile;
    username: string;
    onSuccess: (updated: Profile) => void;
    onAvatarUpdate?: (avatarUrl: string) => void;
    onBannerUpdate?: (bannerUrl: string) => void;
}

export function EditProfileModal({
    isOpen,
    onClose,
    profile,
    username,
    onSuccess,
    onAvatarUpdate,
    onBannerUpdate,
}: EditProfileModalProps) {
    const { t } = useI18n();
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    const {
        upload: uploadAvatar,
        isLoading: avatarUploading,
        error: avatarError,
        previewUrl: avatarPreview,
    } = useUploadAvatar({
        onSuccess: (url) => onAvatarUpdate?.(url),
    });

    const {
        upload: uploadBanner,
        isLoading: bannerUploading,
        error: bannerError,
        previewUrl: bannerPreview,
    } = useUploadBanner({
        onSuccess: (url) => onBannerUpdate?.(url),
    });

    const {
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
    } = useEditProfile({
        profile,
        username,
        onSuccess: (updated) => {
            onSuccess(updated);
            onClose();
        },
    });

    const inputClass =
        "w-full bg-ink/5 border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-ink/30 outline-none focus:border-ink/30 transition-colors";

    const fallbackAvatar = `https://ui-avatars.com/api/?name=${profile.username}&size=80`;

    const currentAvatar =
        getSafeImageSrc(avatarPreview || profile.avatarUrl) ?? fallbackAvatar;
    const currentBanner = getSafeImageSrc(bannerPreview || profile.bannerUrl);

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            {/* Hidden file inputs */}
            <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadAvatar(file);
                    e.target.value = "";
                }}
            />
            <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadBanner(file);
                    e.target.value = "";
                }}
            />

            <div className="pb-6">
                {/* Banner */}
                <div className="relative h-24 sm:h-32 bg-surface-1 overflow-hidden rounded-t-2xl">
                    {currentBanner && (
                        <img
                            src={currentBanner}
                            alt="Banner"
                            className="w-full h-full object-cover"
                        />
                    )}
                    <button
                        type="button"
                        onClick={() => bannerInputRef.current?.click()}
                        disabled={bannerUploading}
                        className="absolute inset-0 flex items-center justify-center bg-scrim/40 hover:bg-scrim/60 transition-colors"
                    >
                        {bannerUploading ? (
                            <div className="w-5 h-5 border-2 border-on-fill/40 border-t-on-fill rounded-full animate-spin" />
                        ) : (
                            <Camera size={20} className="text-on-fill" />
                        )}
                    </button>
                </div>

                {/* Avatar — overlaps banner */}
                <div className="px-5 -mt-8 mb-4">
                    <div className="relative w-16 h-16">
                        <img
                            src={currentAvatar}
                            alt={profile.username}
                            className="w-16 h-16 rounded-full border-4 border-ground object-cover bg-surface-1"
                        />
                        <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={avatarUploading}
                            className="absolute inset-0 flex items-center justify-center rounded-full bg-scrim/50 hover:bg-scrim/70 transition-colors"
                        >
                            {avatarUploading ? (
                                <div className="w-4 h-4 border-2 border-on-fill/40 border-t-on-fill rounded-full animate-spin" />
                            ) : (
                                <Camera size={14} className="text-on-fill" />
                            )}
                        </button>
                    </div>
                    {(avatarError || bannerError) && (
                        <p className="text-xs text-red-400 mt-1.5">
                            {avatarError ?? bannerError}
                        </p>
                    )}
                </div>

                <div className="px-6 space-y-4">
                    <h3 className="text-lg font-bold text-ink">
                        {t("profile.editProfile")}
                    </h3>

                    {/* Full Name */}
                    <div>
                        <label className="block text-xs font-medium text-ink/50 mb-1.5">
                            {t("editProfile.fullName")}
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder={t("editProfile.fullNamePlaceholder")}
                            maxLength={64}
                            className={inputClass}
                        />
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="block text-xs font-medium text-ink/50 mb-1.5">
                            {t("editProfile.bio")}
                        </label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder={t("editProfile.bioPlaceholder")}
                            maxLength={160}
                            rows={3}
                            className={`${inputClass} resize-none`}
                        />
                        <p className="text-right text-xs text-ink/30 mt-1">
                            {bio.length}/160
                        </p>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-xs font-medium text-ink/50 mb-1.5">
                            {t("editProfile.location")}
                        </label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder={t("editProfile.locationPlaceholder")}
                            maxLength={64}
                            className={inputClass}
                        />
                    </div>

                    {/* Socials */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-ink/50">
                                {t("editProfile.socials")}
                            </label>
                            <button
                                type="button"
                                onClick={addSocial}
                                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <Plus size={12} />
                                {t("editProfile.add")}
                            </button>
                        </div>

                        <div className="space-y-2">
                            {socials.length === 0 && (
                                <p className="text-xs text-ink/30 py-1">
                                    {t("editProfile.noSocials")}
                                </p>
                            )}
                            {socials.map((entry, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        type="text"
                                        value={entry.key}
                                        onChange={(e) =>
                                            updateSocial(
                                                i,
                                                "key",
                                                e.target.value,
                                            )
                                        }
                                        placeholder={t(
                                            "editProfile.socialLabelPlaceholder",
                                        )}
                                        maxLength={32}
                                        className="w-24 shrink-0 bg-ink/5 border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-ink/30 outline-none focus:border-ink/30 transition-colors"
                                    />
                                    <input
                                        type="text"
                                        value={entry.value}
                                        onChange={(e) =>
                                            updateSocial(
                                                i,
                                                "value",
                                                e.target.value,
                                            )
                                        }
                                        placeholder="https://..."
                                        className="flex-1 min-w-0 bg-ink/5 border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-ink/30 outline-none focus:border-ink/30 transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeSocial(i)}
                                        className="p-2 text-ink/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-400">{error}</p>}

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="rounded-full border border-ink/10 px-4 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-50"
                        >
                            {t("common.cancel")}
                        </button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            size="sm"
                        >
                            {isLoading ? t("common.saving") : t("common.save")}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
