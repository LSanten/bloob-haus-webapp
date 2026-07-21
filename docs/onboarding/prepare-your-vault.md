# Prepare Your Vault

**Audience:** you have an Obsidian vault (or any folder of markdown) and want it to become a website.
**The good news:** you probably don't need to restructure it. This doc explains the *minimum* that
makes a vault build cleanly, and the *optional* richness you can add later.

> **The core promise:** a plain markdown file, with no special frontmatter at all, becomes a working
> web page. The only piece of frontmatter that changes how a page *looks* is `bloob-shape:`, and even
> that is optional. Everything below is either "already true, nothing to do" or "optional polish."

---

## 1. How your vault becomes a site (the two rules)

1. **Folder = URL.** A file at `recipes/soups/miso.md` becomes the page `/recipes/soups/miso/`.
2. **Filename = page identity.** The filename (its slug) is the page's stable name and its URL. Its
   `title:` frontmatter is just the display heading — rename the *file* and the URL changes; change
   the *title* and only the visible heading changes.

That's the whole mental model. Your existing folder structure **is** your site structure. If you're
happy with how your vault is organized, you're already done with this step.

> For the precise details of slug generation, casing, and page IDs, see the single source of truth:
> [`../architecture/urls-and-ids.md`](../architecture/urls-and-ids.md).

---

## 2. The one file your vault needs: `_bloob-settings.md`

At the **root** of your vault, create a file called `_bloob-settings.md`. This holds your *author*
settings (site title, author name, comment embeds, the default shape, etc.) — as opposed to the
*infrastructure* settings (which vault, which theme) that live in `sites/*.yaml` in the builder repo.

Files beginning with `_bloob-` are system files: they configure the build and are never published as
pages. Copy the `_bloob-settings.md` from the **melt** reference vault as your starting point.

> The complete list of what can go in `_bloob-settings.md` (and every per-page setting) is maintained
> in one place: [`../architecture/settings-registry.md`](../architecture/settings-registry.md). Don't
> memorize it — link to it.

---

## 3. The only load-bearing frontmatter: `bloob-shape:`

A page with **no** frontmatter still works — it renders with the default page layout. When you want a
page to be a *particular kind of thing*, add one line:

```yaml
---
bloob-shape: article
---
```

`bloob-shape:` is the single, forward-facing key that gives a page its **identity** (banner image,
icon, display name) and its **rendering** (special layout, if the shape has one). Some examples of
shapes: `article` (a clean reading layout), `marble` (Leon's note object), `folder-preview` (an index
of a folder), `garden` (an interactive canvas).

Two things to know and no more:

- If you name a shape that doesn't exist yet, nothing breaks — the page falls back to the default
  layout. So `bloob-shape: note` is safe even before a `note` shape is built.
- You can set a **default shape for the whole vault** in `_bloob-settings.md` (`default_shape:`), so
  you don't repeat it on every page.

> What shapes exist, what each one does, and how to author content for them is the domain of
> [`../architecture/shapes.md`](../architecture/shapes.md). The concept behind shapes — why a note is
> an *object* with a kind, not just a document — is in
> [`../architecture/ontology.md`](../architecture/ontology.md). This onboarding doc deliberately does
> **not** duplicate the shape catalog; it would go stale. Go there.

### Legacy note (only if you inherited an older vault)
Older vaults used `bloob-type:` or `bloob-object:` and a `_bloob-types.md` / `_bloob-objects.md`
registry. These still work — the builder reads them — but `bloob-shape:` (+ an optional
`_bloob-shapes.md` registry) is the one to learn and use going forward.

---

## 4. Images and media — recommended convention

**What's true today:** the build copies *every* image and media file it finds anywhere in your vault,
preserving folder structure, and resolves links to them. So media technically works from wherever you
keep it. **But** there is one sharp edge worth avoiding.

### The recommendation: one `media/` folder at your vault root

Put your images in a single **`media/`** folder at the top of your vault, and configure Obsidian to
save attachments there automatically:

**Obsidian → Settings → Files & Links → Default location for new attachments → "In the folder
specified below" → `media`.**

Now every image you paste into a note lands in `media/`, and it will be served at a predictable
`/media/<filename>` URL.

### Why this is recommended (the honest reason)

Obsidian's wiki-style embeds — `![[photo.png]]` — resolve by **filename only**, not by folder path.
If you have two different files both named `photo.png` in different folders, the build can't tell them
apart and one silently wins. Keeping all media in one folder (and letting Obsidian auto-name pasted
images, which produces unique names) sidesteps this entirely.

- **Wiki embeds** `![[photo.png]]` → matched by filename. Unique filenames = safe.
- **Markdown / HTML** `![](media/photo.png)` or `<img src="...">` → matched by path first, then
  filename. More robust, but the single-folder habit keeps things predictable.

**You are not forced into this.** Media in subfolders, or co-located next to notes, still builds. The
single-`media/` folder is simply the convention least likely to surprise you. *(This section is the
canonical home for the media convention — other docs should link here rather than restate it.)*

### Size limits (automatic, just so you know)
Images over 20 MB are auto-compressed; files over 25 MB that can't be compressed are skipped (a
Cloudflare Pages hard limit). You'll see a warning in the build log if this happens.

---

## 5. Keeping things private

Nothing is published by accident. You choose one of two modes in `_bloob-settings.md`:

- **Blocklist:** tag a note (e.g. `#not-for-public`) and it's excluded from the build.
- **Allowlist:** nothing publishes unless explicitly marked `publish: true`.

For genuinely private-but-shareable content (an unguessable "anyone with the link" URL), there's a
separate, carefully-bounded convention — **read it before relying on it**, because it is security by
obscurity, not access control: [`../architecture/security-by-obscurity.md`](../architecture/security-by-obscurity.md).

---

## 6. A minimal starting checklist

- [ ] Vault is a git repo (a private GitHub repo is the normal setup).
- [ ] `_bloob-settings.md` at the vault root (copied from the melt reference, then personalized).
- [ ] A `media/` folder at the root, with Obsidian set to save attachments there.
- [ ] (Optional) A `default_shape:` in `_bloob-settings.md`, or `bloob-shape:` on the pages you want
      to style specially.
- [ ] That's genuinely it. Next: [`fork-deploy-and-workflow.md`](fork-deploy-and-workflow.md).

---

## Document-as-you-go

If you're an early adopter working directly with the Bloob Haus maintainer, you may have been given a
**collaborator kit** that asks your AI assistant to log the friction you hit while doing the above.
That log is how the vault-preparation experience gets smoother for the next person. If that applies to
you, see [`../collaborators/`](../collaborators/). If you're a solo self-serve user, ignore this — it
doesn't apply to you.
