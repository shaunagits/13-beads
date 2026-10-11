# Finished and Wall screens: UX review (2026-10-11)

Same reviewer as the stringing review, asked to fit these screens to the new stringing system. Note: the Finished screenshots supplied to the reviewer were wrong (the script hung the bracelet first), so Finished was reviewed from the code. Recheck with fresh captures before mocking up.

## Top problems

Finished
1. Sharing (trade links, card, QR) hides behind an unlabeled camera icon, and the same icon saves a photo on the Wall.
2. The Share popover covers the bracelet it shares, and "Save card" adds a second dark button.
3. Keep editing / Add to my wall and the gift-tag pill sit on the canvas.
4. Players never see the story card before saving it.

Wall
1. Decorate covers the sign and the cone, so changes are not visible live; Done and Make another are both dark.
2. Bracelets are small on the cone (about 140 x 85 px for three on a phone); phrases are hard to read.
3. "Make another" is the wrong label when a string is in progress.
4. Press and hold is undiscoverable.
5. The Decorate and photo pill crowds the sign.

## Proposal

- Nothing on the canvas on either screen; the controls go in the same place as the stringing command bar.
- Finished (400 x 780): canvas about 570; a gift-tag line on trades only; row 1 two ghost buttons, "Keep editing" and "Share" (labeled, share icon); row 2 full-width dark "Add to my wall". Trades: "Back to mine" and "Hang it on my wall".
- Wall: canvas about 646; command bar with "Decorate" (ghost, labeled), Save photo (44px icon), and a dark button reading "Make another" or "Back to my string" when a string is in progress. Frame the camera to the occupied rings plus the sign.
- Popovers become bottom sheets (grabber, title, close, 220ms, focus trapped, above the keyboard), replacing the command bar while open so only one dark button shows:
  - Share: card thumbnail beside the gift-tag field, Save card (dark), Send link and QR code (ghosts).
  - Decorate: 52px swatches, sign word field, Done; the sign stays visible above it. Checked and focus rings made distinct.
  - Bracelet options: the held bracelet lifts and others dim; Edit it (dark), Leave it (ghost), Take it off (quiet red text).
- Desktop: keep the 360px right panel on both screens (share inline on Finished; Decorate inline plus a list of hung bracelets with Edit and Take off on the Wall).

## Polish

Gift-tag placeholder "For Maya, love Jess" (not Shauna's name); never one icon for two actions; hide the wall badge while on the wall; an "Nothing on display yet" line on an empty wall; leave "tap for sparkles" as a secret.

## Test with players

Discovery of press and hold; Save card vs Send link vs QR; whether a labeled Share gets used; what the back arrow should do on these screens; phrase legibility on cones; whether a full-width "Add to my wall" feels forced.

## Open

Back arrow on Finished and Wall: back to stringing, or always the games site (Shauna).
