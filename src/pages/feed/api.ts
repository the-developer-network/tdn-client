const BASE_URL = `https://api.developernetwork.net/api/v1`;


export async function getProfile() {
    const token = localStorage.getItem("access_token");

    if(!token) throw new Error("Failed Access Todo") // TODO REFRESH TOKEN


    const userRes = await fetch(`${BASE_URL}/users/me`, {
        method: "GET",
        headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        },
    })

    if(!userRes.ok) throw new Error("Failed User Response");

    const userData = await userRes.json();

    console.log(userData);

    const res = await fetch(`${BASE_URL}/profiles/${userData.username}`);

    if(!res.ok) throw new Error("Failed profile");

    const data = await res.json();
    
    return data.data;
}