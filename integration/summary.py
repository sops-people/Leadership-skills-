"""Writes the hand-off results as a table on the run's Summary page. Fails if any check failed."""
import json
import os
import sys

OUT = os.environ["OUT_DIR"]
path = os.path.join(OUT, "results.jsonl")
results = []
if os.path.exists(path):
    with open(path) as f:
        results = [json.loads(line) for line in f if line.strip()]


def cell(text):
    return str(text).replace("|", "\\|").replace("\n", " ")[:300]


lines = ["## Hand-offs between the three parts", "", "| Result | Check | Detail |", "| --- | --- | --- |"]
lines += ["| %s | %s | %s |" % ("PASS" if r["passed"] else "FAIL", cell(r["check"]), cell(r["detail"])) for r in results]
if not results:
    lines.append("| FAIL | No results were recorded | An earlier step crashed; see its log |")
failed = sum(1 for r in results if not r["passed"]) or (0 if results else 1)
lines += ["", "%d of %d checks passed." % (len(results) - failed, len(results)) if results else ""]

text = "\n".join(lines) + "\n"
print(text)
summary = os.environ.get("GITHUB_STEP_SUMMARY")
if summary:
    with open(summary, "a") as f:
        f.write(text)
sys.exit(1 if failed else 0)
