# Third-party notices

This project bundles the following third-party works. Their own licences apply to them;
the MIT licence in `LICENSE` covers only the original code of this repository.

| Component | Files | Licence | Full text |
|---|---|---|---|
| [flag-icons](https://github.com/lipis/flag-icons) by Panayiotis Lipiridis | `flags/*.svg` | MIT | [`licenses/flag-icons-MIT.txt`](licenses/flag-icons-MIT.txt) |
| [Onest](https://github.com/googlefonts/onest), The Onest Project Authors | `fonts/onest-*.woff2` | SIL OFL 1.1 | [`licenses/Onest-OFL.txt`](licenses/Onest-OFL.txt) |
| [Jost](https://github.com/indestructible-type/Jost), The Jost Project Authors | `fonts/jost-*.woff2` | SIL OFL 1.1 | [`licenses/Jost-OFL.txt`](licenses/Jost-OFL.txt) |

## Modifications

- **flags/**: flags that carry a detailed coat of arms (larger than 8 KB as SVG) were replaced by
  a 160×120 raster picture wrapped in an SVG, to keep the page light. The other flags are
  unchanged. These flags remain subject to the flag-icons MIT licence.
- **fonts/**: the woff2 files are the Google Fonts subsets (latin and cyrillic) of Onest and Jost,
  unmodified. The Reserved Font Name rules of the OFL are respected: the fonts keep their
  original names and are not sold on their own.

`og.png`, the favicon, the texts and the design belong to the project and are covered by the MIT licence.
