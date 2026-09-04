import type { Locale } from "../store/language.store";

const en = {
    "nav.home": "Home",
    "nav.explore": "Explore",
    "nav.notifications": "Notifications",
    "nav.follows": "Follows",
    "nav.bookmarks": "Bookmarks",
    "nav.profile": "Profile",
    "nav.signIn": "Sign In",
    "nav.settings": "Settings",
    "nav.notifs": "Notifs",
    "nav.saved": "Saved",
    "nav.contact": "Contact",
    "nav.social": "Social",
    "nav.messages": "Messages",
    "nav.msgs": "Chat",

    "feed.community": "Community",
    "feed.news": "News",
    "feed.updates": "Updates",
    "feed.articles": "Articles",
    "feed.following": "Following",
    "feed.frontend": "Frontend",
    "feed.backend": "Backend",
    "feed.mobile": "Mobile",
    "feed.game": "Game",
    "feed.ai": "AI",

    "postBox.placeholder": "What are you building today?",
    "postBox.placeholderGuest": "Sign in to share your thoughts...",
    "postBox.post": "Post",
    "postBox.media": "Media",
    "postBox.uploading": "Uploading...",
    "postBox.posting": "Posting...",

    "postList.empty": "Category Empty",
    "postList.noMore": "No more posts",
    "postList.error": "Posts could not be loaded.",
    "postList.tryAgain": "Try Again",
    "postList.loadMoreError": "Failed to load more posts.",

    "quoteList.empty": "No quotes yet",
    "quoteList.error": "Quotes could not be loaded.",
    "quoteList.loadMoreError": "Failed to load more quotes.",

    "articleList.empty": "No articles yet",
    "articleList.noMore": "No more articles",
    "articleList.error": "Articles could not be loaded.",
    "articleList.tryAgain": "Try Again",
    "articleList.loadMoreError": "Failed to load more articles.",

    "article.readingTime": "{{n}} min read",
    "article.shareText": "You should read this article!",
    "article.allCategories": "All",
    "article.like": "Like article",
    "article.bookmark": "Bookmark article",
    "article.share": "Share article",

    "editor.newTitle": "New article",
    "editor.editTitle": "Edit article",
    "editor.titlePlaceholder": "Title",
    "editor.bodyPlaceholder": "Write your article in Markdown...",
    "editor.write": "Write",
    "editor.preview": "Preview",
    "editor.emptyPreview": "Nothing to preview yet.",
    "editor.excerpt": "Excerpt",
    "editor.excerptPlaceholder": "A short summary for cards and search results",
    "editor.excerptHint":
        "Optional. Left empty, it is taken from your opening lines.",
    "editor.tags": "Tags",
    "editor.tagPlaceholder": "Add a tag",
    "editor.tagHint": "Lowercase letters, numbers and hyphens. Enter to add.",
    "editor.tagWillBecome": "Will be added as #{{tag}}",
    "editor.tagsFull": "That is the limit of {{max}} tags.",
    "editor.removeTag": "Remove tag {{tag}}",
    "editor.categories": "Categories",
    "editor.categoriesHint": "Pick up to {{max}}.",
    "editor.addCover": "Add a cover image",
    "editor.removeCover": "Remove cover image",
    "editor.coverAlt": "Cover description",
    "editor.coverAltPlaceholder":
        "Describe the image for people who cannot see it",
    "editor.coverOptional":
        "Optional. Articles read perfectly well without one.",
    "editor.coverTooLarge": "That image is over 5 MB. Pick a smaller one.",
    "editor.coverWrongType":
        "That file type is not supported. Use JPEG, PNG, GIF, WEBP or AVIF.",
    "editor.saving": "Saving...",
    "editor.saved": "Draft saved",
    "editor.unsaved": "Unsaved changes",
    "editor.saveFailed": "Could not save",
    "editor.retrySave": "Retry",
    "editor.needsTitleAndBody":
        "A title and some body text are needed before this can be saved.",
    "editor.bodyTooLong": "The body is over the {{max}} character limit.",
    "editor.titleTooLong": "The title is over the {{max}} character limit.",
    "editor.tooLarge":
        "This article is too large to send. Emoji and accented letters each take several bytes, so it can pass the character limit and still be over the size limit — trim the body a little.",
    "editor.publish": "Publish",
    "editor.publishing": "Publishing...",
    "editor.published": "Your article is live.",
    "editor.archive": "Archive",
    "editor.archived": "Article archived.",
    "editor.archiveTitle": "Archive this article?",
    "editor.archiveBody":
        "It will stop appearing in the feed. You can publish it again later, and its original publish date is kept.",
    "editor.delete": "Delete",
    "editor.deleteTitle": "Delete this article?",
    "editor.deleteBody":
        "This cannot be undone. The article and its comments are removed permanently.",
    "editor.deleted": "Article deleted.",
    "editor.writeArticle": "Write an article",
    "editor.statusDraft": "Draft",
    "editor.statusPublished": "Published",
    "editor.statusArchived": "Archived",
    "editor.leaveWarning": "You have unsaved changes.",

    "post.translate": "Translate post",
    "post.translating": "Translating...",
    "post.translated": "Translated",
    "post.showOriginal": "Show original",
    "post.dismiss": "Dismiss",
    "post.deleteTitle": "Delete post?",
    "post.deleteBody":
        "This action cannot be undone. The post will be permanently removed.",
    "post.shareText": "You should check out this post!",
    "post.comments": "Comments",
    "post.like": "Like post",
    "post.bookmark": "Bookmark post",
    "post.share": "Share post",
    "post.quote": "Quote post",
    "post.reposted": "reposted",
    "post.viewQuotes": "View quotes",

    "quote.title": "Quote post",
    "quote.placeholder": "Add a comment (optional)",
    "quote.submit": "Quote",
    "quote.posting": "Posting...",
    "quote.success": "Your quote has been shared.",
    "quote.tooLong": "A quote can be at most {{n}} characters.",

    "commentBox.placeholder": "Write a comment...",
    "commentBox.reply": "Reply",
    "commentBox.posting": "Posting...",
    "commentBox.uploading": "Uploading...",

    "comment.translate": "Translate comment",
    "comment.deleteTitle": "Delete comment?",
    "comment.deleteBody":
        "This action cannot be undone. The comment will be permanently removed.",
    "comment.shareText": "Check out this comment!",

    "commentList.empty": "No comments yet. Be the first!",
    "commentList.tryAgain": "Try Again",

    "notif.title": "Notifications",
    "notif.unread": "{{n}} unread",
    "notif.markAllRead": "Mark all read",
    "notif.emptyTitle": "No notifications yet",
    "notif.emptyBody":
        "When someone follows or interacts with you, you'll see it here.",
    "notif.error": "Failed to load",
    "notif.tryAgain": "Try again",
    "notif.loadMore": "Load more",
    "notif.loading": "Loading...",
    "notif.loadingMore": "Loading...",

    "notif.follow": "@{{username}} started following you",
    "notif.newPost": "@{{username}} published a new post",
    "notif.like": "@{{username}} liked your post",
    "notif.comment": "@{{username}} commented on your post",
    "notif.commentLike": "@{{username}} liked your comment",
    "notif.commentReply": "@{{username}} replied to your comment",
    "notif.quote": "@{{username}} quoted your post",
    // Deliberately not "tagged you": the API calls it a mention and so does
    // the doc, and the word has to survive the reader going to look for it.
    "notif.mention": "@{{username}} mentioned you",
    "notif.mediaRejected":
        "A media item in your post was removed for breaking the community rules.",
    "notif.generic": "@{{username}} sent you a notification",

    "notif.justNow": "just now",
    "notif.minutesAgo": "{{n}}m ago",
    "notif.hoursAgo": "{{n}}h ago",
    "notif.daysAgo": "{{n}}d ago",

    "bookmarks.title": "Bookmarks",
    "bookmarks.subtitle": "Posts, comments & articles you saved",
    "bookmarks.tabPosts": "Posts",
    "bookmarks.tabComments": "Comments",
    "bookmarks.tabArticles": "Articles",
    "bookmarks.emptyTitle": "Save posts for later",
    "bookmarks.emptyBody":
        "Don't let the good ones get away! Bookmark posts to easily find them again in the future.",

    "follows.title": "Who to Follow",
    "follows.subtitle": "Developers you might want to follow",
    "follows.emptyTitle": "No suggestions yet",
    "follows.emptyBody": "Check back later for personalized recommendations.",
    "follows.tryAgain": "Try again",

    "onboarding.stepOfTwo": "Step {{n}} of 2",
    "onboarding.fieldsTitle": "What do you build?",
    "onboarding.fieldsBody":
        "Pick at least one field. We use it to find the accounts worth your feed.",
    "onboarding.continue": "Continue",
    "onboarding.accountsTitle": "Follow at least {{n}} accounts",
    "onboarding.accountsTitleOne": "Follow one more account",
    "onboarding.accountsBody":
        "These news bots publish in the fields you picked. Follow a few and your feed starts full.",
    "onboarding.progress": "{{n}} of {{total}} followed",
    "onboarding.loadMore": "Show more",
    "onboarding.loadingMore": "Loading…",
    "onboarding.finish": "Go to my feed",
    "onboarding.back": "Back",
    "onboarding.emptyTitle": "No bots for these fields yet",
    "onboarding.emptyBody":
        "Nothing is publishing in these fields right now. Go back and pick another field, or carry on and follow people as you find them.",
    "onboarding.tryAgain": "Try again",
    "onboarding.loadFailed": "Suggestions could not be loaded.",

    "profile.editProfile": "Edit Profile",
    "profile.follow": "Follow",
    "profile.following": "Following",
    "profile.followers": "Followers",
    "profile.followingCount": "Following",
    "profile.joined": "Joined",
    "profile.posts": "posts",
    "profile.tabPosts": "Posts",
    "profile.tabArticles": "Articles",
    "profile.follower": "follower",
    "profile.followerPlural": "followers",
    "profile.settings": "Settings",

    "followList.noFollowers": "No followers yet.",
    "followList.noFollowing": "Not following anyone yet.",

    "editProfile.fullName": "Full Name",
    "editProfile.fullNamePlaceholder": "Your full name",
    "editProfile.bio": "Bio",
    "editProfile.bioPlaceholder": "Tell the world about yourself",
    "editProfile.location": "Location",
    "editProfile.locationPlaceholder": "e.g. Istanbul, Turkey",
    "editProfile.socials": "Socials",
    "editProfile.add": "Add",
    "editProfile.noSocials": "No social links added.",
    "editProfile.socialLabelPlaceholder": "Label",
    "editProfile.uploadTooLarge": "File is too large. Maximum size is 5 MB.",

    "search.placeholder": "Search profiles...",
    "search.searching": "Searching...",
    "search.noResults": "No profiles found.",

    "explore.title": "Explore",
    "explore.searchPlaceholder": "Search tags...",
    "explore.noTagsFound": 'No tags found for "{{query}}"',
    "explore.trendingTopics": "Trending Topics",
    "explore.lastDays": "last 7 days",
    "explore.postsTagged": "Posts tagged with #{{tag}}",
    "explore.postsTaggedSubtitle": "Posts tagged with #{{tag}}",
    "explore.articlesTaggedSubtitle": "Articles tagged with #{{tag}}",

    "trending.title": "Trending Topics",
    "trending.subtitle": "Popular on TDN right now",
    "trending.loading": "Loading...",
    "trending.empty": "No trends yet.",
    "trending.showMore": "Show more",
    "trending.posts": "posts",

    "settings.title": "Settings",
    "settings.subtitle": "Manage your account",
    "settings.language": "Language",
    "settings.languageSubtitle": "Choose your interface language",
    "settings.english": "English",
    "settings.turkish": "Türkçe",
    "settings.theme": "Theme",
    "settings.themeSubtitle": "Choose how TDN looks on this device.",
    "settings.themeDark": "Dark",
    "settings.themeLight": "Light",
    "settings.themeSystem": "System",
    "settings.accountInfo": "Account Info",
    "settings.accountInfoLoading": "Loading account info…",
    "settings.username": "Username",
    "settings.email": "Email",
    "settings.emailVerified": "Email Verified",
    "settings.yes": "Yes",
    "settings.no": "No",
    "settings.signInMethods": "Sign-in Methods",
    "settings.memberSince": "Member Since",
    "settings.changeUsername": "Change Username",
    "settings.newUsernamePlaceholder": "New username",
    "settings.updateUsername": "Update Username",
    "settings.saving": "Saving…",
    "settings.usernameSuccess": "Username updated successfully.",
    "settings.changeEmail": "Change Email",
    "settings.newEmailPlaceholder": "New email address",
    "settings.updateEmail": "Update Email",
    "settings.emailSuccess":
        "Email updated. Check your inbox to verify your new address.",
    "settings.changePassword": "Change Password",
    "settings.currentPasswordPlaceholder": "Current password",
    "settings.newPasswordPlaceholder": "New password (min 8 characters)",
    "settings.confirmPasswordPlaceholder": "Confirm new password",
    "settings.updatePassword": "Update Password",
    "settings.passwordSuccess": "Password updated successfully.",
    "settings.passwordMismatch": "Passwords do not match.",
    "settings.passwordTooShort": "Password must be at least 8 characters.",
    "settings.verifyEmail": "Verify Email",
    "settings.verifyEmailBody":
        "Your email address is not verified. Verify it to secure your account.",
    "settings.sendVerification": "Send Verification Code",
    "settings.sendingCode": "Sending…",
    "settings.codeSent": "Code sent! Check your inbox.",
    "settings.codeInputPlaceholder": "8-digit code",
    "settings.verify": "Verify",
    "settings.verifying": "Verifying…",
    "settings.resend": "Resend",
    "settings.dangerZone": "Danger Zone",
    "settings.logOut": "Log out",
    "settings.logOutSubtitle": "Sign out of your account on this device.",
    "settings.deleteAccount": "Delete Account",
    "settings.deleteAccountSubtitle":
        "Your account will be deactivated. You have 30 days to recover it before permanent deletion.",
    "settings.deleteAccountTitle": "Delete your account?",
    "settings.deleteAccountBody":
        "Your account will be deactivated immediately. You have 30 days to log back in and recover it before it is permanently deleted.",
    "settings.deleteAccountPasswordLabel": "Enter your password to confirm.",
    "settings.deleteAccountPasswordPlaceholder": "Password",
    "settings.deleteAccountPasswordRequired":
        "Please enter your password to confirm.",
    "settings.deleteAccountConfirm": "Yes, delete my account",
    "settings.deleting": "Deleting…",
    "settings.cancel": "Cancel",
    "settings.delete": "Delete",

    "auth.joinTitle": "Join TDN today",
    "auth.identifierPlaceholder": "Phone, email, or username",
    "auth.or": "or",
    "auth.googleSignUp": "Sign up with Google",
    "auth.githubSignUp": "Sign up with GitHub",
    "auth.next": "Next",
    "auth.checking": "Checking...",
    "auth.termsPrefix": "By signing up, you agree to the",
    "auth.terms": "Terms of Service",
    "auth.and": "and",
    "auth.privacy": "Privacy Policy",
    "auth.termsSuffix": ".",
    "auth.passwordTitle": "Enter your password",
    "auth.loggingInAs": "Logging in as",
    "auth.forgotPassword": "Forgot password?",
    "auth.login": "Log in",
    "auth.loggingIn": "Logging in...",
    "auth.changeAccount": "Change account",
    "auth.passwordPlaceholder": "Password",
    "auth.registerTitle": "Create your account",
    "auth.registerSubtitle": "Join the developer network today.",
    "auth.emailPlaceholder": "Email",
    "auth.usernamePlaceholder": "Username",
    "auth.register": "Register",
    "auth.creatingAccount": "Creating account...",
    "auth.back": "Back",
    "auth.verifyTitle": "Check your email",
    "auth.verifySubtitle":
        "We sent an 8-digit verification code to your inbox. Enter it below to verify your account.",
    "auth.verifyEmail": "Verify Email",
    "auth.verifying": "Verifying...",
    "auth.skipForNow": "Skip for now",
    "auth.resendCode": "Didn't receive a code? Resend",
    "auth.resending": "Sending...",
    "auth.forgotTitle": "Forgot Password?",
    "auth.forgotSubtitle":
        "Enter your email address and we'll send you a code to reset your password.",
    "auth.sendCode": "Send Code",
    "auth.sending": "Sending...",
    "auth.backToLogin": "Back to Login",
    "auth.resetTitle": "Reset Password",
    "auth.resetSubtitle": "Check your inbox for the code sent to",
    "auth.otpPlaceholder": "Enter OTP Code",
    "auth.newPasswordPlaceholder": "New Password",
    "auth.updatePassword": "Update Password",
    "auth.resetting": "Resetting...",
    "auth.otpLengthError": "Enter the 8-character code sent to your email.",
    "auth.passwordTooShort": "Password must be at least 8 characters.",
    "auth.recoveryTitle": "Account Pending Deletion",
    "auth.recoverySubtitle":
        "Your account is scheduled for deletion. Would you like to recover it and continue where you left off?",
    "auth.recoverAccount": "Yes, recover my account",
    "auth.recovering": "Recovering...",
    "auth.recoveryBack": "No, go back",
    "auth.recoveryExpiry": "This recovery link expires in 15 minutes.",
    "auth.forgotEmailPlaceholder": "example@mail.com",
    "auth.codeResent": "A new code has been sent to your email.",
    "auth.invalidEmail": "Please enter a valid email.",
    "auth.resetSuccess": "Your password has been reset successfully.",

    "page.post": "Post",
    "page.postNotFound": "Post not found.",
    "page.quotes": "Quotes",
    "page.article": "Article",
    "page.articleNotFound": "Article not found.",
    "page.comment": "Comment",
    "page.commentNotFound": "Comment not found.",
    "page.commentError": "Comment could not be loaded.",
    "page.loadingComment": "Loading...",
    "page.loadingReplies": "Loading replies...",

    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.deleting": "Deleting...",
    "common.save": "Save",
    "common.saving": "Saving...",
    "common.loading": "Loading...",
    "common.tryAgain": "Try again",
    "common.loadMore": "Load more",
    "common.loadingMore": "Loading...",
    "common.back": "Back",
    "common.linkCopied": "Link copied to clipboard!",
    "common.shareFailed": "Could not share the link. Please try again.",
    "common.notificationsUnavailable":
        "Real-time notifications are currently unavailable.",

    "common.dismiss": "Dismiss",
    "common.syncingAccount": "Synchronizing account...",

    "error.timeout": "Request timed out. Please check your connection.",
    "error.network":
        "Unable to connect. Please check your internet connection.",
    "error.api": "An API error occurred.",
    "error.unexpected": "An unexpected error occurred.",
    "error.server":
        "The server could not complete the request. Please try again.",

    // Moderation. Keyed by the API's `title`, because two of these share a
    // status and the wording has to be ours — see `media-errors.ts`.
    "error.mediaRejected":
        "That file breaks the community rules and was not uploaded.",
    "error.moderationUnavailable":
        "Media checks are unavailable right now. Please try again in a moment.",
    // Both 415s name the formats rather than the file: the check reads the
    // bytes and ignores the extension, so someone holding a HEIC named
    // ".png" is otherwise told their image is not an image.
    "error.invalidMediaType":
        "That file type is not supported, whatever it is named. Use JPEG, PNG, GIF, WEBP, AVIF, MP4, MOV, WEBM or 3GP.",
    "error.invalidFileType":
        "That file type is not supported, whatever it is named. Use JPEG, PNG, GIF, WEBP or AVIF.",
    "error.payloadTooLarge": "That file is larger than 5 MB.",
    "error.mediaNotOwned":
        "That upload has already been used. Please pick the file again.",
    // The two the message upload adds. Neither is a verdict on the files, so
    // neither clears the selection — see `VERDICT_TITLES` in `media-errors.ts`.
    "error.mediaLimitExceeded": "You can attach up to 4 files.",
    "error.noMediaProvided": "Pick a file first.",
    // The second and last exception to showing a 4xx `detail` verbatim. The
    // write budget is five a minute, low enough that an ordinary exchange
    // reaches it, so this sentence lands mid-conversation in front of someone
    // who is not reading English by choice.
    "error.rateLimited": "You are going a little fast. Try again in a minute.",
    // Mirrored in the composers so the server's 400 is never reached; the
    // wording is ours because the limit is a rule, not a failure.
    "error.mentionLimit": "You can mention up to {{max}} people.",

    "mention.suggestions": "People matching what you typed",
    "mention.searching": "Searching…",

    "media.sensitive": "Sensitive content",
    "media.sensitiveReveal": "Tap to view",
    "media.processing": "This video is being checked",
    "media.refresh": "Refresh",
    "media.removed": "Media removed",
    // Said plainly, because the alternative is a blank space where an
    // attachment was and a reader wondering whether it failed to load.
    "media.removedHint": "The attachments broke the community rules.",

    "messages.title": "Messages",
    "messages.tabInbox": "Messages",
    "messages.tabRequests": "Requests",
    "messages.empty": "No conversations yet",
    "messages.emptyHint": "Open a profile and send the first message.",
    "messages.emptyRequests": "No message requests",
    "messages.emptyRequestsHint":
        "A message from someone you do not follow lands here first.",
    "messages.retry": "Try again",
    "messages.loadMore": "Load more",
    "messages.loadOlder": "Load older messages",
    "messages.notFound": "Conversation not found",
    "messages.notFoundHint":
        "It may have been removed, or it is not yours to read.",
    "messages.startHint": "Say hello.",
    "messages.newMessage": "Message",
    "messages.back": "Back",
    "messages.seen": "Seen",
    "messages.sent": "Sent",
    "messages.deleted": "This message was deleted",
    // The control on the bubble names its object; the confirm button inside
    // the dialogue does not need to repeat it.
    "messages.delete": "Delete message",
    "messages.deleteAction": "Delete",
    "messages.deleteConfirm": "Delete this message?",
    "messages.deleteConfirmBody":
        "It disappears for both of you. The place it held stays, so replies to it still make sense.",
    "messages.cancel": "Cancel",
    "messages.placeholder": "Write a message",
    "messages.send": "Send",
    "messages.attach": "Add media",
    "messages.removeAttachment": "Remove attachment",
    "messages.requestNotice":
        "{{name}} wants to send you messages. They cannot see whether you have read this.",
    "messages.accept": "Accept",
    "messages.decline": "Decline",
    "messages.declineConfirm": "Decline this request?",
    "messages.declineConfirmBody":
        "This cannot be undone. Neither of you will be able to write here again.",
    "messages.declined": "This conversation was declined.",
    "messages.cannotSend": "You cannot write here.",
    "messages.awaitingAccept":
        "They will see your messages once they accept the request.",

    "ad.promotion": "Promotion",
    "ad.label": "Ad",
    "ad.cta": "Want to reach developers?",
    "ad.contact": "Advertise on TDN —",

    "offline.message": "You are offline. Some features may not be available.",

    "legal.privacyTitle": "Privacy Policy",
    "legal.termsTitle": "Terms of Service",
    "legal.brand": "TDN — The Developer Network",
    "legal.lastUpdated": "Last updated: April 2026",

    "contact.title": "Contact",
    "contact.seoTitle": "Contact — TDN",
    "contact.seoDescription": "Get in touch with the TDN team.",
    "contact.intro":
        "Have a question, feedback, or need to report an issue? We'd love to hear from you. Reach out to the TDN team using the contact information below.",
    "contact.generalTitle": "General & Support Inquiries",
    "contact.responseTime":
        "We aim to respond to all emails within 2–3 business days.",
    "contact.aboutTitle": "What Can You Contact Us About?",
    "contact.aboutAccount": "Account issues or access problems",
    "contact.aboutAbuse": "Reporting abusive or policy-violating content",
    "contact.aboutPrivacy": "Privacy or data requests (GDPR / CCPA)",
    "contact.aboutBugs": "Bug reports and feature suggestions",
    "contact.aboutBusiness": "Business or partnership inquiries",
    "contact.aboutAds": "Advertising-related questions",
    "contact.openSourceTitle": "Open Source",
    "contact.openSourceBody":
        "TDN is open source. For code contributions, bug reports, or technical discussions, you can open an issue or pull request directly in our GitHub repositories.",

    "socials.title": "Socials",
    "socials.intro":
        "Follow us on social media for updates, news, and community content.",
    "socials.instagramDescription":
        "Our official Instagram account for photos, updates, and community highlights.",
    "socials.xDescription":
        "Our X account for news, announcements, and developer community discussions.",
    "socials.githubDescription":
        "Our GitHub organization for open source projects, contributions, and the developer network.",
    "socials.footer": "New social channels will be announced here.",

    "privacy.intro":
        "Your privacy is important to us. This Privacy Policy explains what information TDN (The Developer Network) collects, how we use it, and the choices you have. By using TDN, you agree to the practices described in this policy.",
    "privacy.s1Title": "1. Information We Collect",
    "privacy.s1EmailLead": "When you register with an email and password:",
    "privacy.s1Email": "Email address",
    "privacy.s1Username": "Username",
    "privacy.s1Password":
        "Password — stored as a secure one-way hash (argon2). We never store or transmit your plain-text password.",
    "privacy.s1OauthLead":
        "When you register or sign in with Google or GitHub:",
    "privacy.s1OauthEmail": "Email address (provided by the OAuth provider)",
    "privacy.s1OauthName": "Display name (if available)",
    "privacy.s1OauthAvatar": "Profile picture URL (if available)",
    "privacy.s1OauthNote":
        "We do not receive, request, or store your Google or GitHub password. These services do not share it — and we never ask for it.",
    "privacy.s2Title": "2. How We Use Your Information",
    "privacy.s2Account": "To create and manage your account",
    "privacy.s2Interact":
        "To allow you to post content, follow users, and interact with the community",
    "privacy.s2Email":
        "To send transactional emails such as email verification and password reset",
    "privacy.s2Abuse":
        "To detect and prevent abuse, spam, or policy violations",
    "privacy.s2Improve": "To improve and maintain the platform",
    "privacy.s2Note":
        "We do not sell your personal data to third parties. We do not use your data for advertising profiling.",
    "privacy.s3Title": "3. Cookies & Local Storage",
    "privacy.s3Lead":
        "By using TDN, you agree to our use of cookies and browser local storage. We use these technologies to:",
    "privacy.s3SignedIn":
        "Keep you signed in across sessions (authentication tokens)",
    "privacy.s3Prefs": "Remember your preferences and interface state",
    "privacy.s3Security":
        "Maintain security by validating your session on each request",
    "privacy.s4Title": "4. Security",
    "privacy.s4Lead":
        "We take security seriously. Here's what we do to protect your data:",
    "privacy.s4Hash":
        "Passwords are hashed using bcrypt — a one-way algorithm. Even in the unlikely event of a data breach, your password cannot be recovered from the stored hash.",
    "privacy.s4Jwt":
        "Authentication uses short-lived JWT access tokens paired with secure refresh tokens.",
    "privacy.s4Tls":
        "All traffic between your browser and our servers is encrypted via HTTPS/TLS.",
    "privacy.s4OpenSource":
        "TDN is open source — our client-side code is publicly auditable. We believe transparency strengthens trust.",
    "privacy.s5Title": "5. Data Retention",
    "privacy.s5Body":
        "Your account data is retained as long as your account is active. If you delete your account, your personal information will be removed from our systems within a reasonable period, except where retention is required by law. Some content you posted (e.g. comments) may remain in anonymized form.",
    "privacy.s6Title": "6. Third-Party Services",
    "privacy.s6Lead": "TDN integrates with the following third-party services:",
    "privacy.s6Google": "Google OAuth",
    "privacy.s6GoogleBody":
        "— for sign-in. Governed by Google's Privacy Policy.",
    "privacy.s6Github": "GitHub OAuth",
    "privacy.s6GithubBody":
        "— for sign-in. Governed by GitHub's Privacy Policy.",
    "privacy.s6Cloudflare": "Cloudflare Workers",
    "privacy.s6CloudflareBody": "— for platform hosting and delivery.",
    "privacy.s6Note":
        "Each of these services has its own privacy policy. We encourage you to review them.",
    "privacy.s7Title": "7. Your Rights",
    "privacy.s7Lead": "You have the right to:",
    "privacy.s7Access": "Access the personal data we hold about you",
    "privacy.s7Correct":
        "Correct inaccurate information through your profile settings",
    "privacy.s7Delete": "Delete your account and associated data",
    "privacy.s7Object": "Object to processing of your data where applicable",
    "privacy.s7Note":
        "To exercise these rights, use the account settings or contact us through the platform.",
    "privacy.s8Title": "8. Changes to This Policy",
    "privacy.s8Body":
        "We may update this Privacy Policy from time to time. We will notify users of significant changes through the platform. Continued use after updates constitutes acceptance of the revised policy.",
    "privacy.footer": "Questions about your privacy? Email us at",

    "terms.intro":
        "Welcome to TDN (The Developer Network). By accessing or using TDN, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.",
    "terms.s1Title": "1. Acceptance of Terms",
    "terms.s1Body":
        "By creating an account, browsing the platform, or interacting with any content on TDN, you acknowledge that you have read, understood, and agree to these Terms. These Terms apply to all users — registered or not.",
    "terms.s2Title": "2. Eligibility",
    "terms.s2Body":
        "You must be at least 13 years of age to use TDN. By using TDN, you represent that you meet this requirement. Users under the age of 18 should use the platform only with parental or guardian consent.",
    "terms.s3Title": "3. Community Standards",
    "terms.s3Lead":
        "TDN is a professional developer community. All users are expected to engage respectfully and constructively. The following content is strictly prohibited:",
    "terms.s3Explicit":
        "Sexually explicit, pornographic, or erotic content of any kind",
    "terms.s3Hate":
        "Hate speech, harassment, threats, or discriminatory language",
    "terms.s3Spam": "Spam, phishing, or deceptive content",
    "terms.s3Malware":
        "Malware, exploits, or content promoting unauthorized access to systems",
    "terms.s3Illegal": "Content that violates any applicable law or regulation",
    "terms.s3Impersonation":
        "Impersonation of other individuals, organizations, or entities",
    "terms.s3Note":
        "Violation of these standards may result in content removal, account suspension, or permanent ban without notice.",
    "terms.s4Title": "4. User Content",
    "terms.s4Body1":
        "You retain ownership of the content you post on TDN. However, by posting content, you grant TDN a non-exclusive, royalty-free, worldwide license to display, distribute, and promote your content within the platform.",
    "terms.s4Body2":
        "You are solely responsible for the content you share. TDN does not endorse, verify, or guarantee the accuracy of user-generated content.",
    "terms.s5Title": "5. Open Source & Transparency",
    "terms.s5Body1":
        "TDN is an open source project. The source code for the client application is publicly available. We believe in transparency — you can inspect how the platform is built and verify our security practices yourself.",
    "terms.s5Body2":
        "Contributing to TDN's open source repositories is welcome and governed by the respective repository's license and contribution guidelines.",
    "terms.s6Title": "6. Account Security",
    "terms.s6Body1":
        "You are responsible for maintaining the confidentiality of your account credentials. Do not share your password with anyone. TDN will never ask for your password via email or any communication channel.",
    "terms.s6Body2":
        "If you suspect unauthorized access to your account, please change your password immediately and contact support.",
    "terms.s7Title": "7. Third-Party Authentication",
    "terms.s7Body":
        "TDN supports sign-in via Google and GitHub (OAuth 2.0). When you authenticate using these providers, TDN only receives your public profile information (such as your email address and display name) as permitted by those services. Your Google or GitHub password is never transmitted to or stored by TDN.",
    "terms.s8Title": "8. Termination",
    "terms.s8Body":
        "TDN reserves the right to suspend or terminate your account at any time, with or without notice, for violations of these Terms or for any conduct deemed harmful to the community or platform. You may also delete your account at any time through the platform settings.",
    "terms.s9Title": "9. Disclaimer of Warranties",
    "terms.s9Body":
        'TDN is provided "as is" without warranties of any kind, either express or implied. We do not guarantee uninterrupted access to the platform and are not liable for any loss of data or damages resulting from use of the service.',
    "terms.s10Title": "10. Changes to These Terms",
    "terms.s10Body":
        "We may update these Terms from time to time. Continued use of TDN after changes are posted constitutes acceptance of the revised Terms. We encourage you to review this page periodically.",
    "terms.footer": "Questions? Email us at",
} as const;

