import { http, HttpResponse } from "msw";

const BASE = "http://localhost:8080/api/v1";

const mockUser = {
    id: "user-1",
    username: "testuser",
    fullName: "Test User",
    avatarUrl: "https://example.com/avatar.png",
    isEmailVerified: true,
};

const mockAccessToken = "mock-access-token";
const mockExpiresAt = Date.now() + 3_600_000;

const mockPost = {
    id: "post-1",
    content: "Hello world",
    type: "COMMUNITY",
    mediaUrls: [],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    isBookmarked: false,
    author: {
        id: "user-1",
        username: "testuser",
        fullName: "Test User",
        avatarUrl: "https://example.com/avatar.png",
    },
    tags: [],
};

const mockComment = {
    id: "comment-1",
    content: "Nice post!",
    mediaUrls: [],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    replyCount: 0,
    isLiked: false,
    isBookmarked: false,
    author: {
        id: "user-1",
        username: "testuser",
        fullName: "Test User",
        avatarUrl: "https://example.com/avatar.png",
    },
    parentId: null,
    postId: "post-1",
    articleId: null,
};

/**
 * List responses carry `ArticleSummarySchema` — every field except `body`.
 * The detail fixture adds it back. Keeping the two apart here is what stops a
 * card test from passing on a `body` the real list endpoint never sends.
 */
const mockArticleSummary = {
    id: "article-1",
    slug: "clean-architecture-with-fastify",
    title: "Clean Architecture with Fastify",
    excerpt: "How to keep transport concerns out of your domain layer.",
    coverImageUrl: "https://example.com/cover.png",
    coverImageAlt: "A cover image",
    readingTimeMinutes: 7,
    likeCount: 3,
    commentCount: 1,
    isLiked: false,
    isBookmarked: false,
    status: "PUBLISHED",
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    author: {
        id: "user-1",
        username: "testuser",
        fullName: "Test User",
        avatarUrl: "https://example.com/avatar.png",
    },
    tags: [{ name: "fastify" }],
    categories: ["BACKEND"],
};

const mockArticle = {
    ...mockArticleSummary,
    body: "# Heading\n\nSome **markdown** body.",
};

const mockArticleComment = {
    ...mockComment,
    id: "article-comment-1",
    postId: null,
    articleId: "article-1",
};

const mockProfile = {
    userId: "user-1",
    username: "testuser",
    fullName: "Test User",
    bio: "I write code.",
    location: "Istanbul",
    avatarUrl: "https://example.com/avatar.png",
    bannerUrl: "https://example.com/banner.png",
    socials: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    followersCount: 0,
    followingCount: 0,
    postCount: 0,
    isMe: false,
    isFollowing: false,
};

const mockNotification = {
    recipientId: "user-1",
    issuerId: "user-2",
    username: "otheruser",
    type: "LIKE",
    avatarUrl: "https://example.com/avatar2.png",
    referenceId: "post-1",
    createdAt: new Date().toISOString(),
    isRead: false,
};

const mockLoginResponse = {
    accessToken: mockAccessToken,
    expiresAt: mockExpiresAt,
    user: {
        id: mockUser.id,
        username: mockUser.username,
        isEmailVerified: mockUser.isEmailVerified,
    },
};

