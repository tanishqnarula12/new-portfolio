# Deploying tanishqnarula.dev

**Where this ends up:** the site is live at **https://tanishqnarula.dev**. `www.tanishqnarula.dev` forwards to it, and every `git push` to `main` updates the site by itself.

**Time:** about 15 minutes of clicking, then a wait for DNS (usually 5–30 minutes, at most a few hours).

**You need:** your GitHub login (`tanishqnarula12`) and your name.com login. Nothing to install. The site is plain HTML, so there is no build step.

---

## Step 1. Put the latest code on GitHub

In the VS Code terminal, inside the project folder:

```bash
git push origin main
```

(Or just tell Claude "push".)

**Check:** open https://github.com/tanishqnarula12/new-portfolio. You should see a `media` folder and today's commits.

---

## Step 2. Create the project on Vercel

1. Go to **https://vercel.com/signup** and click **Continue with GitHub**. Sign in as `tanishqnarula12` and pick the free **Hobby** plan.
2. On the dashboard click **Add New…** → **Project**.
3. Find **new-portfolio** in the list and click **Import**.
   *Not in the list?* Click **Adjust GitHub App Permissions**, allow access to `new-portfolio`, and come back.
4. On the **Configure Project** screen:

   | Setting | What to choose |
   |---|---|
   | Framework Preset | **Other** |
   | Root Directory | `./` (leave as is) |
   | Build and Output Settings | leave everything empty |
   | Environment Variables | none |

5. Click **Deploy** and wait about a minute.
6. Click the preview link Vercel shows (something like `new-portfolio-xxxx.vercel.app`) and check:
   - the home page loads and the doors open,
   - a room (for example Web Development) plays its videos,
   - the Contact page opens.

---

## Step 3. Add your domain in Vercel

1. In the project, open **Settings** → **Domains** → **Add Domain**.
2. Type **`tanishqnarula.dev`** and click **Add**.
3. Vercel offers to add `www` too. Choose the option where **`www.tanishqnarula.dev` redirects to `tanishqnarula.dev`**.
   > The site's links, sitemap and Google data all use the address **without** www, so that one must be the main domain.

   **If it came out the other way round** (the plain domain redirecting to www):
   click **Edit** on `www.tanishqnarula.dev` → **Redirect to** `tanishqnarula.dev` (308) → Save.
   Then click **Edit** on `tanishqnarula.dev` → make sure it is **not** redirecting → Save.
4. Both domains now say **Invalid Configuration** and show the DNS records you need. **Keep this tab open.** It will look roughly like this:

   | Domain | Type | Name | Value (copy from **your** screen) |
   |---|---|---|---|
   | tanishqnarula.dev | **A** | `@` | an IP address, e.g. `216.198.79.1` (older projects show `76.76.21.21`) |
   | www.tanishqnarula.dev | **CNAME** | `www` | something like `abc123def456.vercel-dns-017.com` |

   Always copy the exact values Vercel shows you. The CNAME value is unique to your project.

---

## Step 4. Point the domain to Vercel on name.com

1. Log in at **https://www.name.com** → **My Domains** → click **tanishqnarula.dev**.
2. Check the **Nameservers** are name.com's own (`ns1.name.com` … `ns4.name.com`). If they are something else, change them back to name.com's defaults first, otherwise the records below are ignored.
3. Click **Manage DNS Records**.
4. **Delete the website records name.com added by default.** That means any **A, AAAA, ALIAS, ANAME or CNAME** record whose **Host** is empty, `@`, `www` or `*`. They point to a parking page and block Vercel.
   **Keep** any **MX** and **TXT** records (email and verification).
5. Add the first record:
   - **Type:** `A`
   - **Host:** leave **empty**
   - **Answer:** the IP from Vercel (step 3.4)
   - **TTL:** `300`
   - click **Add Record**
6. Add the second record:
   - **Type:** `CNAME`
   - **Host:** `www`
   - **Answer:** the `…vercel-dns…com` value from Vercel
   - **TTL:** `300`
   - click **Add Record**
7. Your list should now have **only these two** for the website:

   | Type | Host | Answer |
   |---|---|---|
   | A | *(empty)* | Vercel's IP |
   | CNAME | www | Vercel's `…vercel-dns…com` value |

---

## Step 5. Wait for the green tick

- Go back to Vercel → **Settings** → **Domains**. Within minutes (sometimes a few hours) both domains turn to **Valid Configuration**. Vercel then creates the HTTPS certificate automatically.
- `.dev` addresses **only work over HTTPS**; browsers enforce this. Until the certificate is ready the site won't open at all. That's normal: don't change anything, just wait.
- **Test:**
  - https://tanishqnarula.dev opens the site
  - https://www.tanishqnarula.dev jumps to https://tanishqnarula.dev
- Optional check in the terminal:
  ```bash
  dig +short tanishqnarula.dev        # should print Vercel's IP
  dig +short www.tanishqnarula.dev    # should print the vercel-dns name
  ```

---

## Step 6. After it's live (so people find you)

1. **Google Search Console:** go to https://search.google.com/search-console → **Add property** → choose **Domain** → type `tanishqnarula.dev`.
   - Google gives you a **TXT** record. In name.com add it: **Type** `TXT`, **Host** empty, **Answer** the `google-site-verification=…` text, then **Add Record**.
   - Back in Google click **Verify**. Then open **Sitemaps** and submit `https://tanishqnarula.dev/sitemap.xml`.
2. **Bing Webmaster Tools** (optional, also feeds some AI search): https://www.bing.com/webmasters → **Import from Google Search Console**.
3. Put **https://tanishqnarula.dev** as the website on your GitHub profile (it currently says `tanishqnarula12.netlify.app`) and on LinkedIn.

---

## Updating the site later

- **Every push to `main` redeploys automatically** in about a minute. Watch it under Vercel → **Deployments**.
- **Something broke?** Vercel → **Deployments** → open the last good one → **⋯** → **Promote to Production** (instant rollback).
- After an update, hard-refresh to see it: **Cmd + Shift + R** (Safari: **Develop → Empty Caches** if it still looks old).

---

## If something goes wrong

| What you see | What to do |
|---|---|
| Vercel says **Invalid Configuration** for hours | name.com still has an old A / AAAA / ALIAS / CNAME for empty host, `@`, `www` or `*`. Delete it. Also check the nameservers are name.com's. |
| The domain shows a **name.com parking page** | Same as above: a default parking record is still there. |
| **"Your connection is not private"** right after setup | The certificate is still being issued. Wait 10–30 minutes. |
| `www` works but the plain domain doesn't (or the reverse) | Both must be added in Vercel → Domains, with `www` redirecting to `tanishqnarula.dev`. |
| Videos don't play on your Mac with `python3 -m http.server` | That server can't stream video to Safari. Online on Vercel they work. Locally, use Chrome or a server that supports "range" requests. |
| A page shows **404** | Make sure `vercel.json` is in the repo root and the address ends with `/` (e.g. `/web-developer/`). |
