# Design v1.0

November 12, 2026 · Illustrated browser preview · Sample accounts

[Open the visual gallery](index.html) · [App thumbnail, 1024 × 1024](app-thumbnail.png) · [Open the live preview](http://localhost:8084/home-widgets.html?screen=opening)

Each image is a capture of the running preview. The default device is 390 CSS pixels wide. Numbered continuations follow the main scroll. Nested lists have separate captures. Settings and account actions use local sample data.

### Later TestFlight revisions

- **1.0.19 (41)** includes the [approved waving thumbnail](../mascot-thumbnail/thumbnail.png), [opening wordmark](../mascot-thumbnail/opening.png) and [standalone Settings page](../settings/settings.png).
- **1.0.20 (42)** includes [Write a post](../setup-and-requests/write-post.png), [setup contact details](../setup-and-requests/personal-info.png), [initial sharing preferences](../setup-and-requests/sharing-preferences.png), [sent and received requests](../setup-and-requests/sent-requests.png) and the complete profile drop at [320 px](../setup-and-requests/you-320.png), [390 px](../setup-and-requests/you-390.png) and [480 px](../setup-and-requests/you-480.png).

- **1.0.22 (44)** combines identity, the full cycle comparison, friend actions and shared posts on [one friend profile](../friend-profile/README.md).
- **1.0.21 (43)** includes the [Received tab](../requests-and-comments/received.png), [Sent tab](../requests-and-comments/sent.png), [320 px request layout](../requests-and-comments/received-320.png) and [automatic update with two comments](../requests-and-comments/automatic-comments.png).

## Screens and dialogs

- [Opening page](pages/01-opening.png) · Open preview or Controls → Opening page
- [Home](pages/02-home.png) · Opening page → Enter preview
- [Home · 2](pages/02-home-2.png) · Opening page → Enter preview · scroll down
- [Feed](pages/03-feed.png) · Bottom navigation → Feed
- [Feed · 2](pages/03-feed-2.png) · Bottom navigation → Feed · scroll down
- [Circle](pages/04-circle.png) · Bottom navigation → Circle
- [Circle · 2](pages/04-circle-2.png) · Bottom navigation → Circle · scroll down
- [You](pages/05-you.png) · Bottom navigation → You
- [You · 2](pages/05-you-2.png) · Bottom navigation → You · scroll down
- [You · 3](pages/05-you-3.png) · Bottom navigation → You · scroll down
- [Edit profile](pages/06-edit.png) · You → Edit profile
- [Settings](pages/07-settings.png) · You → Settings
- [Manage contact details](pages/08-contacts.png) · Settings → Manage contact details
- [Post settings](pages/09-posting.png) · Settings → Post settings
- [Sign-out confirmation](pages/10-sign-out.png) · Settings → Sign out
- [Delete-account confirmation](pages/11-delete-account.png) · Settings → Delete account
- [Add friends](pages/12-add-friends.png) · Circle → Add Friends
- [Add friends · 2](pages/12-add-friends-2.png) · Circle → Add Friends · scroll down
- [Notifications](pages/13-notifications.png) · Feed or Home → Notifications
- [Notifications · 2](pages/13-notifications-2.png) · Feed or Home → Notifications · scroll down
- [Write a post](pages/14-composer.png) · Feed → Share an update
- [Delete post confirmation](pages/15-delete-post.png) · Feed or My posts → post menu
- [Reaction picker](pages/16-reactions.png) · Post → Choose a reaction

## Posts, guidance and settings

- [Phase Guide](interactions/01-guide.png) · Home → Try something new
- [Refreshed guidance](interactions/02-refresh.png) · Phase Guide → Refresh tips
- [Cycle day ranges](interactions/03-ranges.png) · You → press or hover on cycle
- [My posts](interactions/04-my-posts.png) · You → bottom section
- [Own comment with small delete icon](interactions/05-own-comment.png) · My posts → Comments → Post comment
- [Comment removed](interactions/06-removed-comment.png) · Own comment → trash icon
- [One open comment thread](interactions/07-single-thread.png) · Feed → Comments on two successive posts
- [Post with mood](interactions/08-compose-draft.png) · Write a post → enter text and pick a mood
- [Published post](interactions/09-published.png) · Write a post → Share with your circle
- [Reaction and boop](interactions/10-reactions-boop.png) · Feed → react and boop
- [Most supportive](interactions/11-supportive.png) · Circle rankings → Most supportive
- [Friend directory search](interactions/12-search-friends.png) · Circle → Search your friends
- [No matching friends](interactions/13-empty-search.png) · Circle → Search your friends
- [Largest Circle](interactions/14-largest.png) · Circle → Community rankings
- [Largest Circle, ranks 7–10](interactions/15-largest-bottom.png) · Community rankings → scroll to tenth place
- [Loudest Voices](interactions/16-loudest.png) · Community rankings → Loudest Voices
- [Loudest Voices, ranks 7–10](interactions/17-loudest-bottom.png) · Community rankings → scroll to tenth place
- [Ranking visibility enabled](interactions/18-opt-in.png) · Settings → Show me in Community rankings
- [Opted-in member in rankings](interactions/19-opted-in-rank.png) · Circle → Loudest Voices after opting in
- [Automatic posting enabled](interactions/20-auto-posts.png) · Post settings → period and phase switches
- [Change account email](interactions/21-change-email.png) · Manage contact details → Use a different email
- [Email confirmation](interactions/22-check-email.png) · Change email → Verify email
- [Phone verification code](interactions/23-phone-code.png) · Manage contact details → Text me a code
- [Verified contact details](interactions/24-confirmed.png) · Manage contact details → Verify code

## Friends and member profiles

- [Contact matches](people/01-matches.png) · Add friends → Find from contacts
- [Five contacts selected](people/02-five-selected.png) · Find from contacts → select five
- [Pending contact requests](people/03-pending.png) · Find from contacts → Send friend requests
- [Incoming contact request](people/04-incoming.png) · Find from contacts → filter an incoming request
- [Discover a member](people/05-discovery.png) · Discover friends → exact sample email
- [Request sent](people/06-request-sent.png) · Discover friends → Send friend request
- [Share invite link](people/07-share.png) · Grow your circle → Share invite link
- [Invite link copied](people/08-copy.png) · Grow your circle → Copy invite link
- [Request accepted](people/09-accepted.png) · Notifications → Accept
- [Request declined](people/10-declined.png) · Notifications → Decline
- [Profile · Alex](people/profile-self.png) · Select the member from a feed, ranking, comment, request or search result
- [Profile · Maya](people/profile-maya.png) · Select the member from a feed, ranking, comment, request or search result
- [Profile · Maya · 2](people/profile-maya-2.png) · Select the member from a feed, ranking, comment, request or search result · scroll down
- [Profile · Jules](people/profile-jules.png) · Select the member from a feed, ranking, comment, request or search result
- [Profile · Jules · 2](people/profile-jules-2.png) · Select the member from a feed, ranking, comment, request or search result · scroll down
- [Profile · Nina](people/profile-nina.png) · Select the member from a feed, ranking, comment, request or search result
- [Profile · Sam](people/profile-sam.png) · Select the member from a feed, ranking, comment, request or search result
- [Profile · Cleo](people/profile-cleo.png) · Select the member from a feed, ranking, comment, request or search result
- [Profile · Tess](people/profile-tess.png) · Select the member from a feed, ranking, comment, request or search result
- [Profile · Imani](people/profile-imani.png) · Select the member from a feed, ranking, comment, request or search result
- [Profile · Lou](people/profile-lou.png) · Select the member from a feed, ranking, comment, request or search result
- [Profile · Dev](people/profile-dev.png) · Select the member from a feed, ranking, comment, request or search result
- [Profile · Kit](people/profile-kit.png) · Select the member from a feed, ranking, comment, request or search result
- [Profile · Ana](people/profile-ana.png) · Select the member from a feed, ranking, comment, request or search result
- [Profile · Ren](people/profile-ren.png) · Select the member from a feed, ranking, comment, request or search result
- [Profile · Rory](people/profile-rory.png) · Select the member from a feed, ranking, comment, request or search result
- [Profile · Mina](people/profile-mina.png) · Select the member from a feed, ranking, comment, request or search result
- [Profile · Eden](people/profile-eden.png) · Select the member from a feed, ranking, comment, request or search result
- [Profile · Ari](people/profile-ari.png) · Select the member from a feed, ranking, comment, request or search result

## Widget destinations and actions

- [Home cycle destination](paths/01-cycle.png) · Home → Your cycle → You
- [Home guide destination](paths/02-guide.png) · Home → Try something new → Phase Guide
- [Upcoming phase destination](paths/03-coming-up.png) · Home → Coming up → You
- [Top sync match destination](paths/04-sync.png) · Home → sync preview → Circle rankings
- [Latest update destination](paths/05-feed.png) · Home → latest update → Feed
- [Circle shortcut](paths/06-circle.png) · Home → people icon
- [Friends, fifth row](paths/07-friend-scroll.png) · Circle → scroll Friends beyond four rows
- [Friend requests, last row](paths/08-request-scroll.png) · Add friends → scroll requests
- [Member profile after request](paths/09-member-pending.png) · Member profile → Send friend request
- [Member profile after accepting](paths/10-member-accepted.png) · Member profile → Accept request
- [My posts after deletion](paths/11-last-post-removed.png) · Feed → Delete update → You → My posts
- [Saved profile edit](paths/12-saved-profile.png) · You → Edit profile → Save changes
- [Continue a post draft](paths/13-saved-draft.png) · Feed → Share an update → Back to Feed
- [Accepted contact in Friends](paths/14-accepted-contact.png) · Controls → simulate a pending contact accepting
- [Comment author profile](paths/15-comment-profile.png) · Feed → Comments → commenter name
- [Filtered contacts with no matches](paths/16-no-contact-match.png) · Find from contacts → filter
- [Verification retry](paths/17-code-retry.png) · Contact details → enter incorrect sample code

## Sizes, theme and data states

- [Home · Empty](states/home-empty.png) · Controls → Empty → Home
- [Home · Loading](states/home-loading.png) · Controls → Loading → Home
- [Home · Error](states/home-error.png) · Controls → Error → Home
- [Home · Stale](states/home-stale.png) · Controls → Stale → Home
- [Home · Offline](states/home-offline.png) · Controls → Offline → Home
- [Feed · Empty](states/feed-empty.png) · Controls → Empty → Feed
- [Feed · Loading](states/feed-loading.png) · Controls → Loading → Feed
- [Feed · Error](states/feed-error.png) · Controls → Error → Feed
- [Feed · Stale](states/feed-stale.png) · Controls → Stale → Feed
- [Feed · Offline](states/feed-offline.png) · Controls → Offline → Feed
- [Circle · Empty](states/circle-empty.png) · Controls → Empty → Circle
- [Circle · Loading](states/circle-loading.png) · Controls → Loading → Circle
- [Circle · Error](states/circle-error.png) · Controls → Error → Circle
- [Circle · Stale](states/circle-stale.png) · Controls → Stale → Circle
- [Circle · Offline](states/circle-offline.png) · Controls → Offline → Circle
- [You · Empty](states/you-empty.png) · Controls → Empty → You
- [You · Loading](states/you-loading.png) · Controls → Loading → You
- [You · Error](states/you-error.png) · Controls → Error → You
- [You · Stale](states/you-stale.png) · Controls → Stale → You
- [You · Offline](states/you-offline.png) · Controls → Offline → You
- [Preview controls](states/controls.png) · Preview → Controls
- [Neutral theme](states/neutral.png) · Controls → Neutral theme
- [Cycle at 320 px](states/320px.png) · Controls → 320 PX → You
- [Cycle at 480 px](states/480px.png) · Controls → 480 PX → You
- [Empty notifications](states/empty-inbox.png) · Notifications → Controls → Empty
