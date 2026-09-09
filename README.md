# Split the bill

Photograph a receipt, share a QR, everyone taps what they had. Tax and tip get
split in proportion to what each person ordered, so whoever put down their card
doesn't absorb the difference. Nobody needs an account.

## Six files

| File | What it is |
|---|---|
| `package.json` | drag it in |
| `schema.sql` | drag it in — paste into Supabase, never runs from here |
| `README.md` | drag it in |
| `app/layout.js` | page shell and the whole stylesheet |
| `app/lib.js` | the money math and the database connection |
| `app/page.js` | both screens: making a bill, and tapping one |
| `app/api/go/route.js` | reads receipts, creates bills |

No two files share a name, and there are only two folders to create.

## Getting it live

1. **supabase.com** → New project. Then SQL Editor → New query → paste all of
   `schema.sql` → Run. You want four tables: bills, items, diners, claims.
2. **Settings → Data API** for the Project URL, **Settings → API Keys** for the
   publishable key (`sb_publishable_...`) and the secret key (`sb_secret_...`).
   Older projects show `anon` and `service_role` instead — same things.
3. **console.anthropic.com** → add a little credit → create an API key.
4. Put the six files in a GitHub repo (see below).
5. **vercel.com** → Add New → Project → import the repo. Before deploying, add
   four environment variables:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
   | `SUPABASE_SECRET_KEY` | `sb_secret_...` |
   | `ANTHROPIC_API_KEY` | `sk-ant-...` |

6. Deploy.

### Getting the files into GitHub from a browser

Drag `package.json`, `schema.sql` and `README.md` straight in — they're loose
files with no structure to lose.

For the other four, use **Add file → Create new file** and type the path,
including the slashes. Typing a slash makes GitHub create the folder in front of
you. Paste the file's contents underneath, commit, repeat:

- `app/layout.js`
- `app/lib.js`
- `app/page.js`
- `app/api/go/route.js`

Never drag a folder into GitHub's uploader. It flattens the structure silently
and overwrites files that share a name.

## Why the total is typed

A receipt is two documents. Item lines, subtotal, tax and any card fee are
machine-printed and scan cleanly. The tip and the final total are written in pen,
and that's where character recognition invents digits.

So the scan ignores handwriting entirely and you type one number: the total you
wrote at the bottom. The tip is that total minus everything printed, which means
it can't disagree with itself. If the printed subtotal doesn't match the scanned
lines, the scan missed something and the app says so.

## The one function that matters

`computeShares`, near the bottom of `app/lib.js`. It treats the total charged to
the card as truth, because that's the number that left the account. Everything
above the item lines rides along in proportion to what each person ate, and
largest-remainder rounding makes the shares sum back to the charge exactly.

## Known limits

- Anyone with the link can claim any item, including someone else's. Among
  friends that's a feature.
- Bills are never deleted. The free tier won't fill up for years.
- Two big files instead of eight small ones is worse for maintenance. That's the
  trade for being able to deploy from a locked-down browser.