export const handlers = [
    http.post(`${BASE}/auth/check`, () =>
        HttpResponse.json({ data: { check: true } }),
    ),

    http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ data: mockLoginResponse }),
    ),

    http.post(`${BASE}/auth/register`, () =>
        HttpResponse.json({
            data: {
                id: mockUser.id,
                username: mockUser.username,
                createdAt: new Date().toISOString(),
            },
        }),
    ),

    http.post(
        `${BASE}/auth/send-verification`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.post(`${BASE}/auth/verify-email`, () =>
        HttpResponse.json({ data: { verified: true } }),
    ),

    http.post(
        `${BASE}/auth/forgot-password`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.post(
        `${BASE}/auth/reset-password`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.post(
        `${BASE}/auth/logout`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json({
            data: { accessToken: mockAccessToken, expiresAt: mockExpiresAt },
        }),
    ),

    http.post(`${BASE}/auth/google`, () =>
        HttpResponse.json({ data: mockLoginResponse }),
    ),

    http.post(`${BASE}/oauth/exchange`, () =>
        HttpResponse.json({ data: mockLoginResponse }),
    ),

    http.get(`${BASE}/posts`, () => HttpResponse.json({ data: [mockPost] })),

    http.post(`${BASE}/posts`, () => HttpResponse.json({ data: mockPost })),

    http.get(`${BASE}/posts/bookmarks`, () =>
        HttpResponse.json({ data: { posts: [mockPost], comments: [] } }),
    ),

    http.get(`${BASE}/posts/:postId`, () =>
        HttpResponse.json({ data: mockPost }),
    ),

    http.delete(
        `${BASE}/posts/:postId`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.post(
        `${BASE}/posts/:postId/like`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.delete(
        `${BASE}/posts/:postId/unlike`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.post(
        `${BASE}/posts/:postId/save`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.delete(
        `${BASE}/posts/:postId/unsave`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.get(`${BASE}/articles/me`, () =>
        HttpResponse.json({ data: [mockArticleSummary] }),
    ),

    http.post(`${BASE}/articles/cover`, () =>
        HttpResponse.json({
            data: {
                coverImageKey: "articles/covers/user-1/abc.png",
                coverImageUrl: "https://example.com/cover.png",
            },
        }),
    ),

    http.post(`${BASE}/articles`, () =>
        HttpResponse.json({ data: mockArticle }),
    ),

    http.patch(`${BASE}/articles/:articleId`, () =>
        HttpResponse.json({ data: mockArticle }),
    ),

    http.post(`${BASE}/articles/:articleId/publish`, () =>
        HttpResponse.json({ data: { ...mockArticle, status: "PUBLISHED" } }),
    ),

    http.post(`${BASE}/articles/:articleId/archive`, () =>
        HttpResponse.json({ data: { ...mockArticle, status: "ARCHIVED" } }),
    ),

    http.delete(
        `${BASE}/articles/:articleId`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.get(`${BASE}/articles`, () =>
        HttpResponse.json({ data: [mockArticleSummary] }),
    ),

    http.get(`${BASE}/articles/:slug`, () =>
        HttpResponse.json({ data: mockArticle }),
    ),

    http.post(
        `${BASE}/articles/:articleId/like`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.delete(
        `${BASE}/articles/:articleId/like`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.post(
        `${BASE}/articles/:articleId/bookmark`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.delete(
        `${BASE}/articles/:articleId/bookmark`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.get(`${BASE}/articles/:articleId/comments`, () =>
        HttpResponse.json({ data: [mockArticleComment] }),
    ),

    http.post(`${BASE}/articles/:articleId/comments`, () =>
        HttpResponse.json({ data: mockArticleComment }),
    ),

    http.post(`${BASE}/media`, () =>
        HttpResponse.json({ data: { mediaUrls: [] } }),
    ),

    http.get(`${BASE}/posts/:postId/comments`, () =>
        HttpResponse.json({ data: [mockComment] }),
    ),

    http.post(`${BASE}/posts/:postId/comments`, () =>
        HttpResponse.json({ data: mockComment }),
    ),

    http.get(`${BASE}/comments/:commentId`, () =>
        HttpResponse.json({ data: mockComment }),
    ),

    http.get(`${BASE}/comments/:commentId/replies`, () =>
        HttpResponse.json({ data: [] }),
    ),

    http.delete(
        `${BASE}/comments/:commentId`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.post(
        `${BASE}/comments/:commentId/like`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.delete(
        `${BASE}/comments/:commentId/unlike`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.post(
        `${BASE}/comments/:commentId/save`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.delete(
        `${BASE}/comments/:commentId/unsave`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.get(`${BASE}/notifications`, () =>
        HttpResponse.json({
            data: [mockNotification],
            meta: {
                total: 1,
                currentPage: 1,
                totalPages: 1,
                limit: 20,
            },
        }),
    ),

    http.patch(
        `${BASE}/notifications/read-all`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.get(`${BASE}/profiles/suggestions`, () =>
        HttpResponse.json({ data: [] }),
    ),

    http.get(`${BASE}/profiles/search`, () => HttpResponse.json({ data: [] })),

    http.get(`${BASE}/profiles/me`, () =>
        HttpResponse.json({ data: { ...mockProfile, isMe: true } }),
    ),

    http.get(`${BASE}/profiles/:username`, () =>
        HttpResponse.json({ data: mockProfile }),
    ),

    http.get(`${BASE}/profiles/:username/followers`, () =>
        HttpResponse.json({ data: [] }),
    ),

    http.get(`${BASE}/profiles/:username/following`, () =>
        HttpResponse.json({ data: [] }),
    ),

    http.patch(`${BASE}/profiles/me`, () =>
        HttpResponse.json({ data: mockProfile }),
    ),

    http.patch(`${BASE}/profiles/me/avatar`, () =>
        HttpResponse.json({
            data: { avatarUrl: "https://example.com/new-avatar.png" },
        }),
    ),

    http.patch(`${BASE}/profiles/me/banner`, () =>
        HttpResponse.json({
            data: { bannerUrl: "https://example.com/new-banner.png" },
        }),
    ),

    http.post(`${BASE}/follows`, () => new HttpResponse(null, { status: 204 })),

    http.delete(
        `${BASE}/follows`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.get(`${BASE}/users/:username/posts`, () =>
        HttpResponse.json({ data: [mockPost] }),
    ),

    http.get(`${BASE}/users/me`, () =>
        HttpResponse.json({
            data: {
                id: mockUser.id,
                username: mockUser.username,
                email: "test@example.com",
                isEmailVerified: mockUser.isEmailVerified,
                createdAt: new Date().toISOString(),
            },
        }),
    ),

    http.patch(
        `${BASE}/users/me/username`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.patch(
        `${BASE}/users/me/email`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.patch(
        `${BASE}/users/me/password`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.delete(
        `${BASE}/users/me`,
        () => new HttpResponse(null, { status: 204 }),
    ),

    http.get(`${BASE}/tags/trends`, () =>
        HttpResponse.json({ data: { trending: [] } }),
    ),

    http.get(`${BASE}/tags/search`, () => HttpResponse.json({ data: [] })),

    http.post(`${BASE}/translate`, () =>
        HttpResponse.json({ data: { translatedText: "Translated content" } }),
    ),
];