export type TranslationKey = keyof typeof en;

const tr: Record<TranslationKey, string> = {
    "nav.home": "Ana Sayfa",
    "nav.explore": "Keşfet",
    "nav.notifications": "Bildirimler",
    "nav.follows": "Takipler",
    "nav.bookmarks": "Kaydedilenler",
    "nav.profile": "Profil",
    "nav.signIn": "Giriş Yap",
    "nav.settings": "Ayarlar",
    "nav.notifs": "Bildirim",
    "nav.saved": "Kayıtlar",
    "nav.contact": "İletişim",
    "nav.social": "Sosyal",
    "nav.messages": "Mesajlar",
    "nav.msgs": "Mesaj",

    "feed.community": "Topluluk",
    "feed.news": "Haberler",
    "feed.updates": "Güncellemeler",
    "feed.articles": "Makaleler",
    "feed.following": "Takip",
    "feed.frontend": "Frontend",
    "feed.backend": "Backend",
    "feed.mobile": "Mobil",
    "feed.game": "Oyun",
    "feed.ai": "YZ",

    "postBox.placeholder": "Bugün ne inşa ediyorsun?",
    "postBox.placeholderGuest": "Düşüncelerini paylaşmak için giriş yap...",
    "postBox.post": "Paylaş",
    "postBox.media": "Medya",
    "postBox.uploading": "Yükleniyor...",
    "postBox.posting": "Paylaşılıyor...",

    "postList.empty": "Kategori Boş",
    "postList.noMore": "Daha fazla gönderi yok",
    "postList.error": "Gönderiler yüklenemedi.",
    "postList.tryAgain": "Tekrar Dene",
    "postList.loadMoreError": "Daha fazla gönderi yüklenemedi.",

    "quoteList.empty": "Henüz alıntı yok",
    "quoteList.error": "Alıntılar yüklenemedi.",
    "quoteList.loadMoreError": "Daha fazla alıntı yüklenemedi.",

    "articleList.empty": "Henüz makale yok",
    "articleList.noMore": "Başka makale yok",
    "articleList.error": "Makaleler yüklenemedi.",
    "articleList.tryAgain": "Tekrar Dene",
    "articleList.loadMoreError": "Daha fazla makale yüklenemedi.",

    "article.readingTime": "{{n}} dk okuma",
    "article.shareText": "Bu makaleyi okumalısın!",
    "article.allCategories": "Tümü",
    "article.like": "Makaleyi beğen",
    "article.bookmark": "Makaleyi kaydet",
    "article.share": "Makaleyi paylaş",

    "editor.newTitle": "Yeni makale",
    "editor.editTitle": "Makaleyi düzenle",
    "editor.titlePlaceholder": "Başlık",
    "editor.bodyPlaceholder": "Makaleni Markdown ile yaz...",
    "editor.write": "Yaz",
    "editor.preview": "Önizle",
    "editor.emptyPreview": "Önizlenecek bir şey yok.",
    "editor.excerpt": "Özet",
    "editor.excerptPlaceholder": "Kartlarda ve aramada görünecek kısa açıklama",
    "editor.excerptHint":
        "İsteğe bağlı. Boş bırakırsan giriş satırlarından türetilir.",
    "editor.tags": "Etiketler",
    "editor.tagPlaceholder": "Etiket ekle",
    "editor.tagHint": "Küçük harf, rakam ve tire. Eklemek için Enter.",
    "editor.tagWillBecome": "#{{tag}} olarak eklenecek",
    "editor.tagsFull": "Etiket sınırı {{max}}.",
    "editor.removeTag": "{{tag}} etiketini kaldır",
    "editor.categories": "Kategoriler",
    "editor.categoriesHint": "En fazla {{max}} tane seç.",
    "editor.addCover": "Kapak görseli ekle",
    "editor.removeCover": "Kapak görselini kaldır",
    "editor.coverAlt": "Kapak açıklaması",
    "editor.coverAltPlaceholder": "Görseli göremeyenler için tarif et",
    "editor.coverOptional":
        "İsteğe bağlı. Makale kapaksız da gayet iyi okunur.",
    "editor.coverTooLarge": "Bu görsel 5 MB'ı aşıyor. Daha küçüğünü seç.",
    "editor.coverWrongType":
        "Bu dosya türü desteklenmiyor. JPEG, PNG, GIF, WEBP veya AVIF kullan.",
    "editor.saving": "Kaydediliyor...",
    "editor.saved": "Taslak kaydedildi",
    "editor.unsaved": "Kaydedilmemiş değişiklikler",
    "editor.saveFailed": "Kaydedilemedi",
    "editor.retrySave": "Tekrar dene",
    "editor.needsTitleAndBody":
        "Kaydedebilmek için bir başlık ve biraz metin gerekiyor.",
    "editor.bodyTooLong": "Metin {{max}} karakter sınırını aşıyor.",
    "editor.titleTooLong": "Başlık {{max}} karakter sınırını aşıyor.",
    "editor.tooLarge":
        "Bu makale gönderilemeyecek kadar büyük. Emoji ve Türkçe harfler birkaç bayt yer kaplar, yani karakter sınırını geçmeden boyut sınırını aşabilir — metni biraz kısalt.",
    "editor.publish": "Yayınla",
    "editor.publishing": "Yayınlanıyor...",
    "editor.published": "Makalen yayında.",
    "editor.archive": "Arşivle",
    "editor.archived": "Makale arşivlendi.",
    "editor.archiveTitle": "Makale arşivlensin mi?",
    "editor.archiveBody":
        "Akışta görünmeyi bırakır. Sonra tekrar yayınlayabilirsin, ilk yayın tarihi korunur.",
    "editor.delete": "Sil",
    "editor.deleteTitle": "Makale silinsin mi?",
    "editor.deleteBody":
        "Bu geri alınamaz. Makale ve yorumları kalıcı olarak kaldırılır.",
    "editor.deleted": "Makale silindi.",
    "editor.writeArticle": "Makale yaz",
    "editor.statusDraft": "Taslak",
    "editor.statusPublished": "Yayında",
    "editor.statusArchived": "Arşiv",
    "editor.leaveWarning": "Kaydedilmemiş değişikliklerin var.",

    "post.translate": "Gönderiyi çevir",
    "post.translating": "Çeviriliyor...",
    "post.translated": "Çevrildi",
    "post.showOriginal": "Orijinali göster",
    "post.dismiss": "Kapat",
    "post.deleteTitle": "Gönderi silinsin mi?",
    "post.deleteBody":
        "Bu işlem geri alınamaz. Gönderi kalıcı olarak kaldırılacak.",
    "post.shareText": "Bu gönderiye bir göz atmalısın!",
    "post.comments": "Yorumlar",
    "post.like": "Gönderiyi beğen",
    "post.bookmark": "Gönderiyi kaydet",
    "post.share": "Gönderiyi paylaş",
    "post.quote": "Gönderiyi alıntıla",
    "post.reposted": "yeniden paylaştı",
    "post.viewQuotes": "Alıntıları gör",

    "quote.title": "Gönderiyi alıntıla",
    "quote.placeholder": "Bir yorum ekle (opsiyonel)",
    "quote.submit": "Alıntıla",
    "quote.posting": "Paylaşılıyor...",
    "quote.success": "Alıntın paylaşıldı.",
    "quote.tooLong": "Bir alıntı en fazla {{n}} karakter olabilir.",

    "commentBox.placeholder": "Yorum yaz...",
    "commentBox.reply": "Yanıtla",
    "commentBox.posting": "Paylaşılıyor...",
    "commentBox.uploading": "Yükleniyor...",

    "comment.translate": "Yorumu çevir",
    "comment.deleteTitle": "Yorum silinsin mi?",
    "comment.deleteBody":
        "Bu işlem geri alınamaz. Yorum kalıcı olarak kaldırılacak.",
    "comment.shareText": "Bu yoruma bir göz at!",

    "commentList.empty": "Henüz yorum yok. İlk siz olun!",
    "commentList.tryAgain": "Tekrar Dene",

    "notif.title": "Bildirimler",
    "notif.unread": "{{n}} okunmamış",
    "notif.markAllRead": "Tümünü okundu işaretle",
    "notif.emptyTitle": "Henüz bildirim yok",
    "notif.emptyBody":
        "Birisi sizi takip ettiğinde veya etkileşim kurduğunda burada görünecek.",
    "notif.error": "Yüklenemedi",
    "notif.tryAgain": "Tekrar dene",
    "notif.loadMore": "Daha fazla yükle",
    "notif.loading": "Yükleniyor...",
    "notif.loadingMore": "Yükleniyor...",

    "notif.follow": "@{{username}} sizi takip etmeye başladı",
    "notif.newPost": "@{{username}} yeni bir gönderi yayınladı",
    "notif.like": "@{{username}} gönderinizi beğendi",
    "notif.comment": "@{{username}} gönderinize yorum yaptı",
    "notif.commentLike": "@{{username}} yorumunuzu beğendi",
    "notif.commentReply": "@{{username}} yorumunuza cevap verdi",
    "notif.quote": "@{{username}} gönderini alıntıladı",
    "notif.mention": "@{{username}} senden bahsetti",
    "notif.mediaRejected":
        "Paylaşımınızdaki bir medya, topluluk kurallarına aykırı olduğu için kaldırıldı.",
    "notif.generic": "@{{username}} size bir bildirim gönderdi",

    "notif.justNow": "az önce",
    "notif.minutesAgo": "{{n}}dk önce",
    "notif.hoursAgo": "{{n}}sa önce",
    "notif.daysAgo": "{{n}}g önce",

    "bookmarks.title": "Kaydedilenler",
    "bookmarks.subtitle": "Kaydettiğiniz gönderiler, yorumlar ve makaleler",
    "bookmarks.tabPosts": "Gönderiler",
    "bookmarks.tabComments": "Yorumlar",
    "bookmarks.tabArticles": "Makaleler",
    "bookmarks.emptyTitle": "Gönderileri sonra için kaydet",
    "bookmarks.emptyBody":
        "Kaçırma! Gönderileri daha sonra kolayca bulmak için kaydet.",

    "follows.title": "Kimler Takip Edilmeli",
    "follows.subtitle": "Takip etmek isteyebileceğin geliştiriciler",
    "follows.emptyTitle": "Henüz öneri yok",
    "follows.emptyBody":
        "Kişiselleştirilmiş öneriler için daha sonra tekrar kontrol et.",
    "follows.tryAgain": "Tekrar dene",

    "onboarding.stepOfTwo": "Adım {{n}} / 2",
    "onboarding.fieldsTitle": "Ne geliştiriyorsun?",
    "onboarding.fieldsBody":
        "En az bir alan seç. Akışına değecek hesapları buna göre buluyoruz.",
    "onboarding.continue": "Devam",
    "onboarding.accountsTitle": "En az {{n}} hesap takip et",
    "onboarding.accountsTitleOne": "Bir hesap daha takip et",
    "onboarding.accountsBody":
        "Bu haber botları seçtiğin alanlarda yayın yapıyor. Birkaçını takip et, akışın dolu başlasın.",
    "onboarding.progress": "{{n}} / {{total}} takip edildi",
    "onboarding.loadMore": "Daha fazla göster",
    "onboarding.loadingMore": "Yükleniyor…",
    "onboarding.finish": "Akışıma git",
    "onboarding.back": "Geri",
    "onboarding.emptyTitle": "Bu alanlar için henüz bot yok",
    "onboarding.emptyBody":
        "Şu an bu alanlarda yayın yapan bir bot yok. Geri dönüp başka bir alan seç ya da devam edip karşına çıktıkça takip et.",
    "onboarding.tryAgain": "Tekrar dene",
    "onboarding.loadFailed": "Öneriler yüklenemedi.",

    "profile.editProfile": "Profili Düzenle",
    "profile.follow": "Takip Et",
    "profile.following": "Takip Ediliyor",
    "profile.followers": "Takipçiler",
    "profile.followingCount": "Takip Edilen",
    "profile.joined": "Katıldı",
    "profile.posts": "gönderi",
    "profile.tabPosts": "Gönderiler",
    "profile.tabArticles": "Makaleler",
    "profile.follower": "takipçi",
    "profile.followerPlural": "takipçi",
    "profile.settings": "Ayarlar",

    "followList.noFollowers": "Henüz takipçi yok.",
    "followList.noFollowing": "Henüz kimseyi takip etmiyor.",

    "editProfile.fullName": "Ad Soyad",
    "editProfile.fullNamePlaceholder": "Adınız ve soyadınız",
    "editProfile.bio": "Hakkında",
    "editProfile.bioPlaceholder": "Kendinden bahset",
    "editProfile.location": "Konum",
    "editProfile.locationPlaceholder": "örn. İstanbul, Türkiye",
    "editProfile.socials": "Sosyal Bağlantılar",
    "editProfile.add": "Ekle",
    "editProfile.noSocials": "Henüz sosyal bağlantı eklenmedi.",
    "editProfile.socialLabelPlaceholder": "Etiket",
    "editProfile.uploadTooLarge": "Dosya çok büyük. En fazla 5 MB olabilir.",

    "search.placeholder": "Profil ara...",
    "search.searching": "Aranıyor...",
    "search.noResults": "Profil bulunamadı.",

    "explore.title": "Keşfet",
    "explore.searchPlaceholder": "Etiket ara...",
    "explore.noTagsFound": '"{{query}}" için etiket bulunamadı',
    "explore.trendingTopics": "Trend Konular",
    "explore.lastDays": "son 7 gün",
    "explore.postsTagged": "#{{tag}} etiketiyle gönderiler",
    "explore.postsTaggedSubtitle": "#{{tag}} etiketiyle gönderiler",
    "explore.articlesTaggedSubtitle": "#{{tag}} etiketiyle makaleler",

    "trending.title": "Trend Konular",
    "trending.subtitle": "TDN'de şu an popüler",
    "trending.loading": "Yükleniyor...",
    "trending.empty": "Henüz trend yok.",
    "trending.showMore": "Daha fazla göster",
    "trending.posts": "gönderi",

    "settings.title": "Ayarlar",
    "settings.subtitle": "Hesabınızı yönetin",
    "settings.language": "Dil",
    "settings.languageSubtitle": "Arayüz dilini seçin",
    "settings.english": "English",
    "settings.turkish": "Türkçe",
    "settings.theme": "Tema",
    "settings.themeSubtitle": "TDN'nin bu cihazda nasıl görüneceğini seçin.",
    "settings.themeDark": "Koyu",
    "settings.themeLight": "Açık",
    "settings.themeSystem": "Sistem",
    "settings.accountInfo": "Hesap Bilgileri",
    "settings.accountInfoLoading": "Hesap bilgileri yükleniyor…",
    "settings.username": "Kullanıcı Adı",
    "settings.email": "E-posta",
    "settings.emailVerified": "E-posta Doğrulandı",
    "settings.yes": "Evet",
    "settings.no": "Hayır",
    "settings.signInMethods": "Giriş Yöntemleri",
    "settings.memberSince": "Üyelik Tarihi",
    "settings.changeUsername": "Kullanıcı Adını Değiştir",
    "settings.newUsernamePlaceholder": "Yeni kullanıcı adı",
    "settings.updateUsername": "Kullanıcı Adını Güncelle",
    "settings.saving": "Kaydediliyor…",
    "settings.usernameSuccess": "Kullanıcı adı başarıyla güncellendi.",
    "settings.changeEmail": "E-postayı Değiştir",
    "settings.newEmailPlaceholder": "Yeni e-posta adresi",
    "settings.updateEmail": "E-postayı Güncelle",
    "settings.emailSuccess":
        "E-posta güncellendi. Yeni adresinizi doğrulamak için gelen kutunuzu kontrol edin.",
    "settings.changePassword": "Şifreyi Değiştir",
    "settings.currentPasswordPlaceholder": "Mevcut şifre",
    "settings.newPasswordPlaceholder": "Yeni şifre (en az 8 karakter)",
    "settings.confirmPasswordPlaceholder": "Yeni şifreyi onayla",
    "settings.updatePassword": "Şifreyi Güncelle",
    "settings.passwordSuccess": "Şifre başarıyla güncellendi.",
    "settings.passwordMismatch": "Şifreler eşleşmiyor.",
    "settings.passwordTooShort": "Şifre en az 8 karakter olmalı.",
    "settings.verifyEmail": "E-postayı Doğrula",
    "settings.verifyEmailBody":
        "E-posta adresiniz doğrulanmamış. Hesabınızı güvence altına almak için doğrulayın.",
    "settings.sendVerification": "Doğrulama Kodu Gönder",
    "settings.sendingCode": "Gönderiliyor…",
    "settings.codeSent": "Kod gönderildi! Gelen kutunuzu kontrol edin.",
    "settings.codeInputPlaceholder": "8 haneli kod",
    "settings.verify": "Doğrula",
    "settings.verifying": "Doğrulanıyor…",
    "settings.resend": "Tekrar Gönder",
    "settings.dangerZone": "Tehlikeli Bölge",
    "settings.logOut": "Çıkış Yap",
    "settings.logOutSubtitle": "Bu cihazdaki hesabınızdan çıkış yapın.",
    "settings.deleteAccount": "Hesabı Sil",
    "settings.deleteAccountSubtitle":
        "Hesabınız devre dışı bırakılacak. Kalıcı silme öncesinde 30 gün içinde kurtarabilirsiniz.",
    "settings.deleteAccountTitle": "Hesabınızı silin mi?",
    "settings.deleteAccountBody":
        "Hesabınız hemen devre dışı bırakılacak. Kalıcı silinmeden önce giriş yaparak kurtarmanız için 30 günün var.",
    "settings.deleteAccountPasswordLabel": "Onaylamak için şifrenizi girin.",
    "settings.deleteAccountPasswordPlaceholder": "Şifre",
    "settings.deleteAccountPasswordRequired":
        "Onaylamak için lütfen şifrenizi girin.",
    "settings.deleteAccountConfirm": "Evet, hesabımı sil",
    "settings.deleting": "Siliniyor…",
    "settings.cancel": "İptal",
    "settings.delete": "Sil",

    "auth.joinTitle": "Bugün TDN'e katıl",
    "auth.identifierPlaceholder": "Telefon, e-posta veya kullanıcı adı",
    "auth.or": "veya",
    "auth.googleSignUp": "Google ile kaydol",
    "auth.githubSignUp": "GitHub ile kaydol",
    "auth.next": "Devam",
    "auth.checking": "Kontrol ediliyor...",
    "auth.termsPrefix": "Kaydolarak",
    "auth.terms": "Kullanım Koşulları'nı",
    "auth.and": "ve",
    "auth.privacy": "Gizlilik Politikası'nı",
    "auth.termsSuffix": " kabul etmiş olursunuz.",
    "auth.passwordTitle": "Şifrenizi girin",
    "auth.loggingInAs": "Giriş yapılıyor:",
    "auth.forgotPassword": "Şifremi unuttum?",
    "auth.login": "Giriş Yap",
    "auth.loggingIn": "Giriş yapılıyor...",
    "auth.changeAccount": "Hesap değiştir",
    "auth.passwordPlaceholder": "Şifre",
    "auth.registerTitle": "Hesabınızı oluşturun",
    "auth.registerSubtitle": "Bugün geliştirici ağına katılın.",
    "auth.emailPlaceholder": "E-posta",
    "auth.usernamePlaceholder": "Kullanıcı adı",
    "auth.register": "Kaydol",
    "auth.creatingAccount": "Hesap oluşturuluyor...",
    "auth.back": "Geri",
    "auth.verifyTitle": "E-postanızı kontrol edin",
    "auth.verifySubtitle":
        "Gelen kutunuza 8 haneli doğrulama kodu gönderdik. Hesabınızı doğrulamak için aşağıya girin.",
    "auth.verifyEmail": "E-postayı Doğrula",
    "auth.verifying": "Doğrulanıyor...",
    "auth.skipForNow": "Şimdilik geç",
    "auth.resendCode": "Kod almadınız mı? Tekrar gönder",
    "auth.resending": "Gönderiliyor...",
    "auth.forgotTitle": "Şifremi Unuttum?",
    "auth.forgotSubtitle":
        "E-posta adresinizi girin, şifre sıfırlama kodu göndereceğiz.",
    "auth.sendCode": "Kod Gönder",
    "auth.sending": "Gönderiliyor...",
    "auth.backToLogin": "Girişe Dön",
    "auth.resetTitle": "Şifre Sıfırla",
    "auth.resetSubtitle": "Şu adrese gönderilen kodu kontrol edin:",
    "auth.otpPlaceholder": "OTP Kodunu Girin",
    "auth.newPasswordPlaceholder": "Yeni Şifre",
    "auth.updatePassword": "Şifreyi Güncelle",
    "auth.resetting": "Sıfırlanıyor...",
    "auth.otpLengthError": "E-postanıza gönderilen 8 karakterlik kodu girin.",
    "auth.passwordTooShort": "Şifre en az 8 karakter olmalı.",
    "auth.recoveryTitle": "Hesap Silinme Bekliyor",
    "auth.recoverySubtitle":
        "Hesabınız silinmek üzere zamanlandı. Kurtarmak ve kaldığınız yerden devam etmek ister misiniz?",
    "auth.recoverAccount": "Evet, hesabımı kurtar",
    "auth.recovering": "Kurtarılıyor...",
    "auth.recoveryBack": "Hayır, geri dön",
    "auth.recoveryExpiry":
        "Bu kurtarma bağlantısı 15 dakika içinde sona eriyor.",
    "auth.forgotEmailPlaceholder": "ornek@mail.com",
    "auth.codeResent": "E-posta adresinize yeni bir kod gönderildi.",
    "auth.invalidEmail": "Lütfen geçerli bir e-posta adresi girin.",
    "auth.resetSuccess": "Şifreniz başarıyla sıfırlandı.",

    "page.post": "Gönderi",
    "page.postNotFound": "Gönderi bulunamadı.",
    "page.quotes": "Alıntılar",
    "page.article": "Makale",
    "page.articleNotFound": "Makale bulunamadı.",
    "page.comment": "Yorum",
    "page.commentNotFound": "Yorum bulunamadı.",
    "page.commentError": "Yorum yüklenemedi.",
    "page.loadingComment": "Yükleniyor...",
    "page.loadingReplies": "Yanıtlar yükleniyor...",

    "common.cancel": "İptal",
    "common.delete": "Sil",
    "common.deleting": "Siliniyor...",
    "common.save": "Kaydet",
    "common.saving": "Kaydediliyor...",
    "common.loading": "Yükleniyor...",
    "common.tryAgain": "Tekrar dene",
    "common.loadMore": "Daha fazla",
    "common.loadingMore": "Yükleniyor...",
    "common.back": "Geri",
    "common.linkCopied": "Bağlantı panoya kopyalandı!",
    "common.shareFailed": "Bağlantı paylaşılamadı. Lütfen tekrar deneyin.",
    "common.notificationsUnavailable":
        "Gerçek zamanlı bildirimler şu anda kullanılamıyor.",

    "common.dismiss": "Kapat",
    "common.syncingAccount": "Hesap eşitleniyor...",

    "error.timeout": "İstek zaman aşımına uğradı. Bağlantınızı kontrol edin.",
    "error.network": "Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.",
    "error.api": "Bir API hatası oluştu.",
    "error.unexpected": "Beklenmeyen bir hata oluştu.",
    "error.server": "Sunucu isteği tamamlayamadı. Lütfen tekrar deneyin.",

    "error.mediaRejected":
        "Bu dosya topluluk kurallarına aykırı olduğu için yüklenmedi.",
    "error.moderationUnavailable":
        "Medya kontrolü şu an yapılamıyor. Birazdan tekrar deneyin.",
    "error.invalidMediaType":
        "Bu dosya türü desteklenmiyor — adı ne olursa olsun dosyanın kendisine bakılıyor. JPEG, PNG, GIF, WEBP, AVIF, MP4, MOV, WEBM veya 3GP kullanın.",
    "error.invalidFileType":
        "Bu dosya türü desteklenmiyor — adı ne olursa olsun dosyanın kendisine bakılıyor. JPEG, PNG, GIF, WEBP veya AVIF kullanın.",
    "error.payloadTooLarge": "Bu dosya 5 MB'den büyük.",
    "error.mediaNotOwned":
        "Bu yükleme zaten kullanılmış. Lütfen dosyayı yeniden seçin.",
    "error.mediaLimitExceeded": "En fazla 4 dosya ekleyebilirsiniz.",
    "error.noMediaProvided": "Önce bir dosya seçin.",
    "error.rateLimited": "Biraz hızlı gidiyorsunuz. Bir dakika sonra deneyin.",
    "error.mentionLimit": "En fazla {{max}} kişiden bahsedebilirsiniz.",

    "mention.suggestions": "Yazdığınla eşleşen kişiler",
    "mention.searching": "Aranıyor…",

    "media.sensitive": "Hassas içerik",
    "media.sensitiveReveal": "Görmek için dokunun",
    "media.processing": "Bu video kontrol ediliyor",
    "media.refresh": "Yenile",
    "media.removed": "Medya kaldırıldı",
    "media.removedHint": "Ekler topluluk kurallarına aykırıydı.",

    "messages.title": "Mesajlar",
    "messages.tabInbox": "Mesajlar",
    "messages.tabRequests": "İstekler",
    "messages.empty": "Henüz sohbet yok",
    "messages.emptyHint": "Birinin profilini açıp ilk mesajı gönderin.",
    "messages.emptyRequests": "Mesaj isteği yok",
    "messages.emptyRequestsHint":
        "Takip etmediğiniz birinden gelen mesaj önce buraya düşer.",
    "messages.retry": "Tekrar dene",
    "messages.loadMore": "Daha fazla yükle",
    "messages.loadOlder": "Daha eski mesajlar",
    "messages.notFound": "Sohbet bulunamadı",
    "messages.notFoundHint":
        "Kaldırılmış olabilir ya da bu sohbet size ait değil.",
    "messages.startHint": "Bir merhaba deyin.",
    "messages.newMessage": "Mesaj",
    "messages.back": "Geri",
    "messages.seen": "Görüldü",
    "messages.sent": "Gönderildi",
    "messages.deleted": "Bu mesaj silindi",
    "messages.delete": "Mesajı sil",
    "messages.deleteAction": "Sil",
    "messages.deleteConfirm": "Bu mesaj silinsin mi?",
    "messages.deleteConfirmBody":
        "İkinizden de kaybolur. Durduğu yer kalır, böylece ona verilen yanıtlar anlamını korur.",
    "messages.cancel": "Vazgeç",
    "messages.placeholder": "Bir mesaj yazın",
    "messages.send": "Gönder",
    "messages.attach": "Medya ekle",
    "messages.removeAttachment": "Eki kaldır",
    "messages.requestNotice":
        "{{name}} size mesaj göndermek istiyor. Bunu okuduğunuzu göremez.",
    "messages.accept": "Kabul et",
    "messages.decline": "Reddet",
    "messages.declineConfirm": "Bu istek reddedilsin mi?",
    "messages.declineConfirmBody":
        "Bu geri alınamaz. İkiniz de burada bir daha yazamazsınız.",
    "messages.declined": "Bu sohbet reddedildi.",
    "messages.cannotSend": "Buraya yazamazsınız.",
    "messages.awaitingAccept": "İsteği kabul ettiğinde mesajlarınızı görecek.",

    "ad.promotion": "Tanıtım",
    "ad.label": "Reklam",
    "ad.cta": "Geliştiricilere ulaşmak ister misiniz?",
    "ad.contact": "TDN'de reklam verin —",

    "offline.message": "Çevrimdışısınız. Bazı özellikler kullanılamayabilir.",

    "legal.privacyTitle": "Gizlilik Politikası",
    "legal.termsTitle": "Kullanım Koşulları",
    "legal.brand": "TDN — The Developer Network",
    "legal.lastUpdated": "Son güncelleme: Nisan 2026",

    "contact.title": "İletişim",
    "contact.seoTitle": "İletişim — TDN",
    "contact.seoDescription": "TDN ekibiyle iletişime geçin.",
    "contact.intro":
        "Bir sorunuz, geri bildiriminiz mi var veya bir sorunu mu bildirmek istiyorsunuz? Sizden haber almak isteriz. Aşağıdaki iletişim bilgilerini kullanarak TDN ekibine ulaşabilirsiniz.",
    "contact.generalTitle": "Genel ve Destek Talepleri",
    "contact.responseTime":
        "Tüm e-postaları 2–3 iş günü içinde yanıtlamayı hedefliyoruz.",
    "contact.aboutTitle": "Hangi Konularda Bize Ulaşabilirsiniz?",
    "contact.aboutAccount": "Hesap sorunları veya erişim problemleri",
    "contact.aboutAbuse":
        "Kötüye kullanım veya politika ihlali içeren içerik bildirimi",
    "contact.aboutPrivacy": "Gizlilik veya veri talepleri (GDPR / CCPA)",
    "contact.aboutBugs": "Hata bildirimleri ve özellik önerileri",
    "contact.aboutBusiness": "İş birliği veya ortaklık talepleri",
    "contact.aboutAds": "Reklamla ilgili sorular",
    "contact.openSourceTitle": "Açık Kaynak",
    "contact.openSourceBody":
        "TDN açık kaynaklıdır. Kod katkıları, hata bildirimleri veya teknik tartışmalar için doğrudan GitHub depolarımızda bir issue veya pull request açabilirsiniz.",

    "socials.title": "Sosyal Medya",
    "socials.intro":
        "Güncellemeler, haberler ve topluluk içerikleri için bizi sosyal medyada takip edin.",
    "socials.instagramDescription":
        "Fotoğraflar, güncellemeler ve topluluk öne çıkanları için resmî Instagram hesabımız.",
    "socials.xDescription":
        "Haberler, duyurular ve geliştirici topluluğu tartışmaları için X hesabımız.",
    "socials.githubDescription":
        "Açık kaynak projeler, katkılar ve geliştirici ağı için GitHub organizasyonumuz.",
    "socials.footer": "Yeni sosyal medya kanalları burada duyurulacak.",

    "privacy.intro":
        "Gizliliğiniz bizim için önemlidir. Bu Gizlilik Politikası, TDN'nin (The Developer Network) hangi bilgileri topladığını, bunları nasıl kullandığını ve sahip olduğunuz seçenekleri açıklar. TDN'yi kullanarak bu politikada açıklanan uygulamaları kabul etmiş olursunuz.",
    "privacy.s1Title": "1. Topladığımız Bilgiler",
    "privacy.s1EmailLead": "E-posta ve parola ile kayıt olduğunuzda:",
    "privacy.s1Email": "E-posta adresi",
    "privacy.s1Username": "Kullanıcı adı",
    "privacy.s1Password":
        "Parola — güvenli tek yönlü bir özet (argon2) olarak saklanır. Parolanızı hiçbir zaman düz metin olarak saklamaz veya iletmeyiz.",
    "privacy.s1OauthLead":
        "Google veya GitHub ile kayıt olduğunuzda ya da giriş yaptığınızda:",
    "privacy.s1OauthEmail":
        "E-posta adresi (OAuth sağlayıcısı tarafından sağlanır)",
    "privacy.s1OauthName": "Görünen ad (varsa)",
    "privacy.s1OauthAvatar": "Profil fotoğrafı bağlantısı (varsa)",
    "privacy.s1OauthNote":
        "Google veya GitHub parolanızı almaz, talep etmez ve saklamayız. Bu servisler parolanızı paylaşmaz — biz de hiçbir zaman istemeyiz.",
    "privacy.s2Title": "2. Bilgilerinizi Nasıl Kullanıyoruz",
    "privacy.s2Account": "Hesabınızı oluşturmak ve yönetmek için",
    "privacy.s2Interact":
        "İçerik paylaşmanıza, kullanıcıları takip etmenize ve toplulukla etkileşim kurmanıza olanak tanımak için",
    "privacy.s2Email":
        "E-posta doğrulama ve parola sıfırlama gibi işlemsel e-postalar göndermek için",
    "privacy.s2Abuse":
        "Kötüye kullanım, spam veya politika ihlallerini tespit etmek ve önlemek için",
    "privacy.s2Improve": "Platformu geliştirmek ve sürdürmek için",
    "privacy.s2Note":
        "Kişisel verilerinizi üçüncü taraflara satmayız. Verilerinizi reklam profillemesi için kullanmayız.",
    "privacy.s3Title": "3. Çerezler ve Yerel Depolama",
    "privacy.s3Lead":
        "TDN'yi kullanarak çerezleri ve tarayıcı yerel depolamasını kullanmamızı kabul edersiniz. Bu teknolojileri şunlar için kullanırız:",
    "privacy.s3SignedIn":
        "Oturumlar arasında girişte kalmanızı sağlamak (kimlik doğrulama belirteçleri)",
    "privacy.s3Prefs": "Tercihlerinizi ve arayüz durumunuzu hatırlamak",
    "privacy.s3Security":
        "Her istekte oturumunuzu doğrulayarak güvenliği sürdürmek",
    "privacy.s4Title": "4. Güvenlik",
    "privacy.s4Lead":
        "Güvenliği ciddiye alıyoruz. Verilerinizi korumak için yaptıklarımız:",
    "privacy.s4Hash":
        "Parolalar tek yönlü bir algoritma olan bcrypt ile özetlenir. Olası bir veri ihlali durumunda bile parolanız saklanan özetten geri elde edilemez.",
    "privacy.s4Jwt":
        "Kimlik doğrulama, güvenli yenileme belirteçleriyle birlikte kısa ömürlü JWT erişim belirteçleri kullanır.",
    "privacy.s4Tls":
        "Tarayıcınız ile sunucularımız arasındaki tüm trafik HTTPS/TLS ile şifrelenir.",
    "privacy.s4OpenSource":
        "TDN açık kaynaklıdır — istemci tarafı kodumuz herkese açık olarak denetlenebilir. Şeffaflığın güveni güçlendirdiğine inanıyoruz.",
    "privacy.s5Title": "5. Veri Saklama",
    "privacy.s5Body":
        "Hesap verileriniz, hesabınız aktif olduğu sürece saklanır. Hesabınızı silerseniz, yasal olarak saklanması gereken durumlar dışında kişisel bilgileriniz makul bir süre içinde sistemlerimizden kaldırılır. Paylaştığınız bazı içerikler (ör. yorumlar) anonimleştirilmiş biçimde kalabilir.",
    "privacy.s6Title": "6. Üçüncü Taraf Servisler",
    "privacy.s6Lead": "TDN aşağıdaki üçüncü taraf servislerle entegre çalışır:",
    "privacy.s6Google": "Google OAuth",
    "privacy.s6GoogleBody":
        "— giriş için. Google'ın Gizlilik Politikası'na tabidir.",
    "privacy.s6Github": "GitHub OAuth",
    "privacy.s6GithubBody":
        "— giriş için. GitHub'ın Gizlilik Politikası'na tabidir.",
    "privacy.s6Cloudflare": "Cloudflare Workers",
    "privacy.s6CloudflareBody": "— platform barındırma ve dağıtım için.",
    "privacy.s6Note":
        "Bu servislerin her birinin kendi gizlilik politikası vardır. Bunları incelemenizi öneririz.",
    "privacy.s7Title": "7. Haklarınız",
    "privacy.s7Lead": "Şu haklara sahipsiniz:",
    "privacy.s7Access": "Hakkınızda tuttuğumuz kişisel verilere erişmek",
    "privacy.s7Correct":
        "Profil ayarlarınız üzerinden hatalı bilgileri düzeltmek",
    "privacy.s7Delete": "Hesabınızı ve ilişkili verileri silmek",
    "privacy.s7Object":
        "Uygun olduğu durumlarda verilerinizin işlenmesine itiraz etmek",
    "privacy.s7Note":
        "Bu hakları kullanmak için hesap ayarlarını kullanabilir veya platform üzerinden bizimle iletişime geçebilirsiniz.",
    "privacy.s8Title": "8. Bu Politikadaki Değişiklikler",
    "privacy.s8Body":
        "Bu Gizlilik Politikası'nı zaman zaman güncelleyebiliriz. Önemli değişiklikleri kullanıcılara platform üzerinden bildiririz. Güncellemelerden sonra kullanmaya devam etmeniz, revize edilmiş politikayı kabul ettiğiniz anlamına gelir.",
    "privacy.footer":
        "Gizliliğinizle ilgili sorularınız mı var? Bize e-posta gönderin:",

    "terms.intro":
        "TDN'ye (The Developer Network) hoş geldiniz. TDN'ye erişerek veya TDN'yi kullanarak bu Kullanım Koşulları ile bağlı olmayı kabul edersiniz. Kabul etmiyorsanız lütfen platformu kullanmayın.",
    "terms.s1Title": "1. Koşulların Kabulü",
    "terms.s1Body":
        "Bir hesap oluşturarak, platformu görüntüleyerek veya TDN'deki herhangi bir içerikle etkileşime geçerek bu Koşulları okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan edersiniz. Bu Koşullar, kayıtlı olsun ya da olmasın tüm kullanıcılar için geçerlidir.",
    "terms.s2Title": "2. Uygunluk",
    "terms.s2Body":
        "TDN'yi kullanmak için en az 13 yaşında olmalısınız. TDN'yi kullanarak bu şartı karşıladığınızı beyan edersiniz. 18 yaşın altındaki kullanıcılar platformu yalnızca ebeveyn veya vasi onayıyla kullanmalıdır.",
    "terms.s3Title": "3. Topluluk Kuralları",
    "terms.s3Lead":
        "TDN profesyonel bir geliştirici topluluğudur. Tüm kullanıcıların saygılı ve yapıcı bir şekilde katılım göstermesi beklenir. Aşağıdaki içerikler kesinlikle yasaktır:",
    "terms.s3Explicit": "Her türlü müstehcen, pornografik veya erotik içerik",
    "terms.s3Hate": "Nefret söylemi, taciz, tehdit veya ayrımcı ifadeler",
    "terms.s3Spam": "Spam, kimlik avı veya yanıltıcı içerik",
    "terms.s3Malware":
        "Kötü amaçlı yazılım, istismar kodları veya sistemlere yetkisiz erişimi teşvik eden içerik",
    "terms.s3Illegal":
        "Yürürlükteki herhangi bir yasa veya düzenlemeyi ihlal eden içerik",
    "terms.s3Impersonation":
        "Başka kişilerin, kuruluşların veya tüzel kişilerin kimliğine bürünme",
    "terms.s3Note":
        "Bu kuralların ihlali, içeriğin kaldırılmasına, hesabın askıya alınmasına veya bildirimde bulunmaksızın kalıcı olarak yasaklanmasına yol açabilir.",
    "terms.s4Title": "4. Kullanıcı İçeriği",
    "terms.s4Body1":
        "TDN'de paylaştığınız içeriğin mülkiyeti size aittir. Ancak içerik paylaşarak TDN'ye, içeriğinizi platform içinde görüntüleme, dağıtma ve tanıtma konusunda münhasır olmayan, telifsiz ve dünya çapında bir lisans vermiş olursunuz.",
    "terms.s4Body2":
        "Paylaştığınız içerikten yalnızca siz sorumlusunuz. TDN, kullanıcı tarafından oluşturulan içeriği onaylamaz, doğrulamaz veya doğruluğunu garanti etmez.",
    "terms.s5Title": "5. Açık Kaynak ve Şeffaflık",
    "terms.s5Body1":
        "TDN açık kaynaklı bir projedir. İstemci uygulamasının kaynak kodu herkese açıktır. Şeffaflığa inanıyoruz — platformun nasıl geliştirildiğini inceleyebilir ve güvenlik uygulamalarımızı kendiniz doğrulayabilirsiniz.",
    "terms.s5Body2":
        "TDN'nin açık kaynak depolarına katkıda bulunmanız memnuniyetle karşılanır ve ilgili deponun lisansı ile katkı yönergelerine tabidir.",
    "terms.s6Title": "6. Hesap Güvenliği",
    "terms.s6Body1":
        "Hesap bilgilerinizin gizliliğini korumaktan siz sorumlusunuz. Parolanızı kimseyle paylaşmayın. TDN hiçbir zaman e-posta veya başka bir iletişim kanalı üzerinden parolanızı istemez.",
    "terms.s6Body2":
        "Hesabınıza yetkisiz erişimden şüpheleniyorsanız lütfen parolanızı hemen değiştirin ve destek ekibiyle iletişime geçin.",
    "terms.s7Title": "7. Üçüncü Taraf Kimlik Doğrulama",
    "terms.s7Body":
        "TDN, Google ve GitHub üzerinden giriş yapmayı (OAuth 2.0) destekler. Bu sağlayıcılarla kimlik doğrulaması yaptığınızda TDN yalnızca bu servislerin izin verdiği ölçüde herkese açık profil bilgilerinizi (e-posta adresiniz ve görünen adınız gibi) alır. Google veya GitHub parolanız hiçbir zaman TDN'ye iletilmez ve TDN tarafından saklanmaz.",
    "terms.s8Title": "8. Fesih",
    "terms.s8Body":
        "TDN, bu Koşulların ihlali veya topluluğa ya da platforma zararlı görülen herhangi bir davranış nedeniyle hesabınızı bildirimli veya bildirimsiz olarak istediği zaman askıya alma ya da sonlandırma hakkını saklı tutar. Ayrıca hesabınızı istediğiniz zaman platform ayarlarından silebilirsiniz.",
    "terms.s9Title": "9. Garanti Reddi",
    "terms.s9Body":
        'TDN, açık ya da zımni hiçbir garanti verilmeksizin "olduğu gibi" sunulmaktadır. Platforma kesintisiz erişimi garanti etmiyoruz ve hizmetin kullanımından kaynaklanan veri kaybı ya da zararlardan sorumlu değiliz.',
    "terms.s10Title": "10. Bu Koşullardaki Değişiklikler",
    "terms.s10Body":
        "Bu Koşulları zaman zaman güncelleyebiliriz. Değişiklikler yayımlandıktan sonra TDN'yi kullanmaya devam etmeniz, revize edilmiş Koşulları kabul ettiğiniz anlamına gelir. Bu sayfayı düzenli olarak gözden geçirmenizi öneririz.",
    "terms.footer": "Sorularınız mı var? Bize e-posta gönderin:",
};

export const translations: Record<Locale, Record<TranslationKey, string>> = {
    en,
    tr,
};
