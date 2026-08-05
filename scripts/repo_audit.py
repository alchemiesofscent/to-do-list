#!/usr/bin/env python3
"""repo_audit.py — inventory every git repo on a machine.

Read-only (optional `--fetch` updates remote-tracking refs, nothing else).
Stdlib only. Works on Windows / macOS / Linux; requires git on PATH.

Usage (from a clone of to-do-list):
  python scripts/repo_audit.py --machine metopion --root C:\\Projects --root C:\\Users\\sean
  python scripts/repo_audit.py --machine metopion --root C:\\Projects --fetch

Writes data/machines/<machine>.json and prints a table.
Commit the JSON so the dashboard shows this machine's state.

Per repo it reports:
  dirty file count, stash count, remotes, branches (upstream, ahead/behind,
  last commit date), branches with no upstream, repos with no remote,
  worktrees (and which main repo they belong to), last activity.
"""

import argparse
import json
import os
import socket
import subprocess
import sys
from datetime import datetime, timezone

SKIP_DIRS = {
    "node_modules", ".venv", "venv", "env", ".tox", "__pycache__",
    "site-packages", ".cache", ".npm", ".cargo", ".rustup", ".gradle",
    "AppData", "Library", ".Trash", "$RECYCLE.BIN", "System Volume Information",
    ".git",  # never descend into git dirs themselves
}


def git(repo, *args, timeout=60):
    try:
        r = subprocess.run(
            ["git", "-C", repo, *args],
            capture_output=True, text=True, timeout=timeout,
        )
        return r.returncode, r.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        return 1, f"ERROR: {e}"


def find_repos(roots):
    repos, worktrees = [], []
    for root in roots:
        root = os.path.abspath(os.path.expanduser(root))
        for dirpath, dirnames, filenames in os.walk(root, topdown=True):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            gitpath = os.path.join(dirpath, ".git")
            if os.path.isdir(gitpath):
                repos.append(dirpath)
                dirnames[:] = []  # don't descend into a repo looking for nested repos? keep scanning submodule-free
            elif os.path.isfile(gitpath):
                try:
                    with open(gitpath, encoding="utf-8", errors="replace") as f:
                        first = f.readline().strip()
                    target = first.removeprefix("gitdir:").strip()
                except OSError:
                    target = "?"
                worktrees.append({"path": dirpath, "gitdir": target})
                dirnames[:] = []
    return repos, worktrees


def branch_rows(repo):
    code, out = git(
        repo, "for-each-ref", "refs/heads",
        "--format=%(refname:short)|%(upstream:short)|%(upstream:track)|%(committerdate:iso8601-strict)",
    )
    rows = []
    if code != 0:
        return rows
    for line in out.splitlines():
        parts = (line.split("|") + ["", "", "", ""])[:4]
        name, upstream, track, date = parts
        row = {"name": name, "upstream": upstream or None, "tip_date": date or None}
        if track == "[gone]":
            row["upstream_gone"] = True
        elif track:
            t = track.strip("[]")
            for piece in t.split(","):
                piece = piece.strip()
                if piece.startswith("ahead"):
                    row["ahead"] = int(piece.split()[1])
                elif piece.startswith("behind"):
                    row["behind"] = int(piece.split()[1])
        elif upstream:
            row["ahead"] = 0
            row["behind"] = 0
        rows.append(row)
    return rows


def audit_repo(path, fetch):
    info = {"path": path}
    if fetch:
        git(path, "fetch", "--all", "--quiet", timeout=120)

    _, remotes = git(path, "remote", "-v")
    info["remotes"] = sorted({line.split()[1] for line in remotes.splitlines() if line.split()}) if remotes else []
    info["no_remote"] = not info["remotes"]

    _, status = git(path, "status", "--porcelain")
    info["dirty_files"] = len(status.splitlines()) if status else 0

    _, stashes = git(path, "stash", "list")
    info["stashes"] = len(stashes.splitlines()) if stashes else 0

    _, head = git(path, "rev-parse", "--abbrev-ref", "HEAD")
    info["head"] = head or "?"

    _, last = git(path, "log", "-1", "--format=%cI")
    info["last_commit"] = last or None

    info["branches"] = branch_rows(path)
    info["unpushed_branches"] = [
        b["name"] for b in info["branches"]
        if b.get("ahead", 0) > 0 or (b["upstream"] is None and not info["no_remote"])
    ]

    _, wt = git(path, "worktree", "list", "--porcelain")
    info["worktrees"] = [
        line.removeprefix("worktree ").strip()
        for line in wt.splitlines() if line.startswith("worktree ")
    ][1:]  # first entry is the repo itself

    return info


def risk(info):
    flags = []
    if info["no_remote"]:
        flags.append("NO-REMOTE")
    if info["dirty_files"]:
        flags.append(f"dirty:{info['dirty_files']}")
    if info["stashes"]:
        flags.append(f"stash:{info['stashes']}")
    if info["unpushed_branches"]:
        flags.append(f"unpushed:{','.join(info['unpushed_branches'])}")
    if info["worktrees"]:
        flags.append(f"worktrees:{len(info['worktrees'])}")
    return " ".join(flags) or "clean"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", action="append", required=True,
                    help="directory to scan (repeatable)")
    ap.add_argument("--machine", default=socket.gethostname().lower())
    ap.add_argument("--fetch", action="store_true",
                    help="git fetch each repo first (needs network; slower)")
    ap.add_argument("--out", default=None,
                    help="output JSON path (default data/machines/<machine>.json)")
    args = ap.parse_args()

    repos, worktrees = find_repos(args.root)
    print(f"Found {len(repos)} repos, {len(worktrees)} detached worktrees "
          f"under {', '.join(args.root)}\n")

    results = []
    for path in sorted(repos):
        info = audit_repo(path, args.fetch)
        results.append(info)
        print(f"{path}\n  head={info['head']} last={str(info['last_commit'])[:10]} "
              f"remotes={len(info['remotes'])}  {risk(info)}")

    if worktrees:
        print("\nDetached worktrees (belong to another repo's .git):")
        for w in worktrees:
            print(f"  {w['path']}  ->  {w['gitdir']}")

    report = {
        "machine": args.machine,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "roots": [os.path.abspath(os.path.expanduser(r)) for r in args.root],
        "fetched": args.fetch,
        "repos": results,
        "detached_worktrees": worktrees,
    }
    out = args.out or os.path.join("data", "machines", f"{args.machine}.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"\nWrote {out} — commit it so the dashboard sees {args.machine}.")


if __name__ == "__main__":
    main()