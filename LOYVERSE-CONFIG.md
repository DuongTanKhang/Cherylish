# Loyverse local configuration

This GEME setup uses only Loyverse free-plan features. Current GEME stack configuration is prepared with `LOYVERSE_ENABLED=false`; no Loyverse token was present on this PC, so no account connection or data sync has been enabled.

To connect later, create an API access token in Loyverse Back Office and set `LOYVERSE_ENABLED=true`, `LOYVERSE_ACCESS_TOKEN`, and `LOYVERSE_STORE_ID` in the private, ignored `.env.docker` file. Keep the token out of chat and browser-visible variables. Then restart GEME.

The free Loyverse tier includes basic stock tracking, low-stock notifications, variants/composite items, CSV import/export, POS, and sales analytics for the latest 31 days. Advanced Inventory features such as purchase orders, stock transfers, adjustments, inventory count/history/valuation, and production require a paid add-on; GEME does not enable or trial paid features.

Note: API credentials are only staged in Compose; automatic synchronization and a connection test endpoint are not implemented yet. GEME remains the local source for inbound/outbound inventory documents and history until a credentialed connector is added and verified.

Official references: [Loyverse pricing](https://loyverse.com/pricing), [Advanced Inventory](https://help.loyverse.com/help/advanced-inventory-management), [Loyverse API](https://developer.loyverse.com/docs/), [Access token guide](https://help.loyverse.com/help/loyverse-api).
