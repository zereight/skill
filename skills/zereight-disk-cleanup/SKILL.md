---
name: zereight-disk-cleanup
description: Diagnose a full macOS disk for mobile development and free space by removing verified-unused build artifacts and caches, confirming with the user before deleting.
---

# Disk Cleanup for Mobile Dev

Use when the disk is full, the Android emulator fails with space errors
(e.g. "Not enough space to create userdata partition"), or the user asks
to free space. Investigate first, then delete only what the user confirms.

## 1. Diagnose

Start with overall pressure, then measure suspects (largest first):

```sh
df -h ~ /tmp
du -sh ~/Library/Developer/Xcode/DerivedData ~/Library/Developer/CoreSimulator \
  ~/Library/Caches/Google ~/Library/Android ~/.gradle ~/.android ~/.cache 2>/dev/null
```

Per-area breakdown as needed:

- **Android system images**: `du -sh ~/Library/Android/sdk/system-images/*/*/*`
  vs references: `grep -h image.sysdir ~/.android/avd/*/*.ini
  ~/.android/avd/*.avd/config.ini`. Also check `ANDROID_AVD_HOME` /
  `ANDROID_SDK_HOME` for alternate AVD locations. An image no AVD
  references is a deletion candidate. Emulator needs ~7.4 GB free for a
  new AVD's userdata partition.
- **DerivedData**: `du -sm .../* | sort -rn` plus `ls -lt` for age. Same
  project appears under multiple hashes; keep the recently touched one
  plus shared caches (`ModuleCache.noindex`, `SymbolCache.noindex`,
  `SDKStatCaches.noindex`, `CompilationCache.noindex`). Never delete
  while `xcodebuild` or Xcode is running.
- **Simulators**: `xcrun simctl list devices` to see runtime sets; all
  Shutdown sets for unused iOS versions are candidates.
- **Python/ML caches**: `uv` cache and `~/.cache/huggingface/hub/models--*`
  with sizes. For models, check last access (`ls -ltu` on blobs) and
  running consumers (`mlx`, `ollama`, `lm-studio`) before calling one
  unused.
- **Docker**: `docker system df`; fully reclaimable images/build cache
  are candidates.
- **Workspace**: `ios/build`, `android/app/build`, `node_modules`,
  `.turbo`. Build outputs are regenerable; `node_modules` usually stays.

## 2. Verify "in use"

Never delete on size alone. For each candidate, state the basis:
which AVD/process/mtime/atime evidence shows it is unused. If the
evidence is inconclusive (e.g. a model touched recently), ask instead
of assuming.

## 3. Confirm, then delete

Show one table: path, size, why it is safe. Delete only confirmed
entries, keep everything active, then verify with `du` and `df -h`.

- Prefer tool-native pruning: `uv cache prune` over `rm`, `xcrun simctl
  delete` over raw deletes.
- Files owned by root (e.g. from a past `sudo` run) block pruning. Do
  not work around with force; hand the user this one-liner instead:

```sh
sudo chown -R $(whoami):staff <path> && <prune-command>
```

and verify after they run it.

## 4. Report

Sizes before/after per area, free space before/after, what was kept
and why, and what remains as future candidates.
