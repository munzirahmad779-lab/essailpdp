<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Persist one conversation per authenticated user; interview session rows are chronological segments and message metadata holds the segment ID, so interviewer histories do not become separate threads.
- Store user-facing names in owner-scoped profiles created by an auth lifecycle trigger.
- Keep AI credentials and requests in server-only modules and authenticated streaming routes; use AI Elements for the conversation surface.
- Load the PDF.js worker through a Vite URL asset import so its version-matched file is included in published deployments.
