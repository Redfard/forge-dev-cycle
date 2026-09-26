# Progress viewer

A live picture of runs: on the left, the tasks of all watched projects; on the right, the task's
history by run, with timings of stages and steps. The data is the projects' `.forge/`, the format is
`../reference/progress.md`, and `../bin/forge-progress` writes it.

Only static files are here: `index.html`, `app.js`, `style.css`. The `.tsv` files are parsed in the
browser, so the server needs nothing: no PHP, no MIME setup, no charset.

## Set up

Once per machine, with the paths of your projects:

```bash
/path/to/plugin/forge/bin/forge-monitor ~/projects/meteoro ~/projects/other
```

The script puts everything machine-specific into `~/.config/forge-monitor` (changed by
`FORGE_MONITOR_HOME`): the project list, symlinks to their `.forge`, a ready compose file and symlinks
to these static files. **Nothing appears in the plugin** — it is shared and moves to another machine
as is, while each machine has its own projects.

**After a plugin update (`git pull`), run `forge-monitor` again.** Static files are mounted into the
container one by one, and a file mount keeps the inode: an editor that replaces the file leaves the
container with the old content. Running it again recreates the container and applies the update.

Projects changed — the same command with other paths. The declaration is the full list: what you did
not name is no longer watched. Without arguments the script shows the current list and both start
commands.

## Start

Either of two ways, both serve `~/.config/forge-monitor`:

```bash
docker compose -f ~/.config/forge-monitor/docker-compose.yml up -d
```

```bash
python3 -m http.server --bind 127.0.0.1 --directory ~/.config/forge-monitor 8903
```

The default port is `8903` (8901 is taken by the agent bus), change it with `FORGE_PORT=…` before
`forge-monitor` — it goes into the generated compose file. To stop docker:
`docker compose -f ~/.config/forge-monitor/docker-compose.yml down`.

In neither case is the port open to the outside — only `127.0.0.1`. From another machine:

```bash
ssh -f -N -L 8903:localhost:8903 YOU@HOST
```

then <http://localhost:8903>.

Docker and python differ in one thing: the container does not follow a symlink outside, so in compose
each project is mounted separately, while python reads the same projects through symlinks. The page
sees the same thing in both cases — `forge/<project>/…`.

## "Waiting for input" banner

When a session stops and waits for you — a question, a permission for a command — a red bar appears
at the top: the project, how the session started (usually a slash command — `/forge:auto`,
`/dc-review`), how long it has been waiting, and the question itself. The tab title
becomes `⚠ waiting for input: <project>`, so you can see it on an inactive tab. Several sessions can
be waiting — one line for each.

**The label is the session, not the task.** One folder can have several sessions at once — a
`forge:auto` run, a review by slash command, something else — and labeling it with the project's open
task would send you to answer in the wrong place. The label comes from the first message of the
transcript: it is how you find the session, unlike the id.

The marks are set by **session hooks**, not by the model: `Notification` knows the moment of waiting
and cannot forget it. **Three** hooks clear them: `UserPromptSubmit` — when you answered, `Stop` — when
the session finished its answer, and `SessionEnd` — when the session closed. `Stop` is required:
granting permission for a command is not a message, and without it a "needs your permission" mark
would hang until it is wiped out.
All four call `../bin/forge-waiting`, which
keeps one line per session in `$FORGE_MONITOR_HOME/waiting.tsv`; an abandoned mark goes away by itself
after an hour (`FORGE_WAITING_STALE_HOURS`).

Every Claude Code session writes marks, wherever it runs; the page shows only those whose project is
connected to the monitoring. The others stay silent, but the ntfy push for them works as usual.

Without the hooks everything else works as usual — there is just no banner.

## Moving to another machine

A tested sequence; everything machine-specific is created again, nothing appears in the skills
repository. `$PLUGIN` is the path where the skills repository is cloned (here `~/.agents/skills/forge`).

