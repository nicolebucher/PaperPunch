@AGENTS.md

# Version history (keep it current)

Every shipped change to the website or the Android app must be recorded, in English, in both places:

1. `CHANGELOG.md` in this repo – newest version on top, one table row per change (`Area | Change`).
2. The shared doc “PaperPunch – Version history”: https://claude.ai/artifact/DRfk8rsKfQGa1KSYcjWtTH (same content).

Versioning: v0.x during beta; new features bump the minor (v0.3), pure fixes the patch (v0.2.1); v1.0 = first public Play Store release. A new day of feature work starts a new minor version. When a "Planned" item ships, move it into the version table.

# Project handbook (keep it current)

The shared doc “PaperPunch – Project handbook” (https://claude.ai/artifact/Dmnea4bUSyD7E4CuVhW2Wu, English) describes how everything is set up right now: tool stack, accounts, domains/DNS, email addresses, Vercel projects, environment variable names, Android build steps, AI models and costs, data storage, open items. Update it whenever any of these change. Never write passwords, API keys or other secret values into it.
