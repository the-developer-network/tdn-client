import type { MediaUploadResponse, Post, ProfileData } from "./api-types";

const BASE_URL = `https://api.developernetwork.net/api/v1`;

export async function getProfile(): Promise<ProfileData> {
    const token = localStorage.getItem("access_token");

    if(!token) throw new Error("Failed Access Token")

    const userRes = await fetch(`${BASE_URL}/users/me`, {
        method: "GET",
        headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        },
    })

    if(!userRes.ok) throw new Error("Failed User Response");

    const userData = await userRes.json();
    
    const safeUsername = encodeURIComponent(userData.username);

    const res = await fetch(`${BASE_URL}/profiles/${safeUsername}`);

    if(!res.ok) throw new Error("Failed profile");

    const result = await res.json();

    return result.data;
}

export async function getPosts(page: number = 1, limit: number = 10, type?: string): Promise<Post[]> {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    

    if (type) {
        params.append("type", type);
    }

    const res = await fetch(`${BASE_URL}/posts?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) throw new Error("Failed Posts Data");

    const result = await res.json();
    return result.data; 
}

export async function createPost(content: string, type: string, mediaUrls: string[] = []): Promise<Post> {
    const token = localStorage.getItem("access_token");
    
    const res = await fetch(`${BASE_URL}/posts`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ content, type, mediaUrls })
    });

    if (!res.ok) throw new Error("Post created failed.");
    const result = await res.json();
    return result.data;
}

export async function uploadMedia(files: File[]): Promise<MediaUploadResponse> {
    const token = localStorage.getItem("access_token");
    const formData = new FormData();
    

    files.forEach((file) => {
        formData.append("files", file); 
    });

    const res = await fetch(`${BASE_URL}/media`, {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${token}` 
        },
        body: formData
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Media failed.");
    }

    return res.json();
}
