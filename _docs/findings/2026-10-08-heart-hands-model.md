# Gold heart hands: getting a 3D model

The wall is meant to show bracelets on a gold heart-hands sculpture, like the one on Shauna's real shelf. Building the hands out of code did not look good enough, so the app needs a real 3D model. Until then the wall uses a gold T-bar stand.

Only the **shape** matters. The app applies its own gold finish, so the scan's color and texture can be rough.

## Option A: scan the real sculpture (no permission needed)

Time: about 20 minutes. You need an iPhone and a free scanning app.

### Get ready

1. Take the bracelets off the hands.
2. Put the sculpture on a surface with a busy pattern, such as a newspaper or a patterned placemat. The pattern helps the app track where the camera is.
3. Use soft, even light: near a window on a cloudy day, or a bright room with no direct sun. Turn the flash off. Harsh light makes bright spots on the gold that confuse the scan.
4. Leave space to walk all the way around it.

### Scan

1. Install **Scaniverse** (free) from the App Store. Polycam and Apple's Reality Composer also work.
2. Start a new scan and choose the small-object setting if asked.
3. Walk slowly around the sculpture three times: once at its own height, once from above looking down at about 45 degrees, and once low, looking slightly up.
4. Keep the whole sculpture in frame and keep moving slowly. Overlap is good.
5. Let the app process the scan at its highest detail setting.
6. Look at the result. The heart opening should be a clean hole and the fingers should be separate shapes. If the result is lumpy or has holes, scan again with softer light.

### If the gold is too shiny to scan

Shiny surfaces are the usual reason a scan fails. Dust the sculpture lightly with something matte that wipes off, such as cornstarch or dry shampoo, then scan and wipe it clean.

### Export and hand over

1. Export the scan as **GLB**. OBJ or USDZ also work.
2. Put the file in this project folder at `public/heart-hands-scan.glb`, or attach it to the chat.
3. Tell the session it is there.

## Option B: use an openly licensed model

Searched on 2026-10-08. Nothing was confirmed as both a sculpted heart-hands shape and clearly licensed for use on a public website. Notes for anyone who looks again:

| Model | Where | Finding |
|---|---|---|
| Heart Hands, by DireChris | MakerWorld, model 2617746 | Standard Digital File License. Hosting or distributing the file is not allowed. Not usable without the designer's written permission. |
| Heart Hands, by Code and Make | Thangs, model 204677 (originally Thingiverse) | Described as CC BY 4.0, but the page also shows a "restricted by licensing terms" notice. It is based on a flat illustration, so it is probably a flat cut-out, not a sculpture. Check both points before using. |
| Heart Hands, by Persie0 | Printables, model 1066578 | License could not be read from the page. Check it in a browser. |
| Heart Hands, by cforms | Printables, model 1392206 | License could not be read from the page. Check it in a browser. |

A usable license is CC0 or CC BY (credit required). CC BY-NC is acceptable only while the site stays non-commercial. Anything marked "personal use", "no derivatives", or "Standard Digital File License" is not usable without permission.

Asking a designer directly is also reasonable: a short note asking to use the model in a free, non-commercial portfolio piece, with credit, often gets a yes.

## What happens once there is a model

1. Clean it up: remove the scanned table surface, close holes, and reduce it to roughly 30,000 to 60,000 triangles so it loads quickly on phones. Target file size is under 3 MB.
2. Load it in `src/main.js` with Three.js's GLTF loader and apply the gold material.
3. Add it to the wall as a second display piece next to the T-bar stand, with bracelets stacked around the wrists. The rejected code-built version is in the git history (commit `e57bd8b`) and shows how the bracelets were placed around the wrists.
4. If the model came from someone else, add the credit their license requires to the README and to the app.
