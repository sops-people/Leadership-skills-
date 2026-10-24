# Leadership Skills

An app that helps leaders find their skill gaps and blind spots, then gives them a learning path to close them. See [PRD.md](PRD.md).

## What's here

| Part | Owner | Status |
|---|---|---|
| Assessment, 360 and gap report | Darko | Not started. `data/sample_gap_report.json` stands in for now |
| Learning path and content (`learning/`) | Sops | First working version |
| Platform and experience | Maria | Not started |

Shared formats between the parts are in [docs/formats.md](docs/formats.md).

## Run the learning path

You need Python 3.9 or newer and nothing else.

```
python3 -m learning.server
```

Open http://localhost:8000. The first load searches for content and takes about a minute. After that, results are cached in `data/cache/`.

Run the tests:

```
python3 -m unittest discover tests
```

## How the learning path works

1. **Input:** a gap report and the skill taxonomy.
2. **Search:** for each skill with a gap or blind spot, it searches Open Library (books), Crossref (research articles) and Wikipedia (primers). YouTube videos are included if you set `YOUTUBE_API_KEY`.
3. **Check:** it keeps only links that work.
4. **Rank:** it ranks items by relevance to the skill, workplace context, source quality, recency, length and format. It drops off-topic and duplicate items, and keeps at most 2 items from each source.
5. **Order:** the path starts with the highest-priority gaps.
6. **Track:** the user marks progress per skill and per item, and votes "Useful? Yes / No". The votes change the ranking.
7. **Re-assess:** 90 days after the assessment, it shows a re-assessment banner and queues one email request.

## Open questions

- **Content sources:** the free sources work but have gaps. There are no courses, and videos need an API key. We still need to decide on paid catalogues, their costs and whether their terms allow recommendations.
- **Rate limits:** the free APIs block bursts of requests, so the app searches one skill at a time.