1. **The skills repository is in place** — `git clone` or `git pull`. Nothing else to do in the plugin.
2. **Each project has `.forge`** — if not, run `/forge:init` in it. Without this the project is not picked up.
3. **Declare the projects:**
   ```bash
   $PLUGIN/bin/forge-monitor ~/projects/first ~/projects/second
   ```
   Use your own paths; the command prints what it did, and both start commands.
4. **Start serving** — docker (starts again by itself after a reboot) or python, see "Start" above.
5. **Terminal status line** — add a call to `$PLUGIN/bin/progress-line "$cwd"` to the harness's
   status-line command, see `../reference/progress.md`.
6. **"Waiting for input" banner and long commands** — in `~/.claude/settings.json`, under `hooks`:
   ```json
   "Notification": [{ "matcher": "*", "hooks": [
     { "type": "command", "command": "$PLUGIN/bin/forge-waiting set" } ] }],
   "UserPromptSubmit": [{ "matcher": "*", "hooks": [
     { "type": "command", "command": "$PLUGIN/bin/forge-waiting clear" } ] }],
   "Stop": [{ "matcher": "*", "hooks": [
     { "type": "command", "command": "$PLUGIN/bin/forge-waiting clear" } ] }],
   "SessionEnd": [{ "matcher": "*", "hooks": [
     { "type": "command", "command": "$PLUGIN/bin/forge-waiting clear" } ] }],
   "PreToolUse": [{ "matcher": "Bash", "hooks": [
     { "type": "command", "command": "$PLUGIN/bin/forge-command pre" } ] }],
   "PostToolUse": [{ "matcher": "Bash", "hooks": [
     { "type": "command", "command": "$PLUGIN/bin/forge-command post" } ] }]
   ```
   Replace `$PLUGIN` with the real path — the harness does not expand variables here. If hooks
   already exist, the commands are **added** to their list, not put in place of the existing ones.
7. **Tunnel**, if the machine is remote — see "From another machine".
8. **Check:**
   ```bash
   curl -s http://127.0.0.1:8903/projects.tsv
   curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8903/
   $PLUGIN/bin/progress-line ~/projects/first   # empty if there is no run — this is normal
   ```

What breaks most often: step 3 forgotten after a `git pull` of the plugin (the container keeps the old
static files — file mounts do not notice a file being replaced), and `$PLUGIN` paths left as is in the
hooks.

## How to read the timeline

- **The "now" bar** above the timeline answers the first question people come here with: which main
  stage is running. The route `1…7` with the number highlighted, the stage name with a gloss, the
  stage time, and on a second line what it is busy with right now — a fix round, a step,
  `waiting for you`, `silent for 3h` for a run that has been quiet for long. A click on the bar
  scrolls the timeline to this stage's row.
  The timeline alone did not answer this: fix rounds stand in it as separate rows **after** their
  stage, and with "newest on top" the open stage moved below them, to the middle of the screen.
- **Find a stage by eye.** A stage has its number in a badge, a background and a bigger size; a round
  carries its stage's number in a faded badge — you can see that `fix 5` belongs to the sixth stage
  and does not stand alone. Stage keys are glossed right there (`manual-test` — "manual test").
- **One block per run.** The newest is expanded, past ones are collapsed — the header of a collapsed
  one shows at once how long it took and which stage was the longest. A click on the header expands it.
- **Two scales.** A stage bar is its share of the run, a step bar is its share of its stage. Otherwise,
  next to the longest stage, all steps turn into thin threads, and "what the stage was made of" cannot
  be read.
- **Percentages next to the number**: "31m" alone says nothing, "58%" answers at once.
- **Steps are collapsed for all stages except the running one.** A click on a stage expands or
  collapses it — an expanded history is a wall of rows, and people usually look at one stage, the
  current one.
- **The order button** in the header switches the timeline: newest on top (default) or oldest on top.
  The choice is remembered.
