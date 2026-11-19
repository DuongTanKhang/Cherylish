# Cherylish porting notes

When porting code from the GEME repository into Cherylish:

- Import selected source code only; never copy database contents, customer/product/order data, credentials, or local environment secrets.
- Preserve Cherylish-specific branding and the prior removal of AI Studio/storefront/POS screens.
- Any POS integration copied from GEME must be adapted to Loyverse, using the free-plan capabilities and the existing `LOYVERSE_*` configuration. Do not carry POS365 integrations into Cherylish.
- Inventory inbound and outbound flows are limited to jewelry (`JEWELRY`) and gemstones (`GEMSTONE`). Do not import the separate `Vật phẩm` logic or data.
- Inspect the upstream diff first and keep existing local work intact when selectively bringing changes over.
