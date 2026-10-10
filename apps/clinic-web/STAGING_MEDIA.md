# HAVENHUB protected staging media handoff

Task 6 implements two optional **illustrative** media slots. Original IMG_0905 and IMG_0907 bytes are **not in the repository**. Do not copy either image into `public/`, `dist/`, a Docker build context, public object storage, Git, or an open CDN.

## Media provenance and editorial approval

| Slot | Placement | Provenance and rights status |
| --- | --- | --- |
| IMG_0905 | Landing `/#conditions` | Owner-provided branded concept visualization; **license, source and use rights not verified** |
| IMG_0907 | `/programa/`, individual/group work section | Owner-provided branded concept visualization; **license, source and use rights not verified** |

Both captions say **«Візуалізація, не фото приміщення центру»**. The program caption also makes clear that the image does not depict verified HAVENHUB staff. Alt text describes a conceptual scene, not a verified medical environment. The operator must confirm the actual visible scene and update alt text if necessary **before** publishing even to private staging. No image is evidence of actual facilities, personnel, successful treatment, or patient experience.

For each approved private asset, record its source, author/licensor, acquisition date, license or written permission, permitted uses, attribution, license expiry or restrictions, and the owner who approved the version. Use a rights-verified replacement before any public production media is added. Do not use these concepts for OG/social sharing.

## Protected asset handoff

The private staging host must enforce real access control on **both HTML and image paths**. The image URLs are same-origin, root-relative and fixed to the following names (allowed formats: webp, png, jpg, jpeg, avif):

```dotenv
HAVENHUB_STAGING_IMG_0905_URL=/__havenhub_staging_media__/img-0905.webp
HAVENHUB_STAGING_IMG_0907_URL=/__havenhub_staging_media__/img-0907.webp
```

The assets must be delivered through an **out-of-repository private deployment channel** and served by the protected staging host under these paths. Uploading them to an open CDN or placing them into Astro `public/` is **not approved**. Do not place sensitive access tokens in the URLs or query strings. Verify that both URLs return valid images to an authorized browser, are denied to unauthenticated visitors, have the proper content type, and are absent from any public artifact.

Use environment variables only for an authorized staging build:

```bash
CLINIC_SITE_MODE=staging \
HAVENHUB_STAGING_IMG_0905_URL=/__havenhub_staging_media__/img-0905.webp \
HAVENHUB_STAGING_IMG_0907_URL=/__havenhub_staging_media__/img-0907.webp \
pnpm --filter @vcard/clinic-web build
```

Missing variables produce a neutral **text-only** design with no image markup or broken asset request. If a configured asset fails to load or decode, a staging-only browser fallback removes its figure while preserving the surrounding text. Invalid staging paths fail validation. Outside staging, the slots render nothing, even if the environment accidentally contains staging URLs. `CLINIC_SITE_MODE`, robots and publication guard remain independent.

## Validation and blockers

Automated Playwright tests mock the two same-origin paths with **synthetic, non-owner** SVG placeholders; they prove placement, caption, alt and loading behavior, but **do not confirm image rights, actual file appearance, external accessibility or staging authentication**. Those checks remain blocked until the private host and authorized originals are supplied. Test normal and guarded production builds with both staging variables set and verify that generated HTML/assets never reference the staging URLs.

This handoff is intentionally in `apps/clinic-web/`: the plan's `docs/new-clinic/havenhub-claims.md` does not exist in this worktree and that `docs/*` path is ignored by Git. Release approval is separate; no public publication is authorized.
