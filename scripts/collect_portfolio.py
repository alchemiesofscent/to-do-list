#!/usr/bin/env python3
"""Collect repo state for the alchemiesofscent account into data/portfolio.json.

Runs in GitHub Actions (or locally). Stdlib only.

Env:
  PORTFOLIO_TOKEN  fine-grained PAT, read-only Contents+Metadata, all repos
                   (falls back to GITHUB_TOKEN, which only sees public repos
                   plus the repo the workflow runs in)
Per repo it records: visibility, default branch, last push, archived flag,
branch list with ahead/behind vs default, open PR count, and the contents
of STATUS.md if present.
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
MAX_BRANCH_COMPARES = 20  # skip ahead/behind detail on branch-explosion repos


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
        if e.code == 404:
            return None
        raise


def paginate(path, sep="?"):
    page, out = 1, []
    while True:
        batch = gh(f"{path}{sep}per_page=100&page={page}")
        if not batch:
            break
        out.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return out


def list_repos():
    # /user/repos with a PAT returns private repos owned by the token's user;
    # fall back to the public listing if the token can't use /user/repos.
    repos = []
    try:
        repos = paginate("/user/repos?affiliation=owner", sep="&")
    except urllib.error.HTTPError:
        pass
    if not repos:
        repos = paginate(f"/users/{ACCOUNT}/repos")
    return [r for r in repos if r["owner"]["login"].lower() == ACCOUNT.lower()]


def status_md(full_name, default_branch):
    doc = gh(f"/repos/{full_name}/contents/STATUS.md?ref={default_branch}")
    if not doc or "content" not in doc:
        return None
    try:
        return base64.b64decode(doc["content"]).decode("utf-8", errors="replace")
    except Exception:
        return None


def branch_info(full_name, default_branch):
    branches = paginate(f"/repos/{full_name}/branches")
    out = []
    compare = len(branches) <= MAX_BRANCH_COMPARES
    for b in branches:
        entry = {"name": b["name"]}
        if b["name"] != default_branch and compare:
            cmp_ = gh(f"/repos/{full_name}/compare/{default_branch}...{b['name']}")
            if cmp_:
                entry["ahead"] = cmp_.get("ahead_by")
                entry["behind"] = cmp_.get("behind_by")
        out.append(entry)
    return out, (not compare)


def main():
    if not TOKEN:
        print("WARNING: no token; only public repos will be visible", file=sys.stderr)
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "account": ACCOUNT,
        "repos": [],
    }
    for r in sorted(list_repos(), key=lambda x: x["pushed_at"] or "", reverse=True):
        full = r["full_name"]
        default = r["default_branch"]
        branches, skipped = branch_info(full, default)
        pulls = paginate(f"/repos/{full}/pulls?state=open", sep="&")
        entry = {
            "name": r["name"],
            "private": r["private"],
            "archived": r["archived"],
            "default_branch": default,
            "pushed_at": r["pushed_at"],
            "open_prs": len(pulls),
            "branches": branches,
            "branch_compare_skipped": skipped,
            "status_md": status_md(full, default),
        }
        report["repos"].append(entry)
        print(f"  {full}: {len(branches)} branches, {len(pulls)} open PRs,"
              f" STATUS.md={'yes' if entry['status_md'] else 'no'}")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {OUT}: {len(report['repos'])} repos")


if __name__ == "__main__":
    main()