- **The tab icon** — three bars: green when everything runs by itself, red when some session is
  waiting for input. A shape with a clear fill, not an emoji: a glyph takes its color from the font,
  and on a dark tab bar it cannot be seen at all.
- **`not closed`** — a row that has no `end`, but after which something that replaces it has already
  started. It is not running: the duration is counted up to that start, not up to "now", otherwise a
  twelve-minute round looks like a day of work. The cause is always the same — the skill did not write
  the closing row. Not everything replaces it: **a stage is ended only by the next stage**, because the
  lead's fix rounds run inside its cycle (fixes from the review report, from the test report) and do
  not close it; a round is replaced both by a stage and by the next round.
- **Levels are kept apart visually:** a stage and a round have a top line and a bold name, their
  content has a background and a guide line on the left. Indent alone was not enough: a step and a
  stage read the same, and when copying, the indent is lost completely.
- **Step keys are glossed.** `claims` alone says nothing, so "list of claims" stands next to it — as
  text when the skill wrote no note of its own, and always as a tooltip on hover. The keys themselves
  are fixed names: they are the contract of the skill set and must stay as they are in the log.
- **A sticky header** above the timeline always shows the run and stage that what is on screen
  belongs to: a piece of the timeline alone does not answer "which stage is this".
- **Day separators** between rows of different days — otherwise crossing midnight with "newest on top"
  reads as a step back in time.
- **A command is shown shortened**: without the `docker compose exec … -T app` wrapper, without the
  `2>&1 | grep …` tail, with module paths instead of `modules/…/tests`. The full line is in the tooltip
  on hover, the runner's numbers on a second line under the command. To the left of the command is
  the name of the step it happened in (`report › artisan test …`).
- **Shares** are counted for stages, rounds and steps, but not for commands: eight minutes of tests
  out of a thirteen-hour round is 1%, the number is just noise.
- `●` — the row is open, time is running. `waiting` — a step that waits for a person (dialogue, plan
  approval). `⚑` — a note: why the run is stopped.
- Work run by slash commands, without `/forge:auto`, is gathered into an "Outside a run" block.

## Long commands

Test and gate runs are the longest parts of a run, and before, their time stuck to the step that was
marked last ("the report took 28 minutes", of which 16 were tests). Now they show as their own rows,
indented under the step they happened in:

```
15:19:01  8m  ████  20%    $ php artisan test modules/Starbuilding/Projects/tests  Tests: 2546 passed · Duration: 486.21s
15:37:01  2m  ██     6%    $ php artisan test --filter=ClearAssigneesForProfileTest  Tests: 12 passed
```

The command shows the scope — the whole module or `--filter` — and the runner's numbers show how many
tests really ran. The `PreToolUse`/`PostToolUse` hooks on `Bash` write this through
`../bin/forge-command`; the threshold is two minutes (`FORGE_CMD_MIN_SECONDS`), otherwise the log would
drown in `git status`. There is no list of single tests here: the runner prints them in thousands of
lines.

The rows are written per project (`run/commands.tsv`), because the hook knows the folder but not the
task key, and the page mixes them in by time. If two forge runs go on in one project at the same time,
a command may be attached to the wrong one — a rare case, but it is wrong silently.

## If the page is empty

- "cannot read `projects.tsv`" — monitoring is not set up: run `bin/forge-monitor` with paths.
- "no tasks yet" — the files are read, but there are no events: no checkpoint has passed in these
  projects yet, or their `.forge/config.yml` has `defaults.progress: off`.
- There is a task, but the timeline is empty — there are no events either in
  `tasks/<folder>/progress.tsv` or in `run/<KEY>.tsv`.

Check by hand: `curl -s http://127.0.0.1:8903/forge/<project>/run/index.tsv | tail`.

## Caveats

- `.forge` is mounted **read-only**: the page writes nothing.
- The progress log does not go into commits — `.forge/.gitignore` covers it, and `forge-progress`
  itself keeps these lines there. So the history is per machine: comparing the wall clock of
  different machines makes no sense.
