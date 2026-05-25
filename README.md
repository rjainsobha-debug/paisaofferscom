# PaisaOffers Static Deal Publishing

PaisaOffers.com stays a static HTML/CSS/JS website. Approved affiliate deals are published from Excel into `data/deals.json`.

## Publish Deals

1. Put the Excel file at `tools/amazon_deal_queue.xlsx`.
2. Review each row manually.
3. Paste the Amazon SiteStripe affiliate link into `site_stripe_affiliate_link`.
4. Set `review_status` to `APPROVED` for rows that should go live.
5. Run:

```bash
python tools/publish_deals.py
```

6. Check:

```bash
tools/publish_report.txt
```

7. Confirm:

```bash
data/deals.json
```

8. Commit and push:

```bash
git add data/deals.json index.html styles.css script.js pages robots.txt sitemap.xml
git commit -m "Publish approved deals"
git push
```

The Excel workbook is ignored by Git and should not be committed.
