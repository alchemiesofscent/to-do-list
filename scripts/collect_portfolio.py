#!/usr/bin/env python3
"""Collect repo state for the alchemiesofscent account into data/portfolio.json.

v2 — adds per-branch tip commit (date/message/author), PR mapping per branch,
README capture (truncated), and a listing of all .md files per repo.

Runs in GitHub Actions (or locally). Stdlib only.

Env:
  PORTFOLIO_TOKEN  fine-grained PAT, read-only Contents+Metadata+Pull requests,
                   all repos (falls back to GITHUB_TOKEN: public repos only)
"""

import base64
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

API = "https://api.github.com"
ACCOUNT = os.environ.get("PORTFOLIO_ACCOUNT", "alchemiesofscent")
TOKEN = os.environ.get("PORTFOLIO_TOKEN") or os.environ.get("GITHUB_TOKEN")
OUT = os.environ.get("PORTFOLIO_OUT", "data/portfolio.json")
MAX_BRANCH_DETAIL = 25   # skip compare/tip detail beyond this many branches
README_MAX = 4000        # chars of README to keep


def gh(path, accept="application/vnd.github+json"):
    req = urllib.request.Request(API + path)
    req.add_header("Accept", accept)
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    if TOKEN:
        req.add_header("Authorization", f"Bearer {TOKEN}")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code in (403, 404, 409):  # 409 = empty repo
            if e.code == 403:
                print(f"WARN: 403 on {path} (missing PAT permission?)", file=sys.stderr)
            return None
        raise


def paginate(path, sep="?", max_pages=10):
    page, out = 1, []
    while page <= max_pages:
        batch = gh(f"{path}{sep}per_page=100&page={page}")
        if not batch:
            break
        out.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return out


def list_repos():
    repos = []
    try:
        repos = paginate("/user/repos?affiliation=owner", sep="&")
    except urllib.error.HTTPError:
        pass
    if not repos:
        repos = paginate(f"/users/{ACCOUNT}/repos")
    return [r for r in repos if r["owner"]["login"].lower() == ACCOUNT.lower()]


def file_text(full_name, path, ref, max_chars):
    doc = gh(f"/repos/{full_name}/contents/{path}?ref={ref}")
    if not doc or "content" not in doc:
        return None
    try:
        text = base64.b64decode(doc["content"]).decode("utf-8", errors="replace")
    except Exception:
        return None
    if len(text) > max_chars:
        text = text[:max_chars] + f"\n…[truncated at {max_chars} chars]"
    return text


def md_files(full_name, default_branch):
    """All .md paths in the repo (git tree, one API call)."""
    tree = gh(f"/repos/{full_name}/git/trees/{default_branch}?recursive=1")
    if not tree or "tree" not in tree:
        return [], False
    paths = [t["path"] for t in tree["tree"]
             if t["type"] == "blob" and t["path"].lower().endswith(".md")]
    return sorted(paths), bool(tree.get("truncated"))


def pr_map(full_name):
    """Map head branch name -> PR summary (open and recently closed)."""
    prs = paginate(f"/repos/{full_name}/pulls?state=all&sort=updated&direction=desc",
                   sep="&", max_pages=1)
    out = {}
    for p in prs or []:
        head = p.get("head", {}).get("ref")
        if head and head not in out:
            out[head] = {
                "number": p["number"],
                "title": p["title"],
                "state": p["state"],
                "merged_at": p.get("merged_at"),
                "updated_at": p.get("updated_at"),
            }
    return out


def branch_detail(full_name, default_branch, prs_by_head):
    branches = paginate(f"/repos/{full_name}/branches")
    detail_ok = len(branches) <= MAX_BRANCH_DETAIL
    out = []
    for b in branches:
        entry = {"name": b["name"]}
        if detail_ok:
            sha = b.get("commit", {}).get("sha")
            if sha:
                c = gh(f"/repos/{full_name}/commits/{sha}")
                if c:
                    ci = c.get("commit", {})
                    entry["tip_date"] = (ci.get("committer") or {}).get("date")
                    entry["tip_author"] = (ci.get("author") or {}).get("name")
                    msg = (ci.get("message") or "").splitlines()
                    entry["tip_message"] = msg[0][:200] if msg else None
            if b["name"] != default_branch:
                cmp_ = gh(f"/repos/{full_name}/compare/{default_branch}...{b['name']}")
                if cmp_:
                    entry["ahead"] = cmp_.get("ahead_by")
                    entry["behind"] = cmp_.get("behind_by")
        pr = prs_by_head.get(b["name"])
        if pr:
            entry["pr"] = pr
        out.append(entry)
    return out, (not detail_ok)


def main():
    if not TOKEN:
        print("WARNING: no token; only public repos will be visible", file=sys.stderr)
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "account": ACCOUNT,
        "schema": 2,
        "repos": [],
    }
    for r in sorted(list_repos(), key=lambda x: x["pushed_at"] or "", reverse=True):
        full = r["full_name"]
        default = r["default_branch"]
        prs_by_head = pr_map(full)
        branches, skipped = branch_detail(full, default, prs_by_head)
        docs, docs_truncated = md_files(full, default)
        open_prs = sum(1 for p in prs_by_head.values() if p["state"] == "open")
        entry = {
            "name": r["name"],
            "private": r["private"],
            "archived": r["archived"],
            "default_branch": default,
            "pushed_at": r["pushed_at"],
            "open_prs": open_prs,
            "branches": branches,
            "branch_detail_skipped": skipped,
            "md_files": docs,
            "md_files_truncated": docs_truncated,
            "readme": file_text(full, "README.md", default, README_MAX),
            "status_md": file_text(full, "STATUS.md", default, README_MAX),
        }
        report["repos"].append(entry)
        print(f"  {full}: {len(branches)} branches, {open_prs} open PRs, "
              f"{len(docs)} md files, STATUS.md={'yes' if entry['status_md'] else 'no'}")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {OUT}: {len(report['repos'])} repos")


if __name__ == "__main__":
    main()