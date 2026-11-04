# Notice provenance

These texts are inputs to `scripts/update-third-party-notices.mjs`, whose
consolidated output is `THIRD_PARTY_NOTICES.md` and its identical public copy.
They are third-party legal texts, not Andrei Stepanov's copyright claims.

- `legacy-MIT.txt`: exact repository LICENSE before the 2026-10-12 ownership
  update, naming Maksymilian Dendura. Preserved for inherited material.
- `embla-carousel-MIT.txt`: https://raw.githubusercontent.com/davidjerleke/embla-carousel/v8.6.0/LICENSE
- `fluentui-contrib-MIT.txt`: https://raw.githubusercontent.com/microsoft/fluentui-contrib/main/LICENSE
- `fluentui-icons-MIT.txt`: https://raw.githubusercontent.com/microsoft/fluentui-system-icons/main/LICENSE
- `roboto-Apache-2.0.txt`: https://raw.githubusercontent.com/googlefonts/roboto/main/LICENSE

Upstream texts were fetched on 2026-10-12. Microsoft and Roboto URLs are upstream
branch snapshots, not release-specific archive evidence. Package SPDX declarations
and installed notices are recorded independently in the generated inventory.
Platform packages without local notices use their installed parent project's
notice where available; absent optional packages are explicitly marked.